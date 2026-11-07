import { query } from '../db.js';

export interface AuditLogParams {
  organisationId: string;
  resourceType: 'invoice' | 'recipient' | 'quote' | 'payment_request' | 'payment' | 'approval' | 'policy' | 'reconciliation' | 'payroll_run';
  resourceId: string;
  action: string;
  actorId?: string;
  actorName: string;
  actorRole: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
}

export async function recordAuditEvent(params: AuditLogParams): Promise<void> {
  try {
    await query(
      `INSERT INTO payment_audit_events 
       (organisation_id, resource_type, resource_id, action, actor_id, actor_name, actor_role, metadata, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        params.organisationId,
        params.resourceType,
        params.resourceId,
        params.action,
        params.actorId || null,
        params.actorName,
        params.actorRole,
        JSON.stringify(params.metadata || {}),
        params.ipAddress || null,
      ]
    );
  } catch (err) {
    // Non-blocking for primary path, but log as critical error
    console.error('[CRITICAL] Failed to write to immutable audit log:', err);
  }
}

