const Project = require('../models/Project.model');
const Task = require('../models/Task.model');
const WorkspaceMember = require('../models/WorkspaceMember.model');
const ApiError = require('../utils/apiError');

const sameId = (a, b) => String(a) === String(b);

// Central place for "who may see or change what".
//   ADMIN      the platform owner; may see everything.
//   OWNER      owns a workspace; manages its members, projects and tasks.
//   MEMBER     sees the workspace's open projects, plus any private project they were added to.
class AccessService {
  async membership(userId, workspaceId) {
    return WorkspaceMember.findOne({ user: userId, workspace: workspaceId, status: 'ACTIVE' });
  }

  async isWorkspaceOwner(user, workspaceId) {
    if (user.role === 'ADMIN') return true;
    const m = await this.membership(user._id, workspaceId);
    return !!m && m.role === 'OWNER';
  }

  // How this user relates to a project: { canView, isOwner }
  async projectAccess(user, project) {
    if (user.role === 'ADMIN') return { canView: true, isOwner: true };
    const m = await this.membership(user._id, project.workspaceId);
    if (!m) return { canView: false, isOwner: false };
    if (m.role === 'OWNER') return { canView: true, isOwner: true };
    // Open projects are visible to everyone in the workspace
    if (!project.isPrivate) return { canView: true, isOwner: false };
    const inProject = sameId(project.ownerId, user._id) || (project.members || []).some((id) => sameId(id, user._id));
    return { canView: inProject, isOwner: false };
  }

  async requireProject(user, projectId, { ownerOnly = false } = {}) {
    const project = await Project.findById(projectId);
    if (!project) throw ApiError.notFound('Project not found');
    const access = await this.projectAccess(user, project);
    if (!access.canView) throw ApiError.forbidden('You do not have access to this project');
    if (ownerOnly && !access.isOwner) throw ApiError.forbidden('Only the workspace owner can do this');
    return { project, access };
  }

  async requireTask(user, taskId) {
    const task = await Task.findById(taskId);
    if (!task) throw ApiError.notFound('Task not found');
    const { project, access } = await this.requireProject(user, task.projectId);
    return { task, project, access };
  }

  // Ids of projects the user can see, optionally inside one workspace. null means "no restriction" (admin).
  async accessibleProjectIds(user, workspaceId) {
    if (user.role === 'ADMIN') return null;

    const memberships = await WorkspaceMember.find({ user: user._id, status: 'ACTIVE' });
    const scoped = workspaceId ? memberships.filter((m) => sameId(m.workspace, workspaceId)) : memberships;
    if (scoped.length === 0) return [];

    const ownedWorkspaceIds = scoped.filter((m) => m.role === 'OWNER').map((m) => m.workspace);
    const memberWorkspaceIds = scoped.map((m) => m.workspace);

    const projects = await Project.find({
      $or: [
        { workspaceId: { $in: ownedWorkspaceIds } },
        { workspaceId: { $in: memberWorkspaceIds }, isPrivate: { $ne: true } },
        { workspaceId: { $in: memberWorkspaceIds }, $or: [{ members: user._id }, { ownerId: user._id }] }
      ]
    }).select('_id');
    return projects.map((p) => p._id);
  }
}

module.exports = new AccessService();
