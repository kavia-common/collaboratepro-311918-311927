const { query } = require('../db/pool');
const { logActivity } = require('../services/activityLog');

async function ensureProjectAccess(userId, orgId, projectId) {
  const mem = await query(
    `SELECT 1
     FROM organization_memberships m
     JOIN projects p ON p.organization_id = m.organization_id
     WHERE m.user_id = $1 AND m.organization_id = $2 AND p.id = $3`,
    [userId, orgId, projectId]
  );
  return mem.rowCount > 0;
}

class TasksController {
  /**
   * PUBLIC_INTERFACE
   * List tasks for a project.
   */
  async list(req, res, next) {
    try {
      const orgId = Number(req.params.orgId);
      const projectId = Number(req.params.projectId);

      if (!(await ensureProjectAccess(req.user.id, orgId, projectId))) {
        return res.status(404).json({ message: 'Project not found' });
      }

      const result = await query(
        'SELECT * FROM tasks WHERE project_id = $1 ORDER BY id DESC',
        [projectId]
      );

      return res.status(200).json({ tasks: result.rows });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * PUBLIC_INTERFACE
   * Create task in a project.
   */
  async create(req, res, next) {
    try {
      const orgId = Number(req.params.orgId);
      const projectId = Number(req.params.projectId);

      if (!(await ensureProjectAccess(req.user.id, orgId, projectId))) {
        return res.status(404).json({ message: 'Project not found' });
      }

      const { title, description, status, assigneeUserId, dueDate } = req.body || {};
      if (!title) return res.status(400).json({ message: 'title is required' });

      const created = await query(
        `INSERT INTO tasks (project_id, title, description, status, assignee_user_id, due_date)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          projectId,
          title,
          description || null,
          status || 'todo',
          assigneeUserId || null,
          dueDate || null,
        ]
      );

      const task = created.rows[0];

      await logActivity({
        actorUserId: req.user.id,
        organizationId: orgId,
        projectId,
        taskId: task.id,
        action: 'task.created',
        metadata: { title, status: task.status },
      });

      return res.status(201).json({ task });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * PUBLIC_INTERFACE
   * Get task by id.
   */
  async get(req, res, next) {
    try {
      const orgId = Number(req.params.orgId);
      const projectId = Number(req.params.projectId);
      const taskId = Number(req.params.taskId);

      if (!(await ensureProjectAccess(req.user.id, orgId, projectId))) {
        return res.status(404).json({ message: 'Project not found' });
      }

      const result = await query(
        'SELECT * FROM tasks WHERE id = $1 AND project_id = $2',
        [taskId, projectId]
      );

      if (result.rowCount === 0) return res.status(404).json({ message: 'Task not found' });
      return res.status(200).json({ task: result.rows[0] });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * PUBLIC_INTERFACE
   * Update task fields.
   */
  async update(req, res, next) {
    try {
      const orgId = Number(req.params.orgId);
      const projectId = Number(req.params.projectId);
      const taskId = Number(req.params.taskId);

      if (!(await ensureProjectAccess(req.user.id, orgId, projectId))) {
        return res.status(404).json({ message: 'Project not found' });
      }

      const { title, description, status, assigneeUserId, dueDate } = req.body || {};
      if (!title) return res.status(400).json({ message: 'title is required' });

      const updated = await query(
        `UPDATE tasks
         SET title = $1,
             description = $2,
             status = $3,
             assignee_user_id = $4,
             due_date = $5
         WHERE id = $6 AND project_id = $7
         RETURNING *`,
        [
          title,
          description || null,
          status || 'todo',
          assigneeUserId || null,
          dueDate || null,
          taskId,
          projectId,
        ]
      );

      if (updated.rowCount === 0) return res.status(404).json({ message: 'Task not found' });

      await logActivity({
        actorUserId: req.user.id,
        organizationId: orgId,
        projectId,
        taskId,
        action: 'task.updated',
        metadata: { title, status: updated.rows[0].status },
      });

      return res.status(200).json({ task: updated.rows[0] });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * PUBLIC_INTERFACE
   * Delete task.
   */
  async remove(req, res, next) {
    try {
      const orgId = Number(req.params.orgId);
      const projectId = Number(req.params.projectId);
      const taskId = Number(req.params.taskId);

      if (!(await ensureProjectAccess(req.user.id, orgId, projectId))) {
        return res.status(404).json({ message: 'Project not found' });
      }

      const deleted = await query(
        'DELETE FROM tasks WHERE id = $1 AND project_id = $2 RETURNING id',
        [taskId, projectId]
      );

      if (deleted.rowCount === 0) return res.status(404).json({ message: 'Task not found' });

      await logActivity({
        actorUserId: req.user.id,
        organizationId: orgId,
        projectId,
        taskId,
        action: 'task.deleted',
        metadata: {},
      });

      return res.status(204).send();
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new TasksController();
