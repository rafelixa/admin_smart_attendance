const express = require('express');
const router = express.Router();
const permissionController = require('../controllers/permissionController');

// GET /api/permissions - list permissions (optional status filter)
router.get('/', permissionController.getAllPermissions);

// GET /api/permissions/:permissionId - get permission detail
router.get('/:permissionId', permissionController.getPermissionDetail);

// PATCH /api/permissions/:permissionId/status - update status
router.patch('/:permissionId/status', permissionController.updatePermissionStatus);

module.exports = router;
