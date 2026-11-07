import React, { useState } from 'react';
import { History, ShieldCheck, RefreshCw, CheckCircle2, AlertTriangle, Filter } from 'lucide-react';
import { AuditEvent } from '../../lib/types.js';
import { formatDateTime } from '../../lib/formatters.js';
import { Button } from '../common/Button.js';

interface AuditViewProps {
  auditEvents: AuditEvent[];
  onRunReconciliation: () => void;
  isReconciling: boolean;
  reconciliationSummary: any;
}

export const AuditView: React.FC<AuditViewProps> = ({
  auditEvents,
  onRunReconciliation,
  isReconciling,
  reconciliationSummary,
}) => {
  const [filterType, setFilterType] = useState('ALL');

  const filtered = auditEvents.filter((ev) => {
    return filterType === 'ALL' || ev.resource_type.toUpperCase() === filterType;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Audit Trail & Ledger Reconciliation</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
              APPEND-ONLY IMMUTABILITY
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Complete cryptographic audit log of invoice extractions, risk overrides, approvals, and Blaaiz payout settlements.
          </p>
        </div>

        <Button
          variant="secondary"
          icon={<RefreshCw className={`w-3.5 h-3.5 ${isReconciling ? 'animate-spin' : ''}`} />}
          onClick={onRunReconciliation}
          isLoading={isReconciling}
        >
          Run Full Reconciliation
        </Button>
      </div>

      {/* Reconciliation Summary Card if triggered */}
      {reconciliationSummary && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-white text-sm">
                Ledger Reconciliation Completed
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">
                Inspected {reconciliationSummary.recordsInspected} transactions • {reconciliationSummary.discrepanciesDetected} discrepancies detected • {reconciliationSummary.discrepanciesResolved} automatically resolved against Blaaiz source of truth.
              </div>
            </div>
          </div>
          <span className="text-xs font-mono text-emerald-700 dark:text-emerald-400 font-semibold px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 shrink-0">
            LEDGER SYNCED
          </span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="p-4 rounded-xl bg-white dark:bg-[#0D1117] border border-slate-200 dark:border-white/8 flex items-center gap-2 overflow-x-auto min-w-0 scrollbar-none shadow-xs">
        <Filter className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
        <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">Resource:</span>
        {['ALL', 'PAYMENT', 'INVOICE', 'RECIPIENT', 'APPROVAL', 'POLICY', 'RECONCILIATION'].map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`shrink-0 px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-colors whitespace-nowrap ${
              filterType === type
                ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 font-semibold'
                : 'bg-slate-100 dark:bg-[#161B22] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/5'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Audit Log Stream */}
      <div className="rounded-xl bg-white dark:bg-[#0D1117] border border-slate-200 dark:border-white/8 p-5 shadow-xs">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No immutable audit events recorded yet for this workspace. Actions taken across invoices, payouts, and compliance policies are logged here in real time.
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((ev) => (
              <div
                key={ev.id}
                className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#161B22]/70 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 uppercase">
                      {ev.action.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {ev.resource_type}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      by <span className="text-slate-800 dark:text-slate-200 font-medium">{ev.actor_name}</span> ({ev.actor_role})
                    </span>
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px] truncate max-w-full sm:max-w-2xl">
                    Metadata: {JSON.stringify(ev.metadata)}
                  </div>
                </div>

                <div className="text-left sm:text-right text-slate-400 dark:text-slate-500 font-mono text-[11px] shrink-0">
                  {formatDateTime(ev.created_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

