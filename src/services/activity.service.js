const Activity = require('../models/Activity.model');
const accessService = require('./access.service');

class ActivityService {
  async logActivity({ workspaceId, projectId = null, taskId = null, userId, action, metadata = {} }) {
    try {
      const activity = await Activity.create({
        workspaceId,
        projectId,
        taskId,
        userId,
        action,
        metadata
      });
      return activity;
    } catch (err) {
      console.error('[ActivityLog Error]', err);
    }
  }

  async getActivities({ workspaceId, projectId, limit = 30, user }) {
    const query = {};
    if (workspaceId) query.workspaceId = workspaceId;
    if (projectId) query.projectId = projectId;

    // People only see activity of projects they can access
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

    const activities = await Activity.find(query)
      .populate('userId', 'name email avatar role')
      .populate('projectId', 'name')
      .populate('taskId', 'title')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10));

    return activities;
  }
}

module.exports = new ActivityService();
