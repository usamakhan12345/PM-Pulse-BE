const express = require('express');
const router = express.Router();
const commentController = require('../controllers/comment.controller');
const { authenticateUser } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { updateCommentSchema } = require('../validators/comment.validator');

router.use(authenticateUser);

router.patch('/:id', validate(updateCommentSchema), commentController.updateComment);
router.delete('/:id', commentController.deleteComment);

module.exports = router;
