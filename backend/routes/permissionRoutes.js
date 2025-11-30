
const express = require('express');
const router = express.Router();
const permissionController = require('../controllers/permissionController');
const { verifyToken } = require('../middleware/auth');

// GET /api/permissions - list permissions (protected)
router.get('/', verifyToken, permissionController.getAllPermissions);

// GET /api/permissions/:permissionId - get permission detail (protected)
router.get('/:permissionId', verifyToken, permissionController.getPermissionDetail);

// PATCH /api/permissions/:permissionId/status - update status (protected)
router.patch('/:permissionId/status', verifyToken, permissionController.updatePermissionStatus);

module.exports = router;
