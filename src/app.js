const express = require('express');
const cors = require('cors');
const path = require('path');
const env = require('./config/env');
const errorHandler = require('./middleware/error.middleware');

// Routes imports
const authRoutes = require('./routes/auth.routes');
const workspaceRoutes = require('./routes/workspace.routes');
const projectRoutes = require('./routes/project.routes');
const taskRoutes = require('./routes/task.routes');
const commentRoutes = require('./routes/comment.routes');
const attachmentRoutes = require('./routes/attachment.routes');
const activityRoutes = require('./routes/activity.routes');
const notificationRoutes = require('./routes/notification.routes');
const messageRoutes = require('./routes/message.routes');
const userRoutes = require('./routes/user.routes');
const invitationRoutes = require('./routes/invitation.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();

// Enable CORS
app.use(
  cors({
    origin: [env.CLIENT_URL, 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve file uploads statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'API Service Operational', timestamp: new Date() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/attachments', attachmentRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global Error Middleware
app.use(errorHandler);

module.exports = app;
