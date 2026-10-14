const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');
const { authenticateUser } = require('../middleware/auth.middleware');
const { authorizeWorkspaceRoles, workspaceFromBody } = require('../middleware/rbac.middleware');
const { projectAccess } = require('../middleware/access.middleware');
const validate = require('../middleware/validate.middleware');
const { createProjectSchema, updateProjectSchema } = require('../validators/project.validator');

router.use(authenticateUser);

// Workspace owners create and manage projects; members only see the projects they were added to
const ownerOfProject = projectAccess('id', { ownerOnly: true });
const canSeeProject = projectAccess('id');

router.post('/', authorizeWorkspaceRoles(workspaceFromBody, 'OWNER'), validate(createProjectSchema), projectController.createProject);
router.get('/', projectController.getProjects);
router.get('/:id/report', ownerOfProject, projectController.downloadReport);
router.get('/:id', canSeeProject, projectController.getProjectById);
router.patch('/:id', ownerOfProject, validate(updateProjectSchema), projectController.updateProject);
router.delete('/:id', ownerOfProject, projectController.deleteProject);

router.post('/:id/members', ownerOfProject, projectController.addMember);
router.delete('/:id/members/:userId', ownerOfProject, projectController.removeMember);

module.exports = router;
