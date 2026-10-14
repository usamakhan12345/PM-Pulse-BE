const User = require('../models/User.model');
const Workspace = require('../models/Workspace.model');
const WorkspaceMember = require('../models/WorkspaceMember.model');
const Project = require('../models/Project.model');
const Task = require('../models/Task.model');

const emptyStats = () => ({ TODO: 0, IN_PROGRESS: 0, IN_REVIEW: 0, DONE: 0, BLOCKED: 0, total: 0 });

const countBy = (rows, key) => new Map(rows.map((r) => [String(r._id), r[key] !== undefined ? r[key] : r.count]));

// Read-only view of the whole platform, for the administrator
class AdminService {
  async overview() {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [users, workspaces, projects, activeProjects, tasks, doneTasks, newUsers] = await Promise.all([
      User.countDocuments({ role: 'USER' }),
      Workspace.countDocuments(),
      Project.countDocuments(),
      Project.countDocuments({ status: 'ACTIVE' }),
      Task.countDocuments(),
      Task.countDocuments({ status: 'DONE' }),
      User.countDocuments({ role: 'USER', createdAt: { $gte: weekAgo } })
    ]);
    return { users, newUsersThisWeek: newUsers, workspaces, projects, activeProjects, tasks, doneTasks };
  }

  async users({ search, page = 1, limit = 20 }) {
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('name email avatar role createdAt')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const ids = users.map((u) => u._id);
    const [workspaceCounts, projectCounts] = await Promise.all([
      WorkspaceMember.aggregate([
        { $match: { user: { $in: ids }, status: 'ACTIVE' } },
        { $group: { _id: '$user', count: { $sum: 1 } } }
      ]),
      Project.aggregate([{ $match: { ownerId: { $in: ids } } }, { $group: { _id: '$ownerId', count: { $sum: 1 } } }])
    ]);
    const workspacesBy = countBy(workspaceCounts, 'count');
    const projectsBy = countBy(projectCounts, 'count');

    return {
      users: users.map((u) => ({
        ...u.toObject(),
        workspaceCount: workspacesBy.get(String(u._id)) || 0,
        projectCount: projectsBy.get(String(u._id)) || 0
      })),
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) || 1 }
    };
  }

  async workspaces() {
    const workspaces = await Workspace.find().populate('ownerId', 'name email').sort({ createdAt: -1 });
    const ids = workspaces.map((w) => w._id);

    const [members, projects, activeProjects, tasks] = await Promise.all([
      WorkspaceMember.aggregate([{ $match: { workspace: { $in: ids }, status: 'ACTIVE' } }, { $group: { _id: '$workspace', count: { $sum: 1 } } }]),
      Project.aggregate([{ $match: { workspaceId: { $in: ids } } }, { $group: { _id: '$workspaceId', count: { $sum: 1 } } }]),
      Project.aggregate([{ $match: { workspaceId: { $in: ids }, status: 'ACTIVE' } }, { $group: { _id: '$workspaceId', count: { $sum: 1 } } }]),
      Task.aggregate([{ $match: { workspaceId: { $in: ids } } }, { $group: { _id: '$workspaceId', count: { $sum: 1 } } }])
    ]);
    const membersBy = countBy(members, 'count');
    const projectsBy = countBy(projects, 'count');
    const activeBy = countBy(activeProjects, 'count');
    const tasksBy = countBy(tasks, 'count');

    return workspaces.map((w) => ({
      _id: w._id,
      name: w.name,
      owner: w.ownerId,
      createdAt: w.createdAt,
      memberCount: membersBy.get(String(w._id)) || 0,
      projectCount: projectsBy.get(String(w._id)) || 0,
      activeProjectCount: activeBy.get(String(w._id)) || 0,
      taskCount: tasksBy.get(String(w._id)) || 0
    }));
  }

  // Every project on the platform, newest activity first. Defaults to the active ones.
  async projects({ status = 'ACTIVE', search, page = 1, limit = 20 }) {
    const query = {};
    if (status && status !== 'ALL') query.status = status;
    if (search) query.name = { $regex: search, $options: 'i' };

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const total = await Project.countDocuments(query);
    const projects = await Project.find(query)
      .populate('ownerId', 'name email')
      .populate('workspaceId', 'name')
      .sort({ updatedAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const stats = await Task.aggregate([
      { $match: { projectId: { $in: projects.map((p) => p._id) } } },
      { $group: { _id: { projectId: '$projectId', status: '$status' }, count: { $sum: 1 } } }
    ]);
    const byProject = new Map();
    stats.forEach((s) => {
      const key = String(s._id.projectId);
      const entry = byProject.get(key) || emptyStats();
      entry[s._id.status] = s.count;
      entry.total += s.count;
      byProject.set(key, entry);
    });

    return {
      projects: projects.map((p) => ({
        _id: p._id,
        name: p.name,
        status: p.status,
        dueDate: p.dueDate,
        updatedAt: p.updatedAt,
        createdAt: p.createdAt,
        owner: p.ownerId,
        workspace: p.workspaceId,
        memberCount: (p.members || []).length,
        taskStats: byProject.get(String(p._id)) || emptyStats()
      })),
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) || 1 }
    };
  }
}

module.exports = new AdminService();
