const Activity = require('../models/Activity.model');

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

  async getActivities({ workspaceId, projectId, limit = 30 }) {
    const query = {};
    if (workspaceId) query.workspaceId = workspaceId;
    if (projectId) query.projectId = projectId;

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
