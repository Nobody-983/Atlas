import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Building2,
  DollarSign,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { PaymentRequest } from '../../lib/types.js';
import { formatDate, formatMinorUnits, truncateAccount } from '../../lib/formatters.js';
import { Badge } from '../common/Badge.js';
import { Button } from '../common/Button.js';

interface ApprovalInboxProps {
  requests: PaymentRequest[];
  onApprove: (req: PaymentRequest) => void;
  onReject: (req: PaymentRequest) => void;
  onViewInvoice: (invoiceId: string) => void;
}

export const ApprovalInbox: React.FC<ApprovalInboxProps> = ({
  requests,
  onApprove,
  onReject,
  onViewInvoice,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Payment Authorization Inbox</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-semibold">
              HUMAN-IN-THE-LOOP APPROVAL
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Every monetary movement requires explicit, authenticated human authorization. AI and automated scripts never possess unrestricted authority to transfer funds.
          </p>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="p-8 sm:p-12 text-center rounded-xl bg-white dark:bg-[#0D1117] border border-slate-200 dark:border-white/8 space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">All Payments Authorized</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            There are no pending approval requests awaiting your review. New payment requests submitted by your team will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div
              key={req.id}
              className={`p-5 rounded-xl bg-white dark:bg-[#0D1117] border transition-all shadow-xs ${
                req.risk_level === 'blocked'
                  ? 'border-rose-300 dark:border-rose-500/40 bg-rose-50/50 dark:bg-rose-950/10'
                  : req.risk_level === 'review_required'
                  ? 'border-amber-300 dark:border-amber-500/30'
                  : 'border-slate-200 dark:border-white/8'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                {/* Left: Recipient and Purpose */}
                <div className="space-y-2 max-w-xl min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-bold text-slate-900 dark:text-white">{req.recipient_name}</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {req.recipient_country} • {req.destination_currency}
                    </span>
                    <Badge status={req.risk_level} />
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    Purpose: <span className="text-slate-900 dark:text-white">{req.purpose}</span>
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>{req.bank_name}</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">({truncateAccount(req.account_number)})</span>
                    </div>

                    {req.invoice_number && (
                      <button
                        onClick={() => req.invoice_id && onViewInvoice(req.invoice_id)}
                        className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 flex items-center gap-1 cursor-pointer font-medium"
                      >
                        <span>Invoice #{req.invoice_number}</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}

                    <div>Prepared by: <span className="text-slate-700 dark:text-slate-300">{req.creator_name || 'Finance Team'}</span></div>
                  </div>

                  {/* Warning banner if flagged */}
                  {req.flag_reason && (
                    <div className="p-2.5 rounded bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400 mt-0.5" />
                      <div>
                        <span className="font-semibold">Security Warning:</span> {req.flag_reason}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Amounts, FX Quote & Actions */}
                <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 sm:gap-6 shrink-0">
                  <div className="text-left sm:text-right space-y-1">
                    <div className="text-xs text-slate-500 dark:text-slate-400">Recipient Receives</div>
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {formatMinorUnits(req.destination_amount_minor, req.destination_currency)}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      Debit Amount: <span className="font-semibold text-slate-900 dark:text-white">{formatMinorUnits(req.source_amount_minor, req.source_currency)}</span>
                    </div>
                    {req.exchange_rate && (
                      <div className="text-[10px] text-slate-500 font-mono">
                        Rate: 1 {req.source_currency} = {typeof req.exchange_rate === 'number' ? req.exchange_rate.toFixed(6) : req.exchange_rate} {req.destination_currency}
                      </div>
                    )}
                  </div>

                  {/* Decision Buttons */}
                  <div className="flex items-center gap-2">
                    <Button variant="danger" size="sm" icon={<XCircle className="w-4 h-4" />} onClick={() => onReject(req)}>
                      Reject
                    </Button>

                    <Button
                      variant="primary"
                      size="sm"
                      icon={<CheckCircle2 className="w-4 h-4" />}
                      disabled={req.risk_level === 'blocked'}
                      onClick={() => onApprove(req)}
                    >
                      Authorize Payout
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

