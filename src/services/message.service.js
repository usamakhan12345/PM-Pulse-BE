const Message = require('../models/Message.model');
const Project = require('../models/Project.model');
const ApiError = require('../utils/apiError');

class MessageService {
  async sendMessage(senderId, { projectId, workspaceId, content }) {
    const project = await Project.findById(projectId);
    if (!project) {
      throw ApiError.notFound('Project not found');
    }

    const message = await Message.create({
      projectId,
      workspaceId: workspaceId || project.workspaceId,
      senderId,
      content
    });

    return await message.populate('senderId', 'name email avatar role');
  }

  async getProjectMessages(projectId, limit = 50, before) {
    const query = { projectId };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .populate('senderId', 'name email avatar role')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10));

    return messages.reverse();
  }
}

module.exports = new MessageService();
