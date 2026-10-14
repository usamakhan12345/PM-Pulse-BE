const Workspace = require('../models/Workspace.model');
const WorkspaceMember = require('../models/WorkspaceMember.model');
const User = require('../models/User.model');
const ApiError = require('../utils/apiError');

class WorkspaceService {
  async createWorkspace(userId, { name, description }) {
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`;
    
    const workspace = await Workspace.create({
      name,
      slug,
      description,
      ownerId: userId
    });

    await WorkspaceMember.create({
      user: userId,
      workspace: workspace._id,
      role: 'ADMIN',
      status: 'ACTIVE'
    });

    return workspace;
  }

  async getUserWorkspaces(userId) {
    const memberships = await WorkspaceMember.find({ user: userId, status: 'ACTIVE' })
      .populate('workspace')
      .sort({ createdAt: -1 });

    return memberships.map((m) => ({
      ...m.workspace.toObject(),
      memberRole: m.role,
      joinedAt: m.joinedAt
    }));
  }

  async getWorkspaceById(workspaceId, userId) {
    const workspace = await Workspace.findById(workspaceId).populate('ownerId', 'name email avatar role');
    if (!workspace) {
      throw ApiError.notFound('Workspace not found');
    }

    const membership = await WorkspaceMember.findOne({ workspace: workspaceId, user: userId });
    if (!membership && userId) {
      // Check if system admin
      const user = await User.findById(userId);
      if (user.role !== 'ADMIN') {
        throw ApiError.forbidden('Access denied to this workspace');
      }
    }

    const members = await WorkspaceMember.find({ workspace: workspaceId })
      .populate('user', 'name email avatar role')
      .sort({ createdAt: 1 });

    return {
      ...workspace.toObject(),
      members,
      currentUserRole: membership ? membership.role : 'ADMIN'
    };
  }

  async updateWorkspace(workspaceId, updateData) {
    const workspace = await Workspace.findByIdAndUpdate(workspaceId, updateData, { new: true });
    if (!workspace) {
      throw ApiError.notFound('Workspace not found');
    }
    return workspace;
  }

  async deleteWorkspace(workspaceId) {
    const workspace = await Workspace.findByIdAndDelete(workspaceId);
    if (!workspace) {
      throw ApiError.notFound('Workspace not found');
    }
    await WorkspaceMember.deleteMany({ workspace: workspaceId });
    return { message: 'Workspace deleted successfully' };
  }

  async addMember(workspaceId, { userId, role }) {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User to add not found');
    }

    const existingMember = await WorkspaceMember.findOne({ workspace: workspaceId, user: userId });
    if (existingMember) {
      if (existingMember.status === 'INACTIVE') {
        existingMember.status = 'ACTIVE';
        existingMember.role = role || existingMember.role;
        await existingMember.save();
        return existingMember;
      }
      throw ApiError.badRequest('User is already a member of this workspace');
    }

    const member = await WorkspaceMember.create({
      workspace: workspaceId,
      user: userId,
      role: role || 'EMPLOYEE',
      status: 'ACTIVE'
    });

    return await member.populate('user', 'name email avatar role');
  }

  async removeMember(workspaceId, memberUserId) {
    const member = await WorkspaceMember.findOneAndDelete({
      workspace: workspaceId,
      user: memberUserId
    });
    if (!member) {
      throw ApiError.notFound('Workspace member not found');
    }
    return { message: 'Member removed from workspace' };
  }
}

module.exports = new WorkspaceService();
