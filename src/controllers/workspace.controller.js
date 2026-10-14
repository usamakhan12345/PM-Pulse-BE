const workspaceService = require('../services/workspace.service');
const ApiResponse = require('../utils/apiResponse');

class WorkspaceController {
  async createWorkspace(req, res, next) {
    try {
      const workspace = await workspaceService.createWorkspace(req.user._id, req.body);
      return ApiResponse.created(res, { workspace }, 'Workspace created successfully');
    } catch (error) {
      next(error);
    }
  }

  async getUserWorkspaces(req, res, next) {
    try {
      const workspaces = await workspaceService.getUserWorkspaces(req.user._id);
      return ApiResponse.success(res, { workspaces }, 'Workspaces retrieved');
    } catch (error) {
      next(error);
    }
  }

  async getWorkspaceById(req, res, next) {
    try {
      const workspace = await workspaceService.getWorkspaceById(req.params.id, req.user._id);
      return ApiResponse.success(res, { workspace }, 'Workspace retrieved');
    } catch (error) {
      next(error);
    }
  }

  async updateWorkspace(req, res, next) {
    try {
      const workspace = await workspaceService.updateWorkspace(req.params.id, req.body);
      return ApiResponse.success(res, { workspace }, 'Workspace updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteWorkspace(req, res, next) {
    try {
      const result = await workspaceService.deleteWorkspace(req.params.id);
      return ApiResponse.success(res, result, 'Workspace deleted');
    } catch (error) {
      next(error);
    }
  }

  async addMember(req, res, next) {
    try {
      const member = await workspaceService.addMember(req.params.id, req.body);
      return ApiResponse.created(res, { member }, 'Member added to workspace');
    } catch (error) {
      next(error);
    }
  }

  async removeMember(req, res, next) {
    try {
      const result = await workspaceService.removeMember(req.params.id, req.params.userId);
      return ApiResponse.success(res, result, 'Member removed from workspace');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new WorkspaceController();
