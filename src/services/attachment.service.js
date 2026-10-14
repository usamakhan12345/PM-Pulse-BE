const Attachment = require('../models/Attachment.model');
const Task = require('../models/Task.model');
const ApiError = require('../utils/apiError');
const activityService = require('./activity.service');

class AttachmentService {
  async addAttachment(taskId, userId, file) {
    const task = await Task.findById(taskId);
    if (!task) {
      throw ApiError.notFound('Task not found');
    }

    const fileUrl = `/uploads/${file.filename}`;

    const attachment = await Attachment.create({
      fileName: file.originalname,
      fileUrl,
      fileType: file.mimetype,
      fileSize: file.size,
      uploadedBy: userId,
      taskId
    });

    await activityService.logActivity({
      workspaceId: task.workspaceId,
      projectId: task.projectId,
      taskId,
      userId,
      action: 'UPLOADED_ATTACHMENT',
      metadata: { fileName: file.originalname, taskTitle: task.title }
    });

    return await attachment.populate('uploadedBy', 'name email avatar');
  }

  async getTaskAttachments(taskId) {
    return await Attachment.find({ taskId })
      .populate('uploadedBy', 'name email avatar')
      .sort({ createdAt: -1 });
  }

  async deleteAttachment(attachmentId, userId, isWorkspaceOwner) {
    const attachment = await Attachment.findById(attachmentId);
    if (!attachment) {
      throw ApiError.notFound('Attachment not found');
    }

    if (attachment.uploadedBy.toString() !== userId.toString() && !isWorkspaceOwner) {
      throw ApiError.forbidden('Not authorized to delete this attachment');
    }

    await attachment.deleteOne();
    return { message: 'Attachment deleted' };
  }
}

module.exports = new AttachmentService();
