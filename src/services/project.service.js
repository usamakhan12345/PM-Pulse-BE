const Project = require('../models/Project.model');
const Task = require('../models/Task.model');
const Comment = require('../models/Comment.model');
const Attachment = require('../models/Attachment.model');
const Message = require('../models/Message.model');
const WorkspaceMember = require('../models/WorkspaceMember.model');
const ApiError = require('../utils/apiError');
const activityService = require('./activity.service');
const accessService = require('./access.service');
const notificationService = require('./notification.service');

const POPULATE_PROJECT = [
  { path: 'ownerId', select: 'name email avatar' },
  { path: 'members', select: 'name email avatar' }
];

const emptyStats = () => ({ TODO: 0, IN_PROGRESS: 0, IN_REVIEW: 0, DONE: 0, BLOCKED: 0, total: 0 });

class ProjectService {
  // Only people who belong to the workspace can be put on one of its projects.
  // This is what keeps other customers out: there is no way to add someone from outside.
  async assertWorkspaceMembers(workspaceId, userIds) {
    const ids = [...new Set(userIds.map(String))];
    if (ids.length === 0) return;
    const found = await WorkspaceMember.countDocuments({ workspace: workspaceId, user: { $in: ids }, status: 'ACTIVE' });
    if (found !== ids.length) {
      throw ApiError.badRequest('Everyone on a project must be a member of its workspace. Invite them to the workspace first.');
    }
  }

  async notifyAdded(recipientId, senderId, project) {
    try {
      await notificationService.createNotification({
        recipientId,
        senderId,
        title: 'Added to a project',
        message: `You were added to the project "${project.name}"`,
        type: 'PROJECT_ADDED',
        link: `/dashboard/projects/${project._id}`
      });
    } catch (err) {
      console.error('[Notification Error]', err.message);
    }
  }

  async createProject(user, { name, description, workspaceId, startDate, dueDate, status, members, isPrivate }) {
    const projectMembers = [...new Set([...(members || []).map(String), String(user._id)])];
    await this.assertWorkspaceMembers(workspaceId, projectMembers);

    const project = await Project.create({
      name,
      description,
      workspaceId,
      ownerId: user._id,
      status: status || 'ACTIVE',
      isPrivate: !!isPrivate,
      startDate: startDate || null,
      dueDate: dueDate || null,
      members: projectMembers
    });

    await activityService.logActivity({
      workspaceId,
      projectId: project._id,
      userId: user._id,
      action: 'CREATED_PROJECT',
      metadata: { projectName: project.name }
    });

    // Let the people who were picked know about their new project
    await Promise.all(
      projectMembers
        .filter((id) => id !== String(user._id))
        .map((id) => this.notifyAdded(id, user._id, project))
    );

    return await project.populate(POPULATE_PROJECT);
  }

  async getProjects({ workspaceId, user, search, status, page = 1, limit = 10 }) {
    const query = {};
    if (workspaceId) {
      query.workspaceId = workspaceId;
    }
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    if (status) {
      query.status = status;
    }

    // Everyone except the platform admin only gets projects they are allowed to see
    const allowedIds = await accessService.accessibleProjectIds(user, workspaceId);
    if (allowedIds) {
      query._id = { $in: allowedIds };
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const total = await Project.countDocuments(query);
    const projects = await Project.find(query)
      .populate('ownerId', 'name email avatar')
      .populate('members', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Task counts per status, so list cards can show progress
    const stats = await Task.aggregate([
      { $match: { projectId: { $in: projects.map((p) => p._id) } } },
      { $group: { _id: { projectId: '$projectId', status: '$status' }, count: { $sum: 1 } } }
    ]);
    const statsByProject = new Map();
    stats.forEach((s) => {
      const key = s._id.projectId.toString();
      const entry = statsByProject.get(key) || emptyStats();
      entry[s._id.status] = s.count;
      entry.total += s.count;
      statsByProject.set(key, entry);
    });
    const projectsWithStats = projects.map((p) => ({
      ...p.toObject(),
      taskStats: statsByProject.get(p._id.toString()) || emptyStats()
    }));

    return {
      projects: projectsWithStats,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    };
  }

  async getProjectById(projectId) {
    const project = await Project.findById(projectId)
      .populate('ownerId', 'name email avatar')
      .populate('members', 'name email avatar');

    if (!project) {
      throw ApiError.notFound('Project not found');
    }

    const taskStats = await Task.aggregate([
      { $match: { projectId: project._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const statsMap = emptyStats();
    taskStats.forEach((s) => {
      statsMap[s._id] = s.count;
      statsMap.total += s.count;
    });

    return {
      ...project.toObject(),
      taskStats: statsMap
    };
  }

  async updateProject(projectId, userId, updateData) {
    const project = await Project.findById(projectId);
    if (!project) {
      throw ApiError.notFound('Project not found');
    }

    if (updateData.members) {
      await this.assertWorkspaceMembers(project.workspaceId, updateData.members);
    }

    Object.assign(project, updateData);
    await project.save();

    await activityService.logActivity({
      workspaceId: project.workspaceId,
      projectId: project._id,
      userId,
      action: 'UPDATED_PROJECT',
      metadata: { projectName: project.name }
    });

    return await project.populate(POPULATE_PROJECT);
  }

  async deleteProject(projectId, userId) {
    const project = await Project.findByIdAndDelete(projectId);
    if (!project) {
      throw ApiError.notFound('Project not found');
    }

    const taskIds = (await Task.find({ projectId }).select('_id')).map((t) => t._id);
    await Promise.all([
      Comment.deleteMany({ taskId: { $in: taskIds } }),
      Attachment.deleteMany({ taskId: { $in: taskIds } }),
      Task.deleteMany({ projectId }),
      Message.deleteMany({ projectId })
    ]);

    await activityService.logActivity({
      workspaceId: project.workspaceId,
      projectId,
      userId,
      action: 'DELETED_PROJECT',
      metadata: { projectName: project.name }
    });

    return { message: 'Project deleted successfully' };
  }

  async addProjectMember(projectId, memberUserId, userId) {
    const project = await Project.findById(projectId);
    if (!project) {
      throw ApiError.notFound('Project not found');
    }

    await this.assertWorkspaceMembers(project.workspaceId, [memberUserId]);

    if (!project.members.some((m) => String(m) === String(memberUserId))) {
      project.members.push(memberUserId);
      await project.save();
    }

    await activityService.logActivity({
      workspaceId: project.workspaceId,
      projectId: project._id,
      userId,
      action: 'ADDED_PROJECT_MEMBER',
      metadata: { addedUserId: memberUserId }
    });
    await this.notifyAdded(memberUserId, userId, project);

    return await project.populate('members', 'name email avatar');
  }

  async removeProjectMember(projectId, memberUserId, userId) {
    const project = await Project.findById(projectId);
    if (!project) {
      throw ApiError.notFound('Project not found');
    }

    project.members = project.members.filter((m) => String(m) !== String(memberUserId));
    await project.save();

    // Tasks they were working on go back to unassigned
    await Task.updateMany({ projectId, assignedTo: memberUserId }, { $set: { assignedTo: null, assignedBy: null } });

    await activityService.logActivity({
      workspaceId: project.workspaceId,
      projectId: project._id,
      userId,
      action: 'REMOVED_PROJECT_MEMBER',
      metadata: { removedUserId: memberUserId }
    });

    return await project.populate('members', 'name email avatar');
  }
}

module.exports = new ProjectService();
