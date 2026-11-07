import React from 'react';
import {
  Briefcase,
  Users,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Plus,
  UserPlus,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Globe2,
} from 'lucide-react';
import { PayrollOverviewData, PayrollRun } from '../../lib/types.js';
import { formatDate, formatMinorUnits } from '../../lib/formatters.js';
import { Badge } from '../common/Badge.js';
import { Button } from '../common/Button.js';

interface PayrollOverviewProps {
  data: PayrollOverviewData | null;
  onOpenNewRun: () => void;
  onOpenNewWorker: () => void;
  onSelectRun: (run: PayrollRun) => void;
  onNavigateTab: (tab: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const PayrollOverview: React.FC<PayrollOverviewProps> = ({
  data,
  onOpenNewRun,
  onOpenNewWorker,
  onSelectRun,
  onNavigateTab,
  onRefresh,
  isRefreshing,
}) => {
  const upcoming = data?.upcomingRun;
  const settled = data?.settledStats;
  const workforce = data?.workforce;
  const exposure = data?.currencyExposure || [];
  const recentRuns = data?.recentRuns || [];

  return (
    <div className="space-y-6">
      {/* Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Global Payroll & Contractor Disbursements</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
              BLAAIZ RELAY POWERED
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Compliant international payroll, guaranteed live FX pricing, multi-currency batch disbursements, and ProofRail fraud guard.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
            onClick={onRefresh}
            isLoading={isRefreshing}
          >
            Refresh
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<UserPlus className="w-3.5 h-3.5" />}
            onClick={onOpenNewWorker}
          >
            Onboard Member
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={onOpenNewRun}
          >
            Create Payroll Run
          </Button>
        </div>
      </div>

      {/* Hero Active Run Banner */}
      {upcoming ? (
        <div className="p-5 rounded-2xl bg-white dark:bg-gradient-to-r dark:from-[#111827] dark:via-[#0D1117] dark:to-[#161B22] border border-emerald-500/30 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 uppercase tracking-wider font-semibold">
                  Active Payroll Obligation
                </span>
                <Badge status={upcoming.status} />
                {upcoming.risk_status === 'review_required' && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 flex items-center gap-1 font-semibold">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Risk Review Required</span>
                  </span>
                )}
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{upcoming.title}</h3>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  <span>Scheduled Pay Date: <strong className="text-slate-800 dark:text-slate-200">{formatDate(upcoming.pay_date)}</strong></span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  <span>Recipients: <strong className="text-slate-800 dark:text-slate-200">{upcoming.recipient_count} global workers</strong></span>
                </span>
                <span>•</span>
                <span>Created by <strong className="text-slate-800 dark:text-slate-200">{upcoming.creator_name || 'Finance Team'}</strong></span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-6 lg:border-l lg:border-slate-200 dark:lg:border-white/10 lg:pl-6">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Funding Required</div>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight mt-0.5">
                  {formatMinorUnits(upcoming.total_funding_minor, upcoming.funding_currency)}
                </div>
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400/90 font-mono mt-0.5">
                  Includes fees: {formatMinorUnits(upcoming.total_fee_minor, upcoming.funding_currency)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="primary" size="md" onClick={() => onSelectRun(upcoming)}>
                  <span>Review & Manage Run</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-white dark:bg-[#0D1117] border border-slate-200 dark:border-white/8 text-center space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 mx-auto flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">No Active Payroll Scheduled</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              All previous cycles are settled. Ready to start the next pay period for your global team?
            </p>
          </div>
          <Button variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={onOpenNewRun}>
            Start New Payroll Run
          </Button>
        </div>
      )}

      {/* KPI Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Settled */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#0D1117] border border-slate-200 dark:border-white/8 relative overflow-hidden shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>Settled Payroll Volume</span>
            <span className="p-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">
            {formatMinorUnits(settled?.total_funding_paid_minor || '0', 'NGN')}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>{settled?.completed_runs || 0} batches ({settled?.total_disbursements_count || 0} transfers)</span>
          </div>
        </div>

        {/* Global Workforce Headcount */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#0D1117] border border-slate-200 dark:border-white/8 relative overflow-hidden shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>Active Workforce</span>
            <span className="p-1 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <Users className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-300 tabular-nums tracking-tight">
            {workforce?.total_active_workers || 0} workers
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
            {workforce?.employee_count || 0} Employees • {workforce?.contractor_count || 0} Contractors
          </div>
        </div>

        {/* Upcoming Run Corridors */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#0D1117] border border-slate-200 dark:border-white/8 relative overflow-hidden shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>Disbursement Corridors</span>
            <span className="p-1 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Globe2 className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-300 tabular-nums tracking-tight">
            {exposure.length} Active Corridors
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 truncate">
            {exposure.length > 0 ? exposure.map((e) => e.destination_currency).join(', ') : 'No active cycle'}
          </div>
        </div>

        {/* ProofRail Compliance */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#0D1117] border border-slate-200 dark:border-white/8 relative overflow-hidden shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>Fraud & Policy Guard</span>
            <span className="p-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-300 tabular-nums tracking-tight">
            Protected
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1">
            <span>Dual approval & bank change lock</span>
          </div>
        </div>
      </div>

      {/* Two Column Grid: Upcoming Currency Exposure & Recent Payroll Cycles */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (1 col): Currency Exposure & Provider Fees */}
        <div className="rounded-xl bg-white dark:bg-[#0D1117] border border-slate-200 dark:border-white/8 p-5 space-y-4 shadow-xs">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Currency Exposure Breakdown</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {upcoming ? `Net payout liability for ${upcoming.title}` : 'No active batch cycle'}
            </p>
          </div>

          {exposure.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No upcoming foreign currency obligations.
            </div>
          ) : (
            <div className="space-y-3">
              {exposure.map((exp) => (
                <div key={exp.destination_currency} className="p-3 rounded-lg bg-slate-50 dark:bg-[#161B22] border border-slate-200 dark:border-white/5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      {exp.destination_currency} Payout Pool
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                      {formatMinorUnits(exp.total_destination_minor, exp.destination_currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-white/5">
                    <span>{exp.recipient_count} recipients</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      Funded: {formatMinorUnits(exp.total_source_minor, 'NGN')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column (2 cols): Recent Payroll Runs Table */}
        <div className="lg:col-span-2 rounded-xl bg-white dark:bg-[#0D1117] border border-slate-200 dark:border-white/8 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Payroll Batches & Settlement History</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Audit-tracked payment execution via Blaaiz Relay</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigateTab('payroll-history')}>
              View All Runs
            </Button>
          </div>

          {recentRuns.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No payroll runs recorded yet. Click "Create Payroll Run" to initiate your first cycle.
            </div>
          ) : (
            <div className="overflow-x-auto min-w-0">
              <table className="w-full min-w-[620px] text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/8 text-slate-500 dark:text-slate-400 font-medium">
                    <th className="pb-3 font-semibold">Cycle Title</th>
                    <th className="pb-3 font-semibold">Pay Date</th>
                    <th className="pb-3 font-semibold">Recipients</th>
                    <th className="pb-3 font-semibold">Total Funding</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {recentRuns.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 font-medium text-slate-900 dark:text-white">
                        <div>{r.title}</div>
                        <div className="text-[10px] text-slate-500">Period: {formatDate(r.pay_period_start)} to {formatDate(r.pay_period_end)}</div>
                      </td>
                      <td className="py-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {formatDate(r.pay_date)}
                      </td>
                      <td className="py-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {r.recipient_count} workers
                      </td>
                      <td className="py-3 tabular-nums font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {formatMinorUnits(r.total_funding_minor, r.funding_currency)}
                      </td>
                      <td className="py-3 whitespace-nowrap">
                        <Badge status={r.status} />
                      </td>
                      <td className="py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => onSelectRun(r)}
                          className="px-2.5 py-1 rounded bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer text-xs"
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
    </div>
  );
};

