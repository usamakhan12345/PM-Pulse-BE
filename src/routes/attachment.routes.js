const express = require('express');
const router = express.Router();
const attachmentController = require('../controllers/attachment.controller');
const { authenticateUser } = require('../middleware/auth.middleware');

router.use(authenticateUser);

router.delete('/:id', attachmentController.deleteAttachment);

module.exports = router;
