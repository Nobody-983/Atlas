import { blaaizClient } from '../blaaiz/client.js';
import { query, withTransaction } from '../db.js';
import { recordAuditEvent } from '../utils/audit.js';

export interface ReconciliationResult {
  runId: string;
  organisationId: string;
  recordsInspected: number;
  discrepanciesDetected: number;
  discrepanciesResolved: number;
  staleProcessingCount: number;
  missingWebhooksCount: number;
  details: Array<{
    paymentId: string;
    reference: string;
    internalStatus: string;
    providerStatus: string;
    resolution: string;
  }>;
}

export class ReconciliationWorker {
  public static async runReconciliation(
    organisationId: string,
    runType: 'automated' | 'manual' = 'manual'
  ): Promise<ReconciliationResult> {
    const details: ReconciliationResult['details'] = [];
    let discrepanciesDetected = 0;
    let discrepanciesResolved = 0;
    let staleProcessingCount = 0;
    let missingWebhooksCount = 0;

    // 1. Fetch pending and processing transactions older than 15 minutes
    const paymentsRes = await query(
      `SELECT p.id, p.provider_reference, p.status, p.initiated_at,
              (SELECT COUNT(*) FROM payment_provider_events e WHERE e.payment_id = p.id) as webhook_count
       FROM payments p
       WHERE p.organisation_id = $1
         AND p.status IN ('processing', 'pending')
       ORDER BY p.initiated_at ASC`,
      [organisationId]
    );

    const recordsInspected = paymentsRes.rows.length;

    for (const row of paymentsRes.rows) {
      const paymentId = row.id;
      const ref = row.provider_reference;
      const internalStatus = row.status;
      const webhookCount = parseInt(row.webhook_count, 10);
      const ageMinutes = (Date.now() - new Date(row.initiated_at).getTime()) / (1000 * 60);

      // Check if missing webhook for aged transaction (>20 mins)
      if (ageMinutes > 20 && webhookCount === 0) {
        missingWebhooksCount++;
      }

      if (ageMinutes > 15) {
        staleProcessingCount++;
      }

      // Query provider for source of truth
      try {
        const providerState = await blaaizClient.getPayoutStatus(ref);
        if (providerState.status && providerState.status !== internalStatus) {
          discrepanciesDetected++;
          
          // Reconcile status to provider state
          await withTransaction(async (client) => {
            const completedClause = providerState.status === 'completed' ? ', completed_at = NOW()' : '';
            await client.query(
              `UPDATE payments 
               SET status = $1, 
                   reconciled_at = NOW(),
                   updated_at = NOW()
                   ${completedClause}
               WHERE id = $2`,
              [providerState.status, paymentId]
            );
          });

          discrepanciesResolved++;
          details.push({
            paymentId,
            reference: ref,
            internalStatus,
            providerStatus: providerState.status,
            resolution: `Synced internal status from '${internalStatus}' to '${providerState.status}'.`,
          });
        }
      } catch (err: any) {
        console.error(`[Reconciliation] Error inspecting reference ${ref}:`, err.message);
      }
    }

    // Record the run in reconciliation_runs table
    const runRes = await query(
      `INSERT INTO reconciliation_runs
       (organisation_id, run_type, records_inspected, discrepancies_detected, discrepancies_resolved, summary_report)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        organisationId,
        runType,
        recordsInspected,
        discrepanciesDetected,
        discrepanciesResolved,
        JSON.stringify({
          staleProcessingCount,
          missingWebhooksCount,
          details,
        }),
      ]
    );

    const runId = runRes.rows[0].id;

    await recordAuditEvent({
      organisationId,
      resourceType: 'reconciliation',
      resourceId: runId,
      action: 'reconciliation_completed',
      actorName: 'Reconciliation Engine',
      actorRole: 'system',
      metadata: {
        recordsInspected,
        discrepanciesDetected,
        discrepanciesResolved,
      },
    });

    return {
      runId,
      organisationId,
      recordsInspected,
      discrepanciesDetected,
      discrepanciesResolved,
      staleProcessingCount,
      missingWebhooksCount,
      details,
    };
  }
}
