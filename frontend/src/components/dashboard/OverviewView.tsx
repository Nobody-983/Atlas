import React from 'react';
import {
  ArrowUpRight,
  Clock,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  FileUp,
  Send,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { AnalyticsOverview, Payment, PaymentRequest } from '../../lib/types.js';
import { formatDate, formatMinorUnits, truncateAccount } from '../../lib/formatters.js';
import { Badge } from '../common/Badge.js';
import { Button } from '../common/Button.js';

interface OverviewViewProps {
  analytics: AnalyticsOverview | null;
  pendingApprovals: PaymentRequest[];
  recentPayments: Payment[];
  onOpenUpload: () => void;
  onOpenPayout: () => void;
  onNavigateTab: (tab: string) => void;
  onSelectPayment: (p: Payment) => void;
  onRunReconciliation: () => void;
  isReconciling: boolean;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  analytics,
  pendingApprovals,
  recentPayments,
  onOpenUpload,
  onOpenPayout,
  onNavigateTab,
  onSelectPayment,
  onRunReconciliation,
  isReconciling,
}) => {
  // Aggregate completed amounts
  const completedStats = analytics?.paymentStatus.find((s) => s.status === 'completed');
  const processingStats = analytics?.paymentStatus.find((s) => s.status === 'processing');

  const totalPaidMinor = completedStats?.total_source_minor || '0';
  const processingMinor = processingStats?.total_source_minor || '0';
  const pendingApprovalsMinor = analytics?.pendingApprovals?.total_minor || '0';

  return (
    <div className="space-y-6">
      {/* Risk Alert Banner if any critical risks exist */}
      {analytics && Number(analytics.risks.critical_count) > 0 && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 dark:text-rose-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-rose-800 dark:text-rose-200 text-sm">
                ProofRail Alert: {analytics.risks.critical_count} Critical Payment Risks Detected
              </div>
              <div className="text-xs text-rose-600 dark:text-rose-300/80">
                Altered beneficiary banking details detected on pending payment requests. Authorization blocked until review.
              </div>
            </div>
          </div>
          <Button variant="danger" size="sm" onClick={() => onNavigateTab('proofrail')}>
            Inspect ProofRail
          </Button>
        </div>
      )}

      {/* Hero Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Paid */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#0D1117] border border-slate-200 dark:border-white/8 relative overflow-hidden shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span>Total Settled (YTD)</span>
            <span className="p-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">
            {formatMinorUnits(totalPaidMinor, 'NGN')}
          </div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Verified via Blaaiz Settlement</span>
          </div>
        </div>

        {/* In Processing */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#0D1117] border border-slate-200 dark:border-white/8 relative overflow-hidden shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span>In Processing (Relay)</span>
            <span className="p-1 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <RefreshCw className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-300 tabular-nums tracking-tight">
            {formatMinorUnits(processingMinor, 'NGN')}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            {processingStats?.count || 0} active relay dispatches
          </div>
        </div>

        {/* Awaiting Approval */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#0D1117] border border-slate-200 dark:border-white/8 relative overflow-hidden shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span>Awaiting Authorization</span>
            <span className="p-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-300 tabular-nums tracking-tight">
            {formatMinorUnits(pendingApprovalsMinor, 'NGN')}
          </div>
          <div className="text-xs text-amber-600 dark:text-amber-400/80 mt-2 flex items-center gap-1">
            <span>{analytics?.pendingApprovals?.count || 0} requests require dual signature</span>
          </div>
        </div>

        {/* Invoices Pending Review */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#0D1117] border border-slate-200 dark:border-white/8 relative overflow-hidden shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span>Outstanding Invoices</span>
            <span className="p-1 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-300 tabular-nums tracking-tight">
            {formatMinorUnits(analytics?.invoices?.outstanding_minor || '0', 'USD')}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            {analytics?.invoices?.total_invoices || 0} total invoices logged
          </div>
        </div>
      </div>

      {/* Quick Action Bar */}
      <div className="p-4 rounded-xl bg-slate-100 dark:bg-gradient-to-r dark:from-[#111620] dark:to-[#0D1117] border border-slate-200 dark:border-white/8 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Cross-Border Operations Hub</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Ingest invoices, evaluate ProofRail risk controls, and execute Blaaiz international payouts.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="secondary" size="sm" icon={<RefreshCw className={`w-3.5 h-3.5 ${isReconciling ? 'animate-spin' : ''}`} />} onClick={onRunReconciliation} isLoading={isReconciling}>
            Reconcile
          </Button>
          <Button variant="secondary" size="sm" icon={<FileUp className="w-3.5 h-3.5" />} onClick={onOpenUpload}>
            Upload Invoice
          </Button>
          <Button variant="primary" size="sm" icon={<Send className="w-3.5 h-3.5" />} onClick={onOpenPayout}>
            Initiate Payout
          </Button>
        </div>
      </div>

      {/* Two Column Layout: Pending Approvals & Corridor Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 cols): Pending Approvals Inbox */}
        <div className="lg:col-span-2 rounded-xl bg-white dark:bg-[#0D1117] border border-slate-200 dark:border-white/8 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Pending Payment Approvals</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Payments flagged by ProofRail awaiting authorized approval</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigateTab('approvals')}>
              View All Approvals
            </Button>
          </div>

          {pendingApprovals.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              No pending approvals. All payment requests are authorized.
            </div>
          ) : (
            <div className="space-y-2.5">
              {pendingApprovals.map((req) => (
                <div
                  key={req.id}
                  className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#161B22]/70 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate">{req.recipient_name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {req.recipient_country} • {req.destination_currency}
                      </span>
                      <Badge status={req.risk_level} />
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                      {req.purpose} • {truncateAccount(req.account_number)} ({req.bank_name})
                    </div>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <div className="font-bold text-slate-900 dark:text-white tabular-nums text-sm">
                      {formatMinorUnits(req.destination_amount_minor, req.destination_currency)}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
                      Charged: {formatMinorUnits(req.source_amount_minor, req.source_currency)}
                    </div>
                    <button
                      onClick={() => onNavigateTab('approvals')}
                      className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 font-medium mt-1 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Review Risk</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right (1 col): Payout Volume by Corridor */}
        <div className="rounded-xl bg-white dark:bg-[#0D1117] border border-slate-200 dark:border-white/8 p-5 shadow-xs">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Settlement Corridors</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Payout volume by destination currency</p>
          </div>

          <div className="space-y-3.5">
            {(!analytics?.corridors || analytics.corridors.length === 0) ? (
              <div className="py-6 text-center text-xs text-slate-500">
                No active settlement corridors yet.
              </div>
            ) : (
              analytics.corridors.map((c) => (
                <div key={c.destination_currency} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      {c.destination_currency} Corridor
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                      {formatMinorUnits(c.total_volume_minor, c.destination_currency)}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${Math.min(100, (Number(c.tx_count) / 5) * 100)}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-500 flex justify-between">
                    <span>{c.tx_count} transactions</span>
                    <span>Provider: Blaaiz</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Top Suppliers */}
          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/8">
            <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Top Suppliers
            </h4>
            <div className="space-y-2">
              {(!analytics?.topSuppliers || analytics.topSuppliers.length === 0) ? (
                <div className="py-3 text-center text-xs text-slate-500">
                  No supplier volume recorded yet.
                </div>
              ) : (
                analytics.topSuppliers.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-xs py-1">
                    <span className="text-slate-700 dark:text-slate-300 truncate max-w-[140px]">{s.name}</span>
                    <span className="font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                      {formatMinorUnits(s.total_volume_minor, 'USD')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Relay Payouts Table */}
      <div className="rounded-xl bg-white dark:bg-[#0D1117] border border-slate-200 dark:border-white/8 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Recent Payout Lifecycles</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Real-time status updates directly from Blaaiz infrastructure</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onNavigateTab('payments')}>
            View All Payouts
          </Button>
        </div>

        {recentPayments.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-slate-500 dark:text-slate-400 text-xs mb-3">No payments executed yet.</p>
            <Button variant="secondary" size="sm" onClick={onOpenPayout}>
              Initiate First Payout
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto min-w-0">
            <table className="w-full min-w-[650px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/8 text-slate-500 dark:text-slate-400 font-medium">
                  <th className="pb-3 font-semibold">Reference</th>
                  <th className="pb-3 font-semibold">Recipient</th>
                  <th className="pb-3 font-semibold">Corridor</th>
                  <th className="pb-3 font-semibold">Amount</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Initiated</th>
                  <th className="pb-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {recentPayments.slice(0, 5).map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                      {p.provider_reference}
                    </td>
                    <td className="py-3">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{p.recipient_name}</div>
                      <div className="text-[10px] text-slate-500">{truncateAccount(p.account_number)}</div>
                    </td>
                    <td className="py-3 font-mono text-slate-700 dark:text-slate-300">
                      {p.source_currency} → {p.destination_currency}
                    </td>
                    <td className="py-3 tabular-nums">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {formatMinorUnits(p.destination_amount_minor, p.destination_currency)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Rate: {typeof p.exchange_rate === 'number' ? p.exchange_rate.toFixed(6) : p.exchange_rate}
                      </div>
                    </td>
                    <td className="py-3">
                      <Badge status={p.status} />
                    </td>
                    <td className="py-3 text-slate-500 dark:text-slate-400">
                      {formatDate(p.initiated_at)}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => onSelectPayment(p)}
                        className="px-2 py-1 rounded bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer text-xs"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

