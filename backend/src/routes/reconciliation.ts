import { Router } from 'express';
import { query } from '../db.js';
import { ReconciliationWorker } from '../reconciliation/worker.js';

export const reconciliationRouter = Router();

// GET /api/v1/reconciliation/runs - List past runs
reconciliationRouter.get('/runs', async (req, res, next) => {
  try {
    const orgId = (req.query.orgId as string) || (req as any).orgMember?.organisationId;
    if (!orgId) {
      return res.json({ success: true, runs: [] });
    }
    const result = await query(
      `SELECT * FROM reconciliation_runs WHERE organisation_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [orgId]
    );
    res.json({ success: true, runs: result.rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/reconciliation/run - Trigger reconciliation run
reconciliationRouter.post('/run', async (req, res, next) => {
  try {
    const organisationId = req.body.organisationId || (req as any).orgMember?.organisationId;
    if (!organisationId) {
      return res.status(400).json({ success: false, error: 'Organisation ID required' });
    }
    const result = await ReconciliationWorker.runReconciliation(organisationId, 'manual');
    res.json({ success: true, reconciliation: result });
  } catch (err) {
    next(err);
  }
});

