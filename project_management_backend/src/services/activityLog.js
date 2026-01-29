const { query } = require('../db/pool');

/**
 * PUBLIC_INTERFACE
 * Create an activity log entry.
 */
async function logActivity({
  actorUserId,
  organizationId = null,
  projectId = null,
  taskId = null,
  action,
  metadata = {},
}) {
  await query(
    `INSERT INTO activity_logs
      (actor_user_id, organization_id, project_id, task_id, action, metadata)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
    [actorUserId, organizationId, projectId, taskId, action, JSON.stringify(metadata)]
  );
}

module.exports = {
  logActivity,
};
