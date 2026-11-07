import { Router } from 'express';
import { verifyBlaaizWebhookSignature } from '../blaaiz/webhook.js';
import { config } from '../config.js';
import { query, withTransaction } from '../db.js';
import { recordAuditEvent } from '../utils/audit.js';

export const webhooksRouter = Router();

// POST /api/v1/webhooks/blaaiz - Secure Blaaiz Webhook Handler
webhooksRouter.post('/blaaiz', async (req, res) => {
  const signatureHeader = req.headers['x-blaaiz-signature'] as string;
  const rawBody = (req as any).rawBody || JSON.stringify(req.body);

  // 1. Signature Verification
  const isSignatureValid = verifyBlaaizWebhookSignature(
    signatureHeader,
    rawBody,
    config.blaaiz.webhookSecret
  );

  const payload = req.body || {};
  const eventType = payload.event || 'unknown';
  const data = payload.data || {};
  const reference = data.reference;

  // In test/demo mode, if emulator is active, allow simulation events
  const allowUnsignedInDev = config.blaaiz.enableEmulator && config.nodeEnv !== 'production';

  if (!isSignatureValid && !allowUnsignedInDev) {
    console.warn('[Blaaiz Webhook Rejected]: Invalid HMAC signature header');
    return res.status(401).json({ success: false, error: 'Invalid webhook signature' });
  }

  try {
    let matchedPaymentId: string | null = null;
    let matchedOrgId: string | null = null;

    if (reference) {
      const pRes = await query(
        `SELECT id, organisation_id, status FROM payments WHERE provider_reference = $1 OR idempotency_key = $1`,
        [reference]
      );
      if (pRes.rows.length > 0) {
        matchedPaymentId = pRes.rows[0].id;
        matchedOrgId = pRes.rows[0].organisation_id;
      }
    }

    // 2. Persist Webhook Event in payment_provider_events
    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO payment_provider_events
         (payment_id, provider, event_type, provider_reference, payload, signature_header, is_signature_valid, processing_status)
         VALUES ($1, 'blaaiz', $2, $3, $4, $5, $6, 'processed')`,
        [
          matchedPaymentId,
          eventType,
          reference || null,
          JSON.stringify(payload),
          signatureHeader || 'dev_mock_signature',
          isSignatureValid,
        ]
      );

      // 3. Update Payment Status Transactionally
      if (matchedPaymentId) {
        let newStatus: string | null = null;
        if (eventType === 'payout.completed') newStatus = 'completed';
        else if (eventType === 'payout.failed') newStatus = 'failed';
        else if (eventType === 'payout.processing') newStatus = 'processing';

        if (newStatus) {
          const completedAtClause = newStatus === 'completed' ? ', completed_at = NOW()' : '';
          await client.query(
            `UPDATE payments 
             SET status = $1,
                 updated_at = NOW()
                 ${completedAtClause}
             WHERE id = $2`,
            [newStatus, matchedPaymentId]
          );
        }
      }
    });

    if (matchedOrgId && matchedPaymentId) {
      await recordAuditEvent({
        organisationId: matchedOrgId,
        resourceType: 'payment',
        resourceId: matchedPaymentId,
        action: `webhook_${eventType}`,
        actorName: 'Blaaiz Webhook Service',
        actorRole: 'provider',
        metadata: { eventType, reference, data },
      });
    }

    res.json({ success: true, message: 'Webhook processed successfully' });
  } catch (err: any) {
    console.error('[Blaaiz Webhook Error]:', err);
    res.status(500).json({ success: false, error: 'Internal webhook processing failure' });
  }
});
