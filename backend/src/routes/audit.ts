import { Router } from 'express';
import { query } from '../db.js';

export const auditRouter = Router();

// GET /api/v1/audit - Append-only immutable log
auditRouter.get('/', async (req, res, next) => {
  try {
    const orgId = (req.query.orgId as string) || (req as any).orgMember?.organisationId;
    if (!orgId) {
      return res.json({ success: true, count: 0, auditEvents: [] });
    }
    const { resourceType, limit = '50' } = req.query;

    let sql = `SELECT * FROM payment_audit_events WHERE organisation_id = $1`;
    const params: any[] = [orgId];

    if (resourceType) {
      params.push(resourceType);
      sql += ` AND resource_type = $${params.length}`;
    }

    params.push(Math.min(parseInt(limit as string, 10) || 50, 100));
    sql += ` ORDER BY created_at DESC LIMIT $${params.length}`;

    const result = await query(sql, params);
    res.json({ success: true, count: result.rows.length, auditEvents: result.rows });
  } catch (err) {
    next(err);
  }
});

