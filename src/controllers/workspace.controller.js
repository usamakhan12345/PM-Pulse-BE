const workspaceService = require('../services/workspace.service');
const invitationService = require('../services/invitation.service');
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
      const workspaces = await workspaceService.getUserWorkspaces(req.user._id, req.user.role);
      return ApiResponse.success(res, { workspaces }, 'Workspaces retrieved');
    } catch (error) {
      next(error);
    }
  }

  async getWorkspaceById(req, res, next) {
    try {
      const workspace = await workspaceService.getWorkspaceById(req.params.id, req.user);
      return ApiResponse.success(res, { workspace }, 'Workspace retrieved');
    } catch (error) {
      next(error);
    }
  }

  async getMembers(req, res, next) {
    try {
      const members = await workspaceService.getMembers(req.params.id);
      return ApiResponse.success(res, { members }, 'Members retrieved');
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

  async removeMember(req, res, next) {
    try {
      const result = await workspaceService.removeMember(req.params.id, req.params.userId);
      return ApiResponse.success(res, result, 'Member removed from workspace');
    } catch (error) {
      next(error);
    }
  }

  async inviteByEmail(req, res, next) {
    try {
      const invitation = await invitationService.inviteByEmail(req.params.id, req.user, req.body.email);
      return ApiResponse.created(res, { invitation }, 'Invitation sent');
    } catch (error) {
      next(error);
    }
  }

  async listInvitations(req, res, next) {
    try {
      const invitations = await invitationService.listPending(req.params.id);
      return ApiResponse.success(res, { invitations }, 'Invitations retrieved');
    } catch (error) {
      next(error);
    }
  }

  async revokeInvitation(req, res, next) {
    try {
      const result = await invitationService.revoke(req.params.id, req.params.invitationId);
      return ApiResponse.success(res, result, 'Invitation cancelled');
    } catch (error) {
      next(error);
    }
  }

  async getInviteLink(req, res, next) {
    try {
      const result = await invitationService.getInviteLink(req.params.id);
      return ApiResponse.success(res, result, 'Invite link retrieved');
    } catch (error) {
      next(error);
    }
  }

  async resetInviteLink(req, res, next) {
    try {
      const result = await invitationService.getInviteLink(req.params.id, { reset: true });
      return ApiResponse.success(res, result, 'Invite link reset');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new WorkspaceController();
