const ApiError = require('../utils/apiError');
const WorkspaceMember = require('../models/WorkspaceMember.model');

// Platform level: only the listed global roles (ADMIN, USER) may continue.
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission to do this'));
    }
    next();
  };
};

// Workspace level: the caller must be an active member of the workspace with one of the listed
// roles (OWNER, MEMBER). The platform ADMIN passes every check.
const authorizeWorkspaceRoles = (resolveWorkspaceId, ...allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(ApiError.unauthorized());
      }

      const workspaceId = await resolveWorkspaceId(req);
      if (!workspaceId) {
        return next(ApiError.badRequest('Workspace ID is required'));
      }

      if (req.user.role === 'ADMIN') {
        return next();
      }

      const membership = await WorkspaceMember.findOne({
        user: req.user._id,
        workspace: workspaceId,
        status: 'ACTIVE'
      });

      if (!membership) {
        return next(ApiError.forbidden('You are not a member of this workspace'));
      }

      if (!allowedRoles.includes(membership.role)) {
        return next(ApiError.forbidden('Only the workspace owner can do this'));
      }

      req.workspaceMember = membership;
      next();
    } catch (err) {
      next(err);
    }
  };
};

// Ways to find the workspace a request is about
const workspaceFromParam = (req) => req.params.id;
const workspaceFromBody = (req) => req.body.workspaceId;

module.exports = {
  authorizeRoles,
  authorizeWorkspaceRoles,
  workspaceFromParam,
  workspaceFromBody
};
