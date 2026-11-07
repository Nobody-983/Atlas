import React, { useState } from 'react';
import {
  Send,
  Search,
  Filter,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
} from 'lucide-react';
import { Payment } from '../../lib/types.js';
import { formatDate, formatDateTime, formatMinorUnits, truncateAccount } from '../../lib/formatters.js';
import { Badge } from '../common/Badge.js';
import { Button } from '../common/Button.js';

interface RelayPaymentsViewProps {
  payments: Payment[];
  onOpenNewPayout: () => void;
  onSelectPayment: (p: Payment) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const RelayPaymentsView: React.FC<RelayPaymentsViewProps> = ({
  payments,
  onOpenNewPayout,
  onSelectPayment,
  onRefresh,
  isRefreshing,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filtered = payments.filter((p) => {
    const matchesSearch =
      p.provider_reference.toLowerCase().includes(search.toLowerCase()) ||
      p.recipient_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.source_currency.toLowerCase().includes(search.toLowerCase()) ||
      p.destination_currency.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || p.status.toUpperCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Relay International Payment Engine</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
              BLAAIZ INFRASTRUCTURE
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time cross-border payouts, executable FX quotes, idempotency protection, and multi-currency settlement.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="secondary" icon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />} onClick={onRefresh} isLoading={isRefreshing}>
            Sync
          </Button>
          <Button variant="primary" icon={<Send className="w-4 h-4" />} onClick={onOpenNewPayout}>
            Initiate Payout
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-white dark:bg-[#0D1117] border border-slate-200 dark:border-white/8 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search provider ref, recipient, or currency..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-slate-50 dark:bg-[#161B22] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span className="text-xs text-slate-500 dark:text-slate-400">Status:</span>
          {['ALL', 'PROCESSING', 'COMPLETED', 'FAILED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
                statusFilter === st
                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 font-semibold'
                  : 'bg-slate-100 dark:bg-[#161B22] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/5'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Payouts Table */}
      <div className="rounded-xl bg-white dark:bg-[#0D1117] border border-slate-200 dark:border-white/8 overflow-hidden shadow-xs">
        <div className="overflow-x-auto min-w-0">
          <table className="w-full min-w-[850px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/8 text-slate-500 dark:text-slate-400 font-semibold bg-slate-50 dark:bg-[#161B22]/50">
                <th className="py-3.5 px-4">Provider Reference</th>
                <th className="py-3.5 px-4">Recipient & Bank</th>
                <th className="py-3.5 px-4">Corridor & FX Rate</th>
                <th className="py-3.5 px-4">Amount Delivered</th>
                <th className="py-3.5 px-4">Debit Amount</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No payout records found.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{p.provider_reference}</div>
                      <div className="text-[10px] text-slate-500">Idemp: {p.idempotency_key.slice(0, 16)}...</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-900 dark:text-white">{p.recipient_name}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        <span>{p.bank_name} ({truncateAccount(p.account_number)})</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono">
                      <div className="text-slate-700 dark:text-slate-200">{p.source_currency} → {p.destination_currency}</div>
                      <div className="text-[10px] text-slate-500">
                        1 {p.source_currency} = {typeof p.exchange_rate === 'number' ? p.exchange_rate.toFixed(6) : p.exchange_rate}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 tabular-nums">
                      <div className="font-bold text-slate-900 dark:text-white text-sm">
                        {formatMinorUnits(p.destination_amount_minor, p.destination_currency)}
                      </div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">Net Beneficiary</div>
                    </td>

                    <td className="py-3.5 px-4 tabular-nums text-slate-700 dark:text-slate-300">
                      <div>{formatMinorUnits(p.source_amount_minor, p.source_currency)}</div>
                      <div className="text-[10px] text-slate-500">
                        Fee: {formatMinorUnits(p.provider_fee_minor, p.source_currency)}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge status={p.status} />
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                      <div>{formatDate(p.initiated_at)}</div>
                      <div className="text-[10px] text-slate-500">{new Date(p.initiated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onSelectPayment(p)}
                        className="px-2.5 py-1 rounded bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer text-xs"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

