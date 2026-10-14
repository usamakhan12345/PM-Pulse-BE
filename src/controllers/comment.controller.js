const commentService = require('../services/comment.service');
const ApiResponse = require('../utils/apiResponse');

class CommentController {
  async addComment(req, res, next) {
    try {
      const comment = await commentService.addComment(req.params.taskId, req.user._id, req.body);

      const io = req.app.get('socketio');
      if (io) {
        io.to(`project_${comment.projectId}`).emit('comment:added', comment);
      }

      return ApiResponse.created(res, { comment }, 'Comment added successfully');
    } catch (error) {
      next(error);
    }
  }

  async getTaskComments(req, res, next) {
    try {
      const comments = await commentService.getTaskComments(req.params.taskId);
      return ApiResponse.success(res, { comments }, 'Comments retrieved');
    } catch (error) {
      next(error);
    }
  }

  async updateComment(req, res, next) {
    try {
      const comment = await commentService.updateComment(req.params.id, req.user._id, req.body);
      return ApiResponse.success(res, { comment }, 'Comment updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteComment(req, res, next) {
    try {
      const result = await commentService.deleteComment(req.params.id, req.user._id, req.user.role);
      return ApiResponse.success(res, result, 'Comment deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CommentController();
