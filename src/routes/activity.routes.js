const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activity.controller');
const { authenticateUser } = require('../middleware/auth.middleware');

router.use(authenticateUser);

router.get('/', activityController.getActivities);

module.exports = router;
