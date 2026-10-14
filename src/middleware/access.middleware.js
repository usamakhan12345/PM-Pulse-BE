const accessService = require('../services/access.service');
const Comment = require('../models/Comment.model');
const Attachment = require('../models/Attachment.model');
const Task = require('../models/Task.model');
const ApiError = require('../utils/apiError');

const wrap = (fn) => async (req, res, next) => {
  try {
    await fn(req);
    next();
  } catch (err) {
    next(err);
  }
};

// The caller must be able to see the project named in the URL (param) or in the request body.
// With ownerOnly, they must also own the workspace (or be the platform admin).
// On success: req.project is the project and req.access is { canView, isOwner }.
const projectAccess = (param = 'id', { ownerOnly = false } = {}) =>
  wrap(async (req) => {
    const { project, access } = await accessService.requireProject(req.user, req.params[param], { ownerOnly });
    req.project = project;
    req.access = access;
  });

const bodyProjectAccess = () =>
  wrap(async (req) => {
    if (!req.body.projectId) throw ApiError.badRequest('Project ID is required');
    const { project, access } = await accessService.requireProject(req.user, req.body.projectId);
    req.project = project;
    req.access = access;
  });

const taskAccess = (param = 'id') =>
  wrap(async (req) => {
    const { task, project, access } = await accessService.requireTask(req.user, req.params[param]);
    req.task = task;
    req.project = project;
    req.access = access;
  });

// Comments and attachments belong to a task, so access follows the task's project.
const commentAccess = () =>
  wrap(async (req) => {
    const comment = await Comment.findById(req.params.id);
    if (!comment) throw ApiError.notFound('Comment not found');
    const { project, access } = await accessService.requireProject(req.user, comment.projectId);
    req.project = project;
    req.access = access;
  });

const attachmentAccess = () =>
  wrap(async (req) => {
    const attachment = await Attachment.findById(req.params.id);
    if (!attachment) throw ApiError.notFound('Attachment not found');
    const task = await Task.findById(attachment.taskId);
    if (!task) throw ApiError.notFound('Task not found');
    const { project, access } = await accessService.requireProject(req.user, task.projectId);
    req.project = project;
    req.access = access;
  });

module.exports = { projectAccess, bodyProjectAccess, taskAccess, commentAccess, attachmentAccess };
