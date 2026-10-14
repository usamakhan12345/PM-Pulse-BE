const Comment = require('../models/Comment.model');
const Task = require('../models/Task.model');
const ApiError = require('../utils/apiError');
const activityService = require('./activity.service');
const notificationService = require('./notification.service');

class CommentService {
  async addComment(taskId, userId, { content }) {
    const task = await Task.findById(taskId);
    if (!task) {
      throw ApiError.notFound('Task not found');
    }

    const comment = await Comment.create({
      taskId,
      projectId: task.projectId,
      userId,
      content
    });

    await activityService.logActivity({
      workspaceId: task.workspaceId,
      projectId: task.projectId,
      taskId,
      userId,
      action: 'ADDED_COMMENT',
      metadata: { taskTitle: task.title }
    });

    // Notify task assignee if someone else comments
    if (task.assignedTo && task.assignedTo.toString() !== userId.toString()) {
      await notificationService.createNotification({
        recipientId: task.assignedTo,
        senderId: userId,
        title: 'New Comment',
        message: `New comment on task "${task.title}": "${content.slice(0, 40)}..."`,
        type: 'TASK_COMMENT',
        link: `/dashboard/projects/${task.projectId}`
      });
    }

    return await comment.populate('userId', 'name email avatar role');
  }

  async getTaskComments(taskId) {
    return await Comment.find({ taskId })
      .populate('userId', 'name email avatar role')
      .sort({ createdAt: 1 });
  }

  async updateComment(commentId, userId, { content }) {
    const comment = await Comment.findById(commentId);
    if (!comment) {
      throw ApiError.notFound('Comment not found');
    }

    if (comment.userId.toString() !== userId.toString()) {
      throw ApiError.forbidden('You can only edit your own comments');
    }

    comment.content = content;
    await comment.save();

    return await comment.populate('userId', 'name email avatar role');
  }

  async deleteComment(commentId, userId, userRole) {
    const comment = await Comment.findById(commentId);
    if (!comment) {
      throw ApiError.notFound('Comment not found');
    }

    if (comment.userId.toString() !== userId.toString() && !['ADMIN', 'MANAGER'].includes(userRole)) {
      throw ApiError.forbidden('Not authorized to delete this comment');
    }

    await comment.deleteOne();
    return { message: 'Comment deleted successfully' };
  }
}

module.exports = new CommentService();
