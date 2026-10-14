const ApiError = require('../utils/apiError');
const WorkspaceMember = require('../models/WorkspaceMember.model');

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `User role '${req.user.role}' is not authorized to perform this action. Required: ${allowedRoles.join(', ')}`
        )
      );
    }
    next();
  };
};

const checkWorkspaceRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      const workspaceId = req.params.workspaceId || req.body.workspaceId || req.query.workspaceId;
      if (!workspaceId) {
        return next(ApiError.badRequest('Workspace ID is required for authorization check'));
      }

      // System ADMIN gets global bypass
      if (req.user.role === 'ADMIN') {
        return next();
      }

      const membership = await WorkspaceMember.findOne({
        user: req.user._id,
        workspace: workspaceId,
        status: 'ACTIVE'
      });

      if (!membership) {
        return next(ApiError.forbidden('You are not an active member of this workspace'));
      }

      req.workspaceMember = membership;

      if (!allowedRoles.includes(membership.role)) {
        return next(
          ApiError.forbidden(
            `Workspace role '${membership.role}' is not authorized for this action. Required: ${allowedRoles.join(', ')}`
          )
        );
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = {
  authorizeRoles,
  checkWorkspaceRole
};
