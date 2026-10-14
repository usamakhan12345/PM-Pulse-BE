const Message = require('../models/Message.model');
const accessService = require('./access.service');

class MessageService {
  async sendMessage(user, { projectId, content }) {
    // Only people on the project can write in its chat
    const { project } = await accessService.requireProject(user, projectId);

    const message = await Message.create({
      projectId,
      workspaceId: project.workspaceId,
      senderId: user._id,
      content
    });

    return await message.populate('senderId', 'name email avatar');
  }

  async getProjectMessages(user, projectId, limit = 50, before) {
    await accessService.requireProject(user, projectId);
    const query = { projectId };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .populate('senderId', 'name email avatar')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10));

    return messages.reverse();
  }
}

module.exports = new MessageService();
