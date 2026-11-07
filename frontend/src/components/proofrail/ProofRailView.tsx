import React from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Lock,
  Eye,
  CheckCircle2,
  FileCheck,
  Building,
  Sliders,
  AlertOctagon,
} from 'lucide-react';
import { OrganisationPolicy, Recipient } from '../../lib/types.js';
import { formatMinorUnits } from '../../lib/formatters.js';
import { Button } from '../common/Button.js';
import { Badge } from '../common/Badge.js';

interface ProofRailViewProps {
  policy: OrganisationPolicy | null;
  flaggedRecipients: Recipient[];
  onReviewRecipientChange: (r: Recipient) => void;
  onOpenPolicyConfig: () => void;
}

export const ProofRailView: React.FC<ProofRailViewProps> = ({
  policy,
  flaggedRecipients,
  onReviewRecipientChange,
  onOpenPolicyConfig,
}) => {
  const activeRules = [
    {
      code: 'RECIPIENT_BANK_CHANGED',
      name: 'Recipient Bank Detail Change Protection',
      severity: 'CRITICAL',
      status: 'ACTIVE',
      desc: 'Detects if vendor banking details changed within 7 days or after prior successful payouts. Requires secondary telephone callback verification.',
    },
    {
      code: 'DUPLICATE_INVOICE_NUMBER',
      name: 'Duplicate Invoice & Hash Detection',
      severity: 'CRITICAL',
      status: 'ACTIVE',
      desc: 'Compares invoice numbers and SHA-256 document payloads to block double-billing across accounts payable.',
    },
    {
      code: 'INVOICE_RECIPIENT_MISMATCH',
      name: 'Invoice Remittance vs Beneficiary Account Cross-Check',
      severity: 'CRITICAL',
      status: 'ACTIVE',
      desc: 'Cross-references bank account details printed on the invoice against the selected Blaaiz payout beneficiary.',
    },
    {
      code: 'UNUSUAL_AMOUNT',
      name: 'Historical Anomaly & Spike Detector',
      severity: 'WARNING',
      status: 'ACTIVE',
      desc: 'Flags transactions exceeding 200% of vendor historical payment moving average for executive review.',
    },
    {
      code: 'POLICY_LIMIT_ENFORCEMENT',
      name: 'Single & Daily Hard Ceiling Enforcement',
      severity: 'BLOCKING',
      status: 'ACTIVE',
      desc: 'Backend gatekeeper automatically blocks any transaction exceeding the configured organisation threshold.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>ProofRail Trust & Payment Control Engine</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
              MODULE TWO
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Deterministic rule-based payment gatekeeper protecting African enterprises from invoice fraud and altered bank details.
          </p>
        </div>

        <Button variant="secondary" icon={<Sliders className="w-4 h-4" />} onClick={onOpenPolicyConfig}>
          Configure Policies
        </Button>
      </div>

      {/* Recipient Change Protection Alert Box (if any flagged) */}
      {flaggedRecipients.length > 0 && (
        <div className="p-5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/40 shadow-xs">
          <div className="flex items-center gap-2.5 text-rose-800 dark:text-rose-300 font-semibold text-sm mb-2">
            <AlertOctagon className="w-5 h-5 text-rose-500 dark:text-rose-400 shrink-0" />
            <span>Active Recipient Change Protection Alerts ({flaggedRecipients.length})</span>
          </div>
          <p className="text-xs text-rose-700 dark:text-rose-200/80 mb-4">
            ProofRail flagged the following beneficiaries because their bank routing details were altered recently. Payments to these accounts are suspended until secondary out-of-band verification is approved.
          </p>

          <div className="space-y-3">
            {flaggedRecipients.map((r) => (
              <div
                key={r.id}
                className="p-3.5 rounded-lg bg-white dark:bg-[#0D1117]/80 border border-rose-200 dark:border-rose-500/30 flex flex-wrap items-center justify-between gap-4 shadow-xs"
              >
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white text-sm">{r.display_name}</div>
                  <div className="text-xs text-rose-600 dark:text-rose-300 mt-0.5">{r.flag_reason}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    Beneficiary Account: {r.account_number} ({r.bank_name})
                  </div>
                </div>

                <Button variant="danger" size="sm" onClick={() => onReviewRecipientChange(r)}>
                  Review & Clear Flag
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Organisation Policies Telemetry */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-[#0D1117] border border-slate-200 dark:border-white/8 shadow-xs">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Max Single Payment Limit</div>
          <div className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
            {policy ? formatMinorUnits(policy.max_single_payment_minor, 'NGN') : '—'}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
            <Lock className="w-3 h-3" />
            <span>Enforced by Backend Validator</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#0D1117] border border-slate-200 dark:border-white/8 shadow-xs">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Daily Aggregate Limit</div>
          <div className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
            {policy ? formatMinorUnits(policy.max_daily_payment_minor, 'NGN') : '—'}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Rolling 24-hour volume cap</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#0D1117] border border-slate-200 dark:border-white/8 shadow-xs">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Dual Approval Threshold</div>
          <div className="text-xl font-bold text-amber-600 dark:text-amber-300 tabular-nums">
            {policy ? formatMinorUnits(policy.dual_approval_threshold_minor, 'NGN') : '—'}
          </div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400/80 mt-1">Requires 2 independent signers</div>
        </div>
      </div>

      {/* Rule Heuristics Engine Table */}
      <div className="rounded-xl bg-white dark:bg-[#0D1117] border border-slate-200 dark:border-white/8 p-5 shadow-xs">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Deterministic Verification Rules</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Rules evaluated in real-time before any payment request is permitted to reach the Blaaiz relay engine.
          </p>
        </div>

        <div className="space-y-3">
          {activeRules.map((rule) => (
            <div
              key={rule.code}
              className="p-4 rounded-lg bg-slate-50 dark:bg-[#161B22]/60 border border-slate-200 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-900 dark:text-white text-xs">{rule.name}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {rule.code}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      rule.severity === 'CRITICAL' || rule.severity === 'BLOCKING'
                        ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                        : 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {rule.severity}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">{rule.desc}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {rule.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

