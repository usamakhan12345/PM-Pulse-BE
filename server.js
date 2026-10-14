const http = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');
const env = require('./src/config/env');
const connectDB = require('./src/config/db');
const initSockets = require('./src/sockets/socketHandler');

const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: [env.CLIENT_URL, 'http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Attach io to express app instance
app.set('socketio', io);

// Initialize socket listeners
initSockets(io);

// Connect Database & Start Server
const startServer = async () => {
  await connectDB();
  server.listen(env.PORT, () => {
    console.log(`===================================================`);
    console.log(` Jira + Slack SaaS Backend Server Running!`);
    console.log(` Environment: ${env.NODE_ENV}`);
    console.log(` HTTP Server: http://localhost:${env.PORT}`);
    console.log(` Socket.io Ready`);
    console.log(`===================================================`);
  });
};

startServer();

module.exports = { app, server };
