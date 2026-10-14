const EVENTS = require('./events');
const messageService = require('../services/message.service');
const { verifyToken } = require('../utils/jwt');
const User = require('../models/User.model');
const accessService = require('../services/access.service');

const onlineUsers = new Map(); // socketId -> { userId, userName }

const initSockets = (io) => {
  // Socket auth middleware
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }
    try {
      const decoded = verifyToken(token);
      const userDoc = await User.findById(decoded.id).select('-password');
      if (!userDoc) {
        return next(new Error('Authentication error: User no longer exists'));
      }
      socket.user = decoded;
      socket.userDoc = userDoc;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    socket.join(`user_${userId}`);

    // Join project room
    socket.on(EVENTS.JOIN_PROJECT, async ({ projectId, userName }) => {
      try {
        await accessService.requireProject(socket.userDoc, projectId);
      } catch (err) {
        socket.emit('error', { message: 'You do not have access to this project' });
        return;
      }
      socket.join(`project_${projectId}`);
      onlineUsers.set(socket.id, { userId, userName, projectId });

      // Notify project room of online status change
      const projectUsers = Array.from(onlineUsers.values()).filter((u) => u.projectId === projectId);
      io.to(`project_${projectId}`).emit(EVENTS.ONLINE_USERS, projectUsers);
    });

    socket.on(EVENTS.LEAVE_PROJECT, ({ projectId }) => {
      socket.leave(`project_${projectId}`);
      onlineUsers.delete(socket.id);

      const projectUsers = Array.from(onlineUsers.values()).filter((u) => u.projectId === projectId);
      io.to(`project_${projectId}`).emit(EVENTS.ONLINE_USERS, projectUsers);
    });

    // Chat events
    socket.on(EVENTS.SEND_MESSAGE, async (data) => {
      try {
        const message = await messageService.sendMessage(socket.userDoc, data);
        io.to(`project_${data.projectId}`).emit(EVENTS.NEW_MESSAGE, message);
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // Typing indicators
    socket.on(EVENTS.TYPING_START, ({ projectId, userName }) => {
      if (!socket.rooms.has(`project_${projectId}`)) return;
      socket.to(`project_${projectId}`).emit(EVENTS.USER_TYPING, { userId, userName, isTyping: true });
    });

    socket.on(EVENTS.TYPING_STOP, ({ projectId, userName }) => {
      if (!socket.rooms.has(`project_${projectId}`)) return;
      socket.to(`project_${projectId}`).emit(EVENTS.USER_TYPING, { userId, userName, isTyping: false });
    });

    // Disconnect
    socket.on('disconnect', () => {
      const info = onlineUsers.get(socket.id);
      if (info && info.projectId) {
        onlineUsers.delete(socket.id);
        const projectUsers = Array.from(onlineUsers.values()).filter((u) => u.projectId === info.projectId);
        io.to(`project_${info.projectId}`).emit(EVENTS.ONLINE_USERS, projectUsers);
      } else {
        onlineUsers.delete(socket.id);
      }
    });
  });
};

module.exports = initSockets;
