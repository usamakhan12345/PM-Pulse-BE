const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');
const { authenticateUser } = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');
const { createProjectSchema, updateProjectSchema } = require('../validators/project.validator');

router.use(authenticateUser);

router.post('/', authorizeRoles('ADMIN', 'MANAGER'), validate(createProjectSchema), projectController.createProject);
router.get('/', projectController.getProjects);
router.get('/:id', projectController.getProjectById);
router.patch('/:id', authorizeRoles('ADMIN', 'MANAGER'), validate(updateProjectSchema), projectController.updateProject);
router.delete('/:id', authorizeRoles('ADMIN'), projectController.deleteProject);

router.post('/:id/members', authorizeRoles('ADMIN', 'MANAGER'), projectController.addMember);
router.delete('/:id/members/:userId', authorizeRoles('ADMIN', 'MANAGER'), projectController.removeMember);

module.exports = router;
