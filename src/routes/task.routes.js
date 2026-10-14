const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');
const commentController = require('../controllers/comment.controller');
const attachmentController = require('../controllers/attachment.controller');
const { authenticateUser } = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');
const upload = require('../middleware/upload.middleware');
const { createTaskSchema, updateTaskSchema } = require('../validators/task.validator');
const { createCommentSchema } = require('../validators/comment.validator');

router.use(authenticateUser);

router.post('/', authorizeRoles('ADMIN', 'MANAGER'), validate(createTaskSchema), taskController.createTask);
router.get('/', taskController.getTasks);
router.get('/:id', taskController.getTaskById);
router.patch('/:id', validate(updateTaskSchema), taskController.updateTask);
router.delete('/:id', authorizeRoles('ADMIN', 'MANAGER'), taskController.deleteTask);

// Task comments nested route
router.post('/:taskId/comments', validate(createCommentSchema), commentController.addComment);
router.get('/:taskId/comments', commentController.getTaskComments);

// Task attachments nested route
router.post('/:taskId/attachments', upload.single('file'), attachmentController.uploadAttachment);
router.get('/:taskId/attachments', attachmentController.getTaskAttachments);

module.exports = router;
