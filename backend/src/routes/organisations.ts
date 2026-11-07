import { Router } from 'express';
import { query } from '../db.js';
import { recordAuditEvent } from '../utils/audit.js';

export const organisationsRouter = Router();

// GET /api/v1/organisations/:id
organisationsRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const orgRes = await query(`SELECT * FROM organisations WHERE id = $1`, [id]);
    if (orgRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Organisation not found' });
    }

    const policyRes = await query(`SELECT * FROM organisation_policies WHERE organisation_id = $1`, [id]);
    const membersRes = await query(
      `SELECT u.id, u.full_name, u.email, om.role, om.joined_at
       FROM organisation_members om
       JOIN users u ON u.id = om.user_id
       WHERE om.organisation_id = $1`,
      [id]
    );

    res.json({
      success: true,
      organisation: orgRes.rows[0],
      policy: policyRes.rows[0] || null,
      members: membersRes.rows,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/organisations/:id/policy - Update policy settings
organisationsRouter.patch('/:id/policy', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      maxSinglePaymentMinor,
      maxDailyPaymentMinor,
      dualApprovalThresholdMinor,
      requireNewRecipientReview,
      blockUnverifiedCorridors,
    } = req.body;

    const updated = await query(
      `UPDATE organisation_policies
       SET max_single_payment_minor = COALESCE($1, max_single_payment_minor),
           max_daily_payment_minor = COALESCE($2, max_daily_payment_minor),
           dual_approval_threshold_minor = COALESCE($3, dual_approval_threshold_minor),
           require_new_recipient_review = COALESCE($4, require_new_recipient_review),
           block_unverified_corridors = COALESCE($5, block_unverified_corridors),
           updated_at = NOW()
       WHERE organisation_id = $6
       RETURNING *`,
      [
        maxSinglePaymentMinor,
        maxDailyPaymentMinor,
        dualApprovalThresholdMinor,
        requireNewRecipientReview,
        blockUnverifiedCorridors,
        id,
      ]
    );

    await recordAuditEvent({
      organisationId: id,
      resourceType: 'policy',
      resourceId: updated.rows[0].id,
      action: 'policy_updated',
      actorName: 'Admin',
      actorRole: 'admin',
      metadata: req.body,
    });

    res.json({ success: true, policy: updated.rows[0] });
  } catch (err) {
    next(err);
  }
});

