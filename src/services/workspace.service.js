const Workspace = require('../models/Workspace.model');
const WorkspaceMember = require('../models/WorkspaceMember.model');
const Project = require('../models/Project.model');
const Task = require('../models/Task.model');
const Comment = require('../models/Comment.model');
const Attachment = require('../models/Attachment.model');
const Message = require('../models/Message.model');
const Activity = require('../models/Activity.model');
const Invitation = require('../models/Invitation.model');
const ApiError = require('../utils/apiError');

const slugify = (text) => text.toLowerCase().replace(/[^a-z0-9]/g, '-');

class WorkspaceService {
  // Every person gets a workspace of their own, so they can start a project right after signing up.
  // Safe to call repeatedly: the slug is fixed per user, so a second call cannot create a duplicate.
  async ensureDefaultWorkspace(user) {
    const ownsOne = await WorkspaceMember.exists({ user: user._id, status: 'ACTIVE', role: 'OWNER' });
    if (ownsOne) return null;

    const slug = `${slugify(user.name)}-workspace-${String(user._id).slice(-6)}`;
    try {
      const workspace = await Workspace.create({
        name: `${user.name}'s Workspace`,
        slug,
        description: 'My workspace',
        ownerId: user._id
      });
      await WorkspaceMember.create({ user: user._id, workspace: workspace._id, role: 'OWNER', status: 'ACTIVE' });
      return workspace;
    } catch (err) {
      if (err.code !== 11000) throw err; // already created by a parallel request
      return null;
    }
  }

  async createWorkspace(userId, { name, description }) {
    const slug = `${slugify(name)}-${Date.now().toString().slice(-6)}`;

    const workspace = await Workspace.create({ name, slug, description, ownerId: userId });
    await WorkspaceMember.create({ user: userId, workspace: workspace._id, role: 'OWNER', status: 'ACTIVE' });
    return workspace;
  }

  async getUserWorkspaces(userId, userRole) {
    // The platform admin can see every workspace, to keep an eye on what is going on
    if (userRole === 'ADMIN') {
      const [allWorkspaces, memberships] = await Promise.all([
        Workspace.find().sort({ createdAt: -1 }),
        WorkspaceMember.find({ user: userId, status: 'ACTIVE' })
      ]);
      const byWorkspace = new Map(memberships.map((m) => [m.workspace.toString(), m]));

      return allWorkspaces.map((ws) => {
        const m = byWorkspace.get(ws._id.toString());
        return {
          ...ws.toObject(),
          memberRole: m ? m.role : undefined,
          joinedAt: m ? m.joinedAt : ws.createdAt
        };
      });
    }

    const memberships = await WorkspaceMember.find({ user: userId, status: 'ACTIVE' })
      .populate('workspace')
      .sort({ createdAt: -1 });

    return memberships
      .filter((m) => m.workspace)
      .map((m) => ({
        ...m.workspace.toObject(),
        memberRole: m.role,
        joinedAt: m.joinedAt
      }));
  }

  async getMembers(workspaceId) {
    return WorkspaceMember.find({ workspace: workspaceId, status: 'ACTIVE' })
      .populate('user', 'name email avatar')
      .sort({ createdAt: 1 });
  }

  async getWorkspaceById(workspaceId, user) {
    const workspace = await Workspace.findById(workspaceId).populate('ownerId', 'name email avatar');
    if (!workspace) {
      throw ApiError.notFound('Workspace not found');
    }

    const membership = await WorkspaceMember.findOne({ workspace: workspaceId, user: user._id, status: 'ACTIVE' });
    if (!membership && user.role !== 'ADMIN') {
      throw ApiError.forbidden('You are not a member of this workspace');
    }

    const members = await this.getMembers(workspaceId);

    return {
      ...workspace.toObject(),
      members,
      currentUserRole: membership ? membership.role : undefined
    };
  }

  async updateWorkspace(workspaceId, updateData) {
    const workspace = await Workspace.findByIdAndUpdate(workspaceId, updateData, { new: true });
    if (!workspace) {
      throw ApiError.notFound('Workspace not found');
    }
    return workspace;
  }

  // Deleting a workspace removes everything inside it
  async deleteWorkspace(workspaceId) {
    const workspace = await Workspace.findByIdAndDelete(workspaceId);
    if (!workspace) {
      throw ApiError.notFound('Workspace not found');
    }

    const projectIds = (await Project.find({ workspaceId }).select('_id')).map((p) => p._id);
    const taskIds = (await Task.find({ workspaceId }).select('_id')).map((t) => t._id);

    await Promise.all([
      Comment.deleteMany({ taskId: { $in: taskIds } }),
      Attachment.deleteMany({ taskId: { $in: taskIds } }),
      Task.deleteMany({ workspaceId }),
      Message.deleteMany({ projectId: { $in: projectIds } }),
      Activity.deleteMany({ workspaceId }),
      Project.deleteMany({ workspaceId }),
      Invitation.deleteMany({ workspaceId }),
      WorkspaceMember.deleteMany({ workspace: workspaceId })
    ]);
    return { message: 'Workspace deleted successfully' };
  }

  async removeMember(workspaceId, memberUserId) {
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      throw ApiError.notFound('Workspace not found');
    }
    if (String(workspace.ownerId) === String(memberUserId)) {
      throw ApiError.badRequest('The workspace creator cannot be removed');
    }

    const member = await WorkspaceMember.findOneAndDelete({ workspace: workspaceId, user: memberUserId });
    if (!member) {
      throw ApiError.notFound('Member not found in this workspace');
    }

    // They lose access to the workspace, so take them off its projects and tasks too
    await Project.updateMany({ workspaceId }, { $pull: { members: memberUserId } });
    await Task.updateMany({ workspaceId, assignedTo: memberUserId }, { $set: { assignedTo: null, assignedBy: null } });

    return { message: 'Member removed from workspace' };
  }
}

module.exports = new WorkspaceService();
