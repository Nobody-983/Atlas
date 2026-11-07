import React from 'react';
import { UserCheck, Plus, AlertTriangle, Building2, Globe, Edit, ShieldCheck } from 'lucide-react';
import { Recipient } from '../../lib/types.js';
import { truncateAccount } from '../../lib/formatters.js';
import { Badge } from '../common/Badge.js';
import { Button } from '../common/Button.js';

interface RecipientsViewProps {
  recipients: Recipient[];
  onOpenCreateRecipient: () => void;
  onOpenEditBank: (r: Recipient) => void;
  onClearFlag: (r: Recipient) => void;
}

export const RecipientsView: React.FC<RecipientsViewProps> = ({
  recipients,
  onOpenCreateRecipient,
  onOpenEditBank,
  onClearFlag,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Recipient & Beneficiary Management</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
              PROOFRAIL PROTECTED
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Verified international payout endpoints, banking corridors, and change protection monitoring.
          </p>
        </div>

        <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={onOpenCreateRecipient}>
          Add Recipient
        </Button>
      </div>

      {recipients.length === 0 ? (
        <div className="py-16 text-center rounded-xl bg-white dark:bg-[#0D1117] border border-slate-200 dark:border-white/8 p-8 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mx-auto mb-4">
            <UserCheck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">No payout recipients registered</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-6">
            Register international beneficiary banking profiles. All destination accounts are cryptographically protected by ProofRail verification.
          </p>
          <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={onOpenCreateRecipient}>
            Add First Recipient
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipients.map((r) => (
          <div
            key={r.id}
            className={`p-5 rounded-xl bg-white dark:bg-[#0D1117] border transition-all flex flex-col justify-between shadow-xs ${
              r.is_flagged ? 'border-rose-300 dark:border-rose-500/40 bg-rose-50/50 dark:bg-rose-950/10' : 'border-slate-200 dark:border-white/8 hover:border-slate-300 dark:hover:border-white/15'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-[#161B22] border border-slate-200 dark:border-white/10 flex items-center justify-center text-cyan-600 dark:text-cyan-400 font-bold">
                  {r.display_name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge status={r.verification_level} />
                  {r.is_flagged && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/40 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      FLAGGED
                    </span>
                  )}
                </div>
              </div>

              <h3 className="font-semibold text-slate-900 dark:text-white text-sm line-clamp-1">{r.display_name}</h3>
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Globe className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                <span>
                  {r.country} • {r.currency} • {r.payout_method.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              {/* Bank Account Details */}
              <div className="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-[#161B22]/80 border border-slate-200 dark:border-white/5 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    <span>Bank:</span>
                  </span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{r.bank_name || '—'}</span>
                </div>

                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span>Account #:</span>
                  <span className="font-mono text-slate-900 dark:text-white">{truncateAccount(r.account_number)}</span>
                </div>

                {r.routing_number && (
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span>Routing (ACH):</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{r.routing_number}</span>
                  </div>
                )}
                {r.swift_bic && (
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span>SWIFT:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{r.swift_bic}</span>
                  </div>
                )}
              </div>

              {/* Warning Text */}
              {r.flag_reason && (
                <div className="mt-3 p-2 rounded bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-[11px] text-rose-700 dark:text-rose-300">
                  {r.flag_reason}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-white/8 flex items-center justify-between">
              {r.is_flagged ? (
                <Button variant="danger" size="sm" onClick={() => onClearFlag(r)}>
                  Resolve Flag
                </Button>
              ) : (
                <button
                  onClick={() => onOpenEditBank(r)}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Edit className="w-3 h-3" />
                  <span>Update Bank Details</span>
                </button>
              )}

              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                Created: {new Date(r.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
        </div>
      )}
    </div>
  );
};

