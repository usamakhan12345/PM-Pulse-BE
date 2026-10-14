const express = require('express');
const router = express.Router();
const attachmentController = require('../controllers/attachment.controller');
const { authenticateUser } = require('../middleware/auth.middleware');
const { attachmentAccess } = require('../middleware/access.middleware');

router.use(authenticateUser);

router.delete('/:id', attachmentAccess(), attachmentController.deleteAttachment);

module.exports = router;
