const messageService = require('../services/message.service');
const ApiResponse = require('../utils/apiResponse');

class MessageController {
  async sendMessage(req, res, next) {
    try {
      const message = await messageService.sendMessage(req.user, req.body);

      const io = req.app.get('socketio');
      if (io) {
        io.to(`project_${req.body.projectId}`).emit('chat:message', message);
      }

      return ApiResponse.created(res, { message }, 'Message sent successfully');
    } catch (error) {
      next(error);
    }
  }

  async getProjectMessages(req, res, next) {
    try {
      const { projectId } = req.params;
      const { limit, before } = req.query;
      const messages = await messageService.getProjectMessages(req.user, projectId, limit, before);
      return ApiResponse.success(res, { messages }, 'Project messages retrieved');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MessageController();
