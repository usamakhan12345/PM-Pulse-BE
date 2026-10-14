const activityService = require('../services/activity.service');
const ApiResponse = require('../utils/apiResponse');

class ActivityController {
  async getActivities(req, res, next) {
    try {
      const { workspaceId, projectId, limit } = req.query;
      const activities = await activityService.getActivities({ workspaceId, projectId, limit });
      return ApiResponse.success(res, { activities }, 'Activities retrieved');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ActivityController();
