module.exports = {
  // Connection / Rooms
  JOIN_PROJECT: 'project:join',
  LEAVE_PROJECT: 'project:leave',
  JOIN_USER: 'user:join',
  
  // Chat
  SEND_MESSAGE: 'chat:message:send',
  NEW_MESSAGE: 'chat:message',
  TYPING_START: 'chat:typing:start',
  TYPING_STOP: 'chat:typing:stop',
  USER_TYPING: 'chat:typing',

  // Real-Time Tasks
  TASK_CREATED: 'task:created',
  TASK_UPDATED: 'task:updated',
  TASK_DELETED: 'task:deleted',

  // Notifications
  NEW_NOTIFICATION: 'notification:new',

  // Presence
  ONLINE_USERS: 'presence:online'
};
