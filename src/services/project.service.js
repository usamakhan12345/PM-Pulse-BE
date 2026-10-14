const Project = require('../models/Project.model');
const Task = require('../models/Task.model');
const WorkspaceMember = require('../models/WorkspaceMember.model');
const User = require('../models/User.model');
const ApiError = require('../utils/apiError');
const activityService = require('./activity.service');

class ProjectService {
  async createProject(userId, { name, description, workspaceId, startDate, dueDate, status, members }) {
    const projectMembers = members && members.length > 0 ? members : [userId];
    if (!projectMembers.includes(userId.toString())) {
      projectMembers.push(userId.toString());
    }

    // Ensure all project members are registered in WorkspaceMember collection
    for (const memberId of projectMembers) {
      const existingMember = await WorkspaceMember.findOne({ user: memberId, workspace: workspaceId });
      if (!existingMember) {
        await WorkspaceMember.create({
          user: memberId,
          workspace: workspaceId,
          role: 'EMPLOYEE',
          status: 'ACTIVE'
        });
      }
    }

    const project = await Project.create({
      name,
      description,
      workspaceId,
      ownerId: userId,
      status: status || 'ACTIVE',
      startDate: startDate || null,
      dueDate: dueDate || null,
      members: projectMembers
    });

    await activityService.logActivity({
      workspaceId,
      projectId: project._id,
      userId,
      action: 'CREATED_PROJECT',
      metadata: { projectName: project.name }
    });

    return await project.populate([
      { path: 'ownerId', select: 'name email avatar' },
      { path: 'members', select: 'name email avatar role' }
    ]);
  }

  async getProjects({ workspaceId, userId, search, status, page = 1, limit = 10 }) {
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

    // Filter projects for non-admin users if specific member restrictions apply
    if (userId) {
      const user = await User.findById(userId);
      if (user && user.role !== 'ADMIN') {
        query.$or = [{ members: userId }, { ownerId: userId }];
      }
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const total = await Project.countDocuments(query);
    const projects = await Project.find(query)
      .populate('ownerId', 'name email avatar')
      .populate('members', 'name email avatar role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    return {
      projects,
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
      .populate('members', 'name email avatar role');

    if (!project) {
      throw ApiError.notFound('Project not found');
    }

    // Task statistics breakdown
    const taskStats = await Task.aggregate([
      { $match: { projectId: project._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const statsMap = {
      TODO: 0,
      IN_PROGRESS: 0,
      IN_REVIEW: 0,
      DONE: 0,
      BLOCKED: 0,
      total: 0
    };

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

    if (updateData.members && updateData.members.length > 0) {
      for (const memberId of updateData.members) {
        const existingMember = await WorkspaceMember.findOne({ user: memberId, workspace: project.workspaceId });
        if (!existingMember) {
          await WorkspaceMember.create({
            user: memberId,
            workspace: project.workspaceId,
            role: 'EMPLOYEE',
            status: 'ACTIVE'
          });
        }
      }
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

    return await project.populate([
      { path: 'ownerId', select: 'name email avatar' },
      { path: 'members', select: 'name email avatar role' }
    ]);
  }

  async deleteProject(projectId, userId) {
    const project = await Project.findByIdAndDelete(projectId);
    if (!project) {
      throw ApiError.notFound('Project not found');
    }

    // Clean up associated tasks
    await Task.deleteMany({ projectId });

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

    // Ensure user is member of workspace as well
    const existingWsMember = await WorkspaceMember.findOne({ user: memberUserId, workspace: project.workspaceId });
    if (!existingWsMember) {
      await WorkspaceMember.create({
        user: memberUserId,
        workspace: project.workspaceId,
        role: 'EMPLOYEE',
        status: 'ACTIVE'
      });
    }

    if (!project.members.includes(memberUserId)) {
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

    return await project.populate('members', 'name email avatar role');
  }

  async removeProjectMember(projectId, memberUserId, userId) {
    const project = await Project.findById(projectId);
    if (!project) {
      throw ApiError.notFound('Project not found');
    }

    project.members = project.members.filter((m) => m.toString() !== memberUserId);
    await project.save();

    await activityService.logActivity({
      workspaceId: project.workspaceId,
      projectId: project._id,
      userId,
      action: 'REMOVED_PROJECT_MEMBER',
      metadata: { removedUserId: memberUserId }
    });

    return await project.populate('members', 'name email avatar role');
  }
}

module.exports = new ProjectService();
