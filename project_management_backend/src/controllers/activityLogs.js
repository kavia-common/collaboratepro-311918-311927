const { query } = require('../db/pool');

class ActivityLogsController {
  /**
   * PUBLIC_INTERFACE
   * List activity logs visible to the user (by membership),
   * with optional filters: organizationId, projectId, taskId.
   */
  async list(req, res, next) {
    try {
      const organizationId = req.query.organizationId ? Number(req.query.organizationId) : null;
      const projectId = req.query.projectId ? Number(req.query.projectId) : null;
      const taskId = req.query.taskId ? Number(req.query.taskId) : null;
      const limit = req.query.limit ? Math.min(Number(req.query.limit), 200) : 50;

      // Only return logs for orgs where user is a member. If no org filter, return across all memberships.
      const params = [req.user.id];
      let where = `
        WHERE EXISTS (
          SELECT 1 FROM organization_memberships m
          WHERE m.user_id = $1 AND m.organization_id = al.organization_id
        )
      `;

      if (organizationId) {
        params.push(organizationId);
        where += ` AND al.organization_id = $${params.length}`;
      }
      if (projectId) {
        params.push(projectId);
        where += ` AND al.project_id = $${params.length}`;
      }
      if (taskId) {
        params.push(taskId);
        where += ` AND al.task_id = $${params.length}`;
      }

      params.push(limit);

      const result = await query(
        `
        SELECT al.*
        FROM activity_logs al
        ${where}
        ORDER BY al.id DESC
        LIMIT $${params.length}
        `,
        params
      );

      return res.status(200).json({ activityLogs: result.rows });
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new ActivityLogsController();
