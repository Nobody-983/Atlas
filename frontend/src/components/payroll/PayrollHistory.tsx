import React, { useState } from 'react';
import {
  Calendar,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  FileText,
  DollarSign,
  Users,
} from 'lucide-react';
import { PayrollRun } from '../../lib/types.js';
import { formatDate, formatDateTime, formatMinorUnits } from '../../lib/formatters.js';
import { Badge } from '../common/Badge.js';
import { Button } from '../common/Button.js';

interface PayrollHistoryProps {
  runs: PayrollRun[];
  onSelectRun: (run: PayrollRun) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const PayrollHistory: React.FC<PayrollHistoryProps> = ({
  runs,
  onSelectRun,
  onRefresh,
  isRefreshing,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filtered = runs.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      (r.creator_name && r.creator_name.toLowerCase().includes(search.toLowerCase())) ||
      (r.approver_name && r.approver_name.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || r.status.toUpperCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Historical Payroll Runs & Settlement Records</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
              AUDITED RECORDS
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Immutable financial history of all corporate payroll batches, authorizations, and Blaaiz relay dispatches.
          </p>
        </div>

        <Button
          variant="secondary"
          icon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
          onClick={onRefresh}
          isLoading={isRefreshing}
        >
          Refresh
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-white dark:bg-[#0D1117] border border-slate-200 dark:border-white/8 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by run title, creator, or approver..."
            className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-slate-50 dark:bg-[#161B22] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-[#161B22] border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="ALL">All Statuses ({runs.length})</option>
            <option value="COMPLETED">Completed</option>
            <option value="APPROVED">Approved</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="DRAFT">Draft</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
      </div>

      {/* Runs Table */}
      <div className="rounded-xl bg-white dark:bg-[#0D1117] border border-slate-200 dark:border-white/8 overflow-hidden shadow-xs">
        {filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 mx-auto flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">No Payroll Runs Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {search || statusFilter !== 'ALL'
                ? 'No runs match your current filters. Try resetting the status or search.'
                : 'No payroll history available yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto min-w-0">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/8 text-slate-500 dark:text-slate-400 font-semibold bg-slate-50 dark:bg-[#161B22]/50">
                  <th className="py-3 px-4 font-semibold">Cycle Title & Dates</th>
                  <th className="py-3 px-4 font-semibold">Recipients</th>
                  <th className="py-3 px-4 font-semibold">Corporate Debit</th>
                  <th className="py-3 px-4 font-semibold">Provider Fees</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Audit Signature</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white text-sm">{r.title}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Pay Date: {formatDate(r.pay_date)} • Period: {formatDate(r.pay_period_start)} to {formatDate(r.pay_period_end)}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{r.recipient_count} workers</div>
                      <div className="text-[10px] text-slate-500">Multi-currency</div>
                    </td>

                    <td className="py-3.5 px-4 tabular-nums">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {formatMinorUnits(r.total_funding_minor, r.funding_currency)}
                      </div>
                      <div className="text-[10px] text-slate-500">Treasury withdrawal</div>
                    </td>

                    <td className="py-3.5 px-4 tabular-nums text-slate-700 dark:text-slate-300">
                      <div>{formatMinorUnits(r.total_fee_minor, r.funding_currency)}</div>
                      <div className="text-[10px] text-slate-500">Blaaiz FX & clearing</div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <Badge status={r.status} />
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                      <div>Created by {r.creator_name || 'Finance Team'}</div>
                      {r.approved_by && (
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Approved by {r.approver_name || 'Executive'}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
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
  );
};

