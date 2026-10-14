const attachmentService = require('../services/attachment.service');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');

class AttachmentController {
  async uploadAttachment(req, res, next) {
    try {
      if (!req.file) {
        throw ApiError.badRequest('No file uploaded');
      }
      const attachment = await attachmentService.addAttachment(req.params.taskId, req.user._id, req.file);
      return ApiResponse.created(res, { attachment }, 'File uploaded successfully');
    } catch (error) {
      next(error);
    }
  }

  async getTaskAttachments(req, res, next) {
    try {
      const attachments = await attachmentService.getTaskAttachments(req.params.taskId);
      return ApiResponse.success(res, { attachments }, 'Task attachments retrieved');
    } catch (error) {
      next(error);
    }
  }

  async deleteAttachment(req, res, next) {
    try {
      const result = await attachmentService.deleteAttachment(req.params.id, req.user._id, req.access.isOwner);
      return ApiResponse.success(res, result, 'Attachment deleted');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AttachmentController();
