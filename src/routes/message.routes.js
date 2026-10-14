const express = require('express');
const router = express.Router();
const messageController = require('../controllers/message.controller');
const { authenticateUser } = require('../middleware/auth.middleware');

router.use(authenticateUser);

router.post('/', messageController.sendMessage);
router.get('/project/:projectId', messageController.getProjectMessages);

module.exports = router;
