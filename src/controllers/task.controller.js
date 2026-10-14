const taskService = require('../services/task.service');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');

class TaskController {
  async createTask(req, res, next) {
    try {
      const task = await taskService.createTask(req.user._id, req.body, req.project);

      // Emit socket event if io instance attached
      const io = req.app.get('socketio');
      if (io) {
        io.to(`project_${task.projectId._id || task.projectId}`).emit('task:created', task);
      }

      return ApiResponse.created(res, { task }, 'Task created successfully');
    } catch (error) {
      next(error);
    }
  }

  async getTasks(req, res, next) {
    try {
      const { workspaceId, projectId, search, status, priority, assignedTo, page, limit, sortBy, sortOrder } = req.query;
      const { tasks, pagination } = await taskService.getTasks({
        workspaceId,
        projectId,
        search,
        status,
        priority,
        assignedTo,
        page,
        limit,
        sortBy,
        sortOrder,
        user: req.user
      });
      return ApiResponse.success(res, { tasks }, 'Tasks retrieved', 200, pagination);
    } catch (error) {
      next(error);
    }
  }

  async getTaskById(req, res, next) {
    try {
      const task = await taskService.getTaskById(req.params.id);
      return ApiResponse.success(res, { task }, 'Task retrieved');
    } catch (error) {
      next(error);
    }
  }

  async updateTask(req, res, next) {
    try {
      const task = await taskService.updateTask(req.params.id, req.user._id, req.body);

      const io = req.app.get('socketio');
      if (io) {
        io.to(`project_${task.projectId._id || task.projectId}`).emit('task:updated', task);
      }

      return ApiResponse.success(res, { task }, 'Task updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteTask(req, res, next) {
    try {
      // Owners can delete any task; everyone else only the tasks they created
      const isCreator = String(req.task.createdBy) === String(req.user._id);
      if (!req.access.isOwner && !isCreator) {
        throw ApiError.forbidden('Only the workspace owner or the task creator can delete this task');
      }
      const result = await taskService.deleteTask(req.params.id, req.user._id);

      const io = req.app.get('socketio');
      if (io) {
        io.to(`project_${req.task.projectId}`).emit('task:deleted', { taskId: req.params.id });
      }

      return ApiResponse.success(res, result, 'Task deleted');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TaskController();
