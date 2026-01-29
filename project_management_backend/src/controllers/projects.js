const { query } = require('../db/pool');
const { logActivity } = require('../services/activityLog');

async function ensureOrgMembership(userId, orgId) {
  const mem = await query(
    'SELECT 1 FROM organization_memberships WHERE organization_id = $1 AND user_id = $2',
    [orgId, userId]
  );
  return mem.rowCount > 0;
}

class ProjectsController {
  /**
   * PUBLIC_INTERFACE
   * List projects for an organization.
   */
  async list(req, res, next) {
    try {
      const orgId = Number(req.params.orgId);
      if (!(await ensureOrgMembership(req.user.id, orgId))) {
        return res.status(404).json({ message: 'Organization not found' });
      }

      const result = await query(
        'SELECT * FROM projects WHERE organization_id = $1 ORDER BY id DESC',
        [orgId]
      );
      return res.status(200).json({ projects: result.rows });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * PUBLIC_INTERFACE
   * Create a project in an organization.
   */
  async create(req, res, next) {
    try {
      const orgId = Number(req.params.orgId);
      if (!(await ensureOrgMembership(req.user.id, orgId))) {
        return res.status(404).json({ message: 'Organization not found' });
      }

      const { name, description } = req.body || {};
      if (!name) return res.status(400).json({ message: 'name is required' });

      const created = await query(
        'INSERT INTO projects (organization_id, name, description) VALUES ($1, $2, $3) RETURNING *',
        [orgId, name, description || null]
      );

      const project = created.rows[0];

      await logActivity({
        actorUserId: req.user.id,
        organizationId: orgId,
        projectId: project.id,
        action: 'project.created',
        metadata: { name },
      });

      return res.status(201).json({ project });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * PUBLIC_INTERFACE
   * Get project by id (membership required via org).
   */
  async get(req, res, next) {
    try {
      const orgId = Number(req.params.orgId);
      const projectId = Number(req.params.projectId);

      if (!(await ensureOrgMembership(req.user.id, orgId))) {
        return res.status(404).json({ message: 'Organization not found' });
      }

      const result = await query(
        'SELECT * FROM projects WHERE id = $1 AND organization_id = $2',
        [projectId, orgId]
      );

      if (result.rowCount === 0) return res.status(404).json({ message: 'Project not found' });
      return res.status(200).json({ project: result.rows[0] });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * PUBLIC_INTERFACE
   * Update project.
   */
  async update(req, res, next) {
    try {
      const orgId = Number(req.params.orgId);
      const projectId = Number(req.params.projectId);

      if (!(await ensureOrgMembership(req.user.id, orgId))) {
        return res.status(404).json({ message: 'Organization not found' });
      }

      const { name, description } = req.body || {};
      if (!name) return res.status(400).json({ message: 'name is required' });

      const updated = await query(
        `UPDATE projects
         SET name = $1, description = $2
         WHERE id = $3 AND organization_id = $4
         RETURNING *`,
        [name, description || null, projectId, orgId]
      );

      if (updated.rowCount === 0) return res.status(404).json({ message: 'Project not found' });

      await logActivity({
        actorUserId: req.user.id,
        organizationId: orgId,
        projectId,
        action: 'project.updated',
        metadata: { name },
      });

      return res.status(200).json({ project: updated.rows[0] });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * PUBLIC_INTERFACE
   * Delete project.
   */
  async remove(req, res, next) {
    try {
      const orgId = Number(req.params.orgId);
      const projectId = Number(req.params.projectId);

      if (!(await ensureOrgMembership(req.user.id, orgId))) {
        return res.status(404).json({ message: 'Organization not found' });
      }

      const deleted = await query(
        'DELETE FROM projects WHERE id = $1 AND organization_id = $2 RETURNING id',
        [projectId, orgId]
      );

      if (deleted.rowCount === 0) return res.status(404).json({ message: 'Project not found' });

      await logActivity({
        actorUserId: req.user.id,
        organizationId: orgId,
        projectId,
        action: 'project.deleted',
        metadata: {},
      });

      return res.status(204).send();
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new ProjectsController();
