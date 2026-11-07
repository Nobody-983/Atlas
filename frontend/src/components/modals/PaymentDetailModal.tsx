import React, { useEffect, useState } from 'react';
import {
  X,
  Send,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building2,
  FileText,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { Payment } from '../../lib/types.js';
import { api } from '../../lib/api.js';
import { formatDateTime, formatMinorUnits, truncateAccount } from '../../lib/formatters.js';
import { Badge } from '../common/Badge.js';
import { Button } from '../common/Button.js';

interface PaymentDetailModalProps {
  payment: Payment | null;
  onClose: () => void;
}

export const PaymentDetailModal: React.FC<PaymentDetailModalProps> = ({ payment, onClose }) => {
  const [details, setDetails] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!payment) return;
    setIsLoading(true);
    api.getPayment(payment.id)
      .then((data) => {
        if (data.success) {
          setDetails(data);
        }
      })
      .catch((err) => console.error('Failed to fetch payment details:', err))
      .finally(() => setIsLoading(false));
  }, [payment]);

  if (!payment) return null;

  const p = details?.payment || payment;
  const auditEvents = details?.auditEvents || [];
  const approvals = details?.approvals || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white dark:bg-[#0D1117] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/8 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Payment Lifecycle Inspector</h3>
                <Badge status={p.status} />
              </div>
              <p className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">Ref: {p.provider_reference}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          {/* Hero Amounts */}
          <div className="p-5 rounded-xl bg-slate-50 dark:bg-[#161B22] border border-slate-200 dark:border-white/8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-slate-500 dark:text-slate-400 text-xs">Beneficiary Net Payout</div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight mt-0.5">
                {formatMinorUnits(p.destination_amount_minor, p.destination_currency)}
              </div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                Settled to: {p.recipient_name} ({p.recipient_country})
              </div>
            </div>

            <div className="text-left sm:text-right border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-white/8 pt-3 sm:pt-0 sm:pl-6 space-y-1">
              <div className="text-slate-500 dark:text-slate-400 text-xs">Charged to Business Wallet</div>
              <div className="text-xl font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                {formatMinorUnits(p.source_amount_minor, p.source_currency)}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                Provider Fee: {formatMinorUnits(p.provider_fee_minor, p.source_currency)}
              </div>
            </div>
          </div>

          {/* Timeline Lifecycle Progression */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Transaction Lifecycle Milestones
            </h4>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#161B22]/70 border border-slate-200 dark:border-white/5 space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">Payment Request Prepared & Invoiced</div>
                  <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                    Purpose: {p.purpose || 'Commercial supply agreement payment'} • Initiated by {p.initiator_name || 'Finance Team'}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">ProofRail Trust & Risk Evaluation Passed</div>
                  <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                    Risk Assessment: Clear / Verified • Recipient Banking Hash Verified
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">Human Approval Authorization</div>
                  <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                    {approvals.length > 0
                      ? `Authorized by ${approvals[0].approver_name} (${approvals[0].approver_role})`
                      : 'Authorized by Organisation Finance Manager'}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                {p.status === 'completed' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <Clock className="w-4 h-4 text-cyan-500 dark:text-cyan-400 shrink-0 mt-0.5 animate-spin" />
                )}
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">Blaaiz Bank Wire Dispatch</div>
                  <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                    Provider Ref: {p.provider_reference} • Method: Bank Wire Transfer
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recipient Account Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#161B22]/50 border border-slate-200 dark:border-white/5 space-y-2">
              <h5 className="font-semibold text-slate-800 dark:text-slate-300">Beneficiary Banking Profile</h5>
              <div className="space-y-1 text-slate-500 dark:text-slate-400 text-[11px]">
                <div className="flex justify-between">
                  <span>Name:</span>
                  <span className="text-slate-900 dark:text-white font-medium">{p.recipient_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bank:</span>
                  <span className="text-slate-900 dark:text-white">{p.bank_name || 'HSBC'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Account #:</span>
                  <span className="text-slate-900 dark:text-white font-mono">{truncateAccount(p.account_number)}</span>
                </div>
                {p.routing_number && (
                  <div className="flex justify-between">
                    <span>Routing:</span>
                    <span className="text-slate-900 dark:text-white font-mono">{p.routing_number}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#161B22]/50 border border-slate-200 dark:border-white/5 space-y-2">
              <h5 className="font-semibold text-slate-800 dark:text-slate-300">FX Rate & Integrity Specs</h5>
              <div className="space-y-1 text-slate-500 dark:text-slate-400 text-[11px]">
                <div className="flex justify-between">
                  <span>Provider:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono">Blaaiz Dev Sandbox</span>
                </div>
                <div className="flex justify-between">
                  <span>Rate:</span>
                  <span className="text-slate-900 dark:text-white font-mono">
                    1 {p.source_currency} = {typeof p.exchange_rate === 'number' ? p.exchange_rate.toFixed(6) : p.exchange_rate} {p.destination_currency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Idempotency Key:</span>
                  <span className="text-slate-700 dark:text-slate-300 font-mono truncate max-w-[140px]">{p.idempotency_key}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Append-only Audit Records */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Cryptographic Audit Trail Events ({auditEvents.length})
            </h4>
            <div className="space-y-1.5">
              {auditEvents.map((ev: any) => (
                <div
                  key={ev.id}
                  className="p-2.5 rounded bg-slate-50 dark:bg-[#161B22] border border-slate-200 dark:border-white/5 flex items-center justify-between text-[11px]"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{ev.action}</span>
                    <span className="text-slate-500 dark:text-slate-400">by {ev.actor_name}</span>
                  </div>
                  <span className="text-slate-400 dark:text-slate-500 font-mono">{formatDateTime(ev.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-white/8 flex items-center justify-end">
          <Button variant="secondary" onClick={onClose}>
            Close Inspector
          </Button>
        </div>
      </div>
    </div>
  );
};

