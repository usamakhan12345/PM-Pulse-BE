const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');
const commentController = require('../controllers/comment.controller');
const attachmentController = require('../controllers/attachment.controller');
const { authenticateUser } = require('../middleware/auth.middleware');
const { bodyProjectAccess, taskAccess } = require('../middleware/access.middleware');
const validate = require('../middleware/validate.middleware');
const upload = require('../middleware/upload.middleware');
const { createTaskSchema, updateTaskSchema } = require('../validators/task.validator');
const { createCommentSchema } = require('../validators/comment.validator');

router.use(authenticateUser);

// Anyone on a project can create and update its tasks. Every route below first checks
// that the caller can see the task's project, so one customer can never reach another's tasks.
router.post('/', validate(createTaskSchema), bodyProjectAccess(), taskController.createTask);
router.get('/', taskController.getTasks);
router.get('/:id', taskAccess('id'), taskController.getTaskById);
router.patch('/:id', taskAccess('id'), validate(updateTaskSchema), taskController.updateTask);
router.delete('/:id', taskAccess('id'), taskController.deleteTask);

// Task comments nested route
router.post('/:taskId/comments', taskAccess('taskId'), validate(createCommentSchema), commentController.addComment);
router.get('/:taskId/comments', taskAccess('taskId'), commentController.getTaskComments);

// Task attachments nested route
router.post('/:taskId/attachments', taskAccess('taskId'), upload.single('file'), attachmentController.uploadAttachment);
router.get('/:taskId/attachments', taskAccess('taskId'), attachmentController.getTaskAttachments);

module.exports = router;
