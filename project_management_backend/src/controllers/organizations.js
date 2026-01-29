const { query } = require('../db/pool');
const { logActivity } = require('../services/activityLog');

class OrganizationsController {
  /**
   * PUBLIC_INTERFACE
   * List organizations for current user.
   */
  async list(req, res, next) {
    try {
      const result = await query(
        `SELECT o.*
         FROM organizations o
         JOIN organization_memberships m ON m.organization_id = o.id
         WHERE m.user_id = $1
         ORDER BY o.id DESC`,
        [req.user.id]
      );
      return res.status(200).json({ organizations: result.rows });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * PUBLIC_INTERFACE
   * Create an organization and add current user as owner.
   */
  async create(req, res, next) {
    try {
      const { name } = req.body || {};
      if (!name) return res.status(400).json({ message: 'name is required' });

      const created = await query(
        'INSERT INTO organizations (name) VALUES ($1) RETURNING *',
        [name]
      );
      const org = created.rows[0];

      await query(
        `INSERT INTO organization_memberships (user_id, organization_id, role)
         VALUES ($1, $2, 'owner')
         ON CONFLICT (user_id, organization_id) DO NOTHING`,
        [req.user.id, org.id]
      );

      await logActivity({
        actorUserId: req.user.id,
        organizationId: org.id,
        action: 'organization.created',
        metadata: { name },
      });

      return res.status(201).json({ organization: org });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * PUBLIC_INTERFACE
   * Get organization by id (must be a member).
   */
  async get(req, res, next) {
    try {
      const orgId = Number(req.params.orgId);
      const result = await query(
        `SELECT o.*
         FROM organizations o
         JOIN organization_memberships m ON m.organization_id = o.id
         WHERE o.id = $1 AND m.user_id = $2`,
        [orgId, req.user.id]
      );

      if (result.rowCount === 0) return res.status(404).json({ message: 'Organization not found' });
      return res.status(200).json({ organization: result.rows[0] });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * PUBLIC_INTERFACE
   * Update organization name (member can update for now).
   */
  async update(req, res, next) {
    try {
      const orgId = Number(req.params.orgId);
      const { name } = req.body || {};
      if (!name) return res.status(400).json({ message: 'name is required' });

      // Ensure membership
      const mem = await query(
        'SELECT 1 FROM organization_memberships WHERE organization_id = $1 AND user_id = $2',
        [orgId, req.user.id]
      );
      if (mem.rowCount === 0) return res.status(404).json({ message: 'Organization not found' });

      const updated = await query(
        'UPDATE organizations SET name = $1 WHERE id = $2 RETURNING *',
        [name, orgId]
      );

      await logActivity({
        actorUserId: req.user.id,
        organizationId: orgId,
        action: 'organization.updated',
        metadata: { name },
      });

      return res.status(200).json({ organization: updated.rows[0] });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * PUBLIC_INTERFACE
   * Delete organization (member can delete for now).
   */
  async remove(req, res, next) {
    try {
      const orgId = Number(req.params.orgId);

      const mem = await query(
        'SELECT 1 FROM organization_memberships WHERE organization_id = $1 AND user_id = $2',
        [orgId, req.user.id]
      );
      if (mem.rowCount === 0) return res.status(404).json({ message: 'Organization not found' });

      await query('DELETE FROM organizations WHERE id = $1', [orgId]);

      await logActivity({
        actorUserId: req.user.id,
        organizationId: orgId,
        action: 'organization.deleted',
        metadata: {},
      });

      return res.status(204).send();
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new OrganizationsController();
