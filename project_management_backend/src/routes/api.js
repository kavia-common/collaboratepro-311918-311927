const express = require('express');
const authController = require('../controllers/auth');
const organizationsController = require('../controllers/organizations');
const projectsController = require('../controllers/projects');
const tasksController = require('../controllers/tasks');
const activityLogsController = require('../controllers/activityLogs');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Auth
 *   - name: Organizations
 *   - name: Projects
 *   - name: Tasks
 *   - name: ActivityLogs
 */

// Auth (placeholder)
/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a user (placeholder)
 *     tags: [Auth]
 */
router.post('/auth/register', authController.register.bind(authController));
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login (placeholder)
 *     tags: [Auth]
 */
router.post('/auth/login', authController.login.bind(authController));
/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user (requires Bearer token)
 *     tags: [Auth]
 */
router.get('/auth/me', requireAuth, authController.me.bind(authController));

// Organizations
router.get('/organizations', requireAuth, organizationsController.list.bind(organizationsController));
router.post('/organizations', requireAuth, organizationsController.create.bind(organizationsController));
router.get('/organizations/:orgId', requireAuth, organizationsController.get.bind(organizationsController));
router.put('/organizations/:orgId', requireAuth, organizationsController.update.bind(organizationsController));
router.delete('/organizations/:orgId', requireAuth, organizationsController.remove.bind(organizationsController));

// Projects (scoped to org)
router.get(
  '/organizations/:orgId/projects',
  requireAuth,
  projectsController.list.bind(projectsController)
);
router.post(
  '/organizations/:orgId/projects',
  requireAuth,
  projectsController.create.bind(projectsController)
);
router.get(
  '/organizations/:orgId/projects/:projectId',
  requireAuth,
  projectsController.get.bind(projectsController)
);
router.put(
  '/organizations/:orgId/projects/:projectId',
  requireAuth,
  projectsController.update.bind(projectsController)
);
router.delete(
  '/organizations/:orgId/projects/:projectId',
  requireAuth,
  projectsController.remove.bind(projectsController)
);

// Tasks (scoped to project within org)
router.get(
  '/organizations/:orgId/projects/:projectId/tasks',
  requireAuth,
  tasksController.list.bind(tasksController)
);
router.post(
  '/organizations/:orgId/projects/:projectId/tasks',
  requireAuth,
  tasksController.create.bind(tasksController)
);
router.get(
  '/organizations/:orgId/projects/:projectId/tasks/:taskId',
  requireAuth,
  tasksController.get.bind(tasksController)
);
router.put(
  '/organizations/:orgId/projects/:projectId/tasks/:taskId',
  requireAuth,
  tasksController.update.bind(tasksController)
);
router.delete(
  '/organizations/:orgId/projects/:projectId/tasks/:taskId',
  requireAuth,
  tasksController.remove.bind(tasksController)
);

// Activity logs
router.get('/activity-logs', requireAuth, activityLogsController.list.bind(activityLogsController));

module.exports = router;
