const Task = require('../models/Task.model');
const Project = require('../models/Project.model');
const WorkspaceMember = require('../models/WorkspaceMember.model');
const Comment = require('../models/Comment.model');
const Attachment = require('../models/Attachment.model');
const ApiError = require('../utils/apiError');
const activityService = require('./activity.service');
const notificationService = require('./notification.service');
const accessService = require('./access.service');

class TaskService {
  // A task can go to anyone on the project team. On an open project it can also go to any
  // other member of the workspace; on a private project only the team is allowed.
  async assertAssignable(project, assigneeId) {
    if (!assigneeId) return;
    const onProject = [project.ownerId, ...(project.members || [])].some((id) => String(id) === String(assigneeId));
    if (onProject) return;
    if (!project.isPrivate) {
      const inWorkspace = await WorkspaceMember.exists({ workspace: project.workspaceId, user: assigneeId, status: 'ACTIVE' });
      if (inWorkspace) return;
    }
    throw ApiError.badRequest('You can only assign a task to someone who can work on this project');
  }

  async createTask(userId, data, project) {
    await this.assertAssignable(project, data.assignedTo);
    // The workspace always comes from the project, never from the request
    data.workspaceId = project.workspaceId;

    const task = await Task.create({
      title: data.title,
      description: data.description || '',
      projectId: data.projectId,
      workspaceId: data.workspaceId,
      assignedTo: data.assignedTo || null,
      assignedBy: data.assignedTo ? userId : null,
      completedAt: data.status === 'DONE' ? new Date() : null,
      createdBy: userId,
      priority: data.priority || 'MEDIUM',
      status: data.status || 'TODO',
      dueDate: data.dueDate || null,
      labels: data.labels || []
    });

    await activityService.logActivity({
      workspaceId: data.workspaceId,
      projectId: data.projectId,
      taskId: task._id,
      userId,
      action: 'CREATED_TASK',
      metadata: { taskTitle: task.title }
    });

    if (data.assignedTo) {
      await notificationService.createNotification({
        recipientId: data.assignedTo,
        senderId: userId,
        title: 'Task Assigned',
        message: `You were assigned task "${task.title}"`,
        type: 'TASK_ASSIGNED',
        link: `/dashboard/projects/${data.projectId}`
      });
    }

    return await task.populate([
      { path: 'assignedTo', select: 'name email avatar' },
      { path: 'createdBy', select: 'name email avatar' },
      { path: 'projectId', select: 'name' }
    ]);
  }

  async getTasks({ workspaceId, projectId, search, status, priority, assignedTo, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', user }) {
    const query = {};

    if (workspaceId) query.workspaceId = workspaceId;
    if (projectId) query.projectId = projectId;
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;

    // People only see tasks of projects they can access
    if (user) {
      const allowed = await accessService.accessibleProjectIds(user, workspaceId);
      if (allowed) {
        if (projectId) {
          if (!allowed.map(String).includes(String(projectId))) query.projectId = { $in: [] };
        } else {
          query.projectId = { $in: allowed };
        }
      }
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const total = await Task.countDocuments(query);
    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('projectId', 'name')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    return {
      tasks,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    };
  }

  async getTaskById(taskId) {
    const task = await Task.findById(taskId)
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('projectId', 'name description status');

    if (!task) {
      throw ApiError.notFound('Task not found');
    }

    const comments = await Comment.find({ taskId })
      .populate('userId', 'name email avatar role')
      .sort({ createdAt: 1 });

    const attachments = await Attachment.find({ taskId })
      .populate('uploadedBy', 'name email avatar')
      .sort({ createdAt: -1 });

    return {
      ...task.toObject(),
      comments,
      attachments
    };
  }

  async updateTask(taskId, userId, updateData) {
    const task = await Task.findById(taskId);
    if (!task) {
      throw ApiError.notFound('Task not found');
    }

    if (updateData.assignedTo) {
      const project = await Project.findById(task.projectId);
      await this.assertAssignable(project, updateData.assignedTo);
    }

    const oldStatus = task.status;
    const oldAssignedTo = task.assignedTo ? task.assignedTo.toString() : null;

    Object.assign(task, updateData);

    // Track when a task is completed and who assigned it
    if (updateData.status && updateData.status !== oldStatus) {
      task.completedAt = updateData.status === 'DONE' ? new Date() : null;
    }
    if ('assignedTo' in updateData) {
      const newAssignedTo = updateData.assignedTo ? String(updateData.assignedTo) : null;
      if (newAssignedTo !== oldAssignedTo) {
        task.assignedBy = newAssignedTo ? userId : null;
      }
    }

    await task.save();

    // Log & notify on status change
    if (updateData.status && updateData.status !== oldStatus) {
      await activityService.logActivity({
        workspaceId: task.workspaceId,
        projectId: task.projectId,
        taskId: task._id,
        userId,
        action: 'CHANGED_TASK_STATUS',
        metadata: {
          taskTitle: task.title,
          oldStatus,
          newStatus: updateData.status
        }
      });

      if (task.assignedTo && task.assignedTo.toString() !== userId.toString()) {
        await notificationService.createNotification({
          recipientId: task.assignedTo,
          senderId: userId,
          title: 'Task Status Updated',
          message: `Task "${task.title}" status changed: ${oldStatus} → ${updateData.status}`,
          type: 'TASK_STATUS_CHANGED',
          link: `/dashboard/projects/${task.projectId}`
        });
      }
    }

    // Log & notify on reassignment
    if (updateData.assignedTo && updateData.assignedTo !== oldAssignedTo) {
      await activityService.logActivity({
        workspaceId: task.workspaceId,
        projectId: task.projectId,
        taskId: task._id,
        userId,
        action: 'REASSIGNED_TASK',
        metadata: { taskTitle: task.title, assignedTo: updateData.assignedTo }
      });

      await notificationService.createNotification({
        recipientId: updateData.assignedTo,
        senderId: userId,
        title: 'Task Reassigned',
        message: `You were assigned task "${task.title}"`,
        type: 'TASK_ASSIGNED',
        link: `/dashboard/projects/${task.projectId}`
      });
    }

    return await task.populate([
      { path: 'assignedTo', select: 'name email avatar' },
      { path: 'createdBy', select: 'name email avatar' },
      { path: 'projectId', select: 'name' }
    ]);
  }

  async deleteTask(taskId, userId) {
    const task = await Task.findByIdAndDelete(taskId);
    if (!task) {
      throw ApiError.notFound('Task not found');
    }

    await Comment.deleteMany({ taskId });
    await Attachment.deleteMany({ taskId });

    await activityService.logActivity({
      workspaceId: task.workspaceId,
      projectId: task.projectId,
      taskId,
      userId,
      action: 'DELETED_TASK',
      metadata: { taskTitle: task.title }
    });

    return { message: 'Task deleted successfully' };
  }
}

module.exports = new TaskService();
