import React, { useState } from 'react';
import {
  FileText,
  Upload,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Search,
  Filter,
  DollarSign,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Invoice } from '../../lib/types.js';
import { formatDate, formatMinorUnits } from '../../lib/formatters.js';
import { Badge } from '../common/Badge.js';
import { Button } from '../common/Button.js';

interface InvoiceWorkspaceProps {
  invoices: Invoice[];
  onOpenUpload: () => void;
  onSelectInvoice: (inv: Invoice) => void;
  onInitiatePaymentForInvoice: (inv: Invoice) => void;
}

export const InvoiceWorkspace: React.FC<InvoiceWorkspaceProps> = ({
  invoices,
  onOpenUpload,
  onSelectInvoice,
  onInitiatePaymentForInvoice,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filtered = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      (inv.supplier_name && inv.supplier_name.toLowerCase().includes(search.toLowerCase())) ||
      (inv.description && inv.description.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || inv.status.toUpperCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Invoice Intelligence & Extraction Workspace</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
              ATLAS COMMERCE
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Automated OCR extraction, duplicate detection, and ProofRail reconciliation for international vendor invoices.
          </p>
        </div>

        <Button variant="primary" icon={<Upload className="w-4 h-4" />} onClick={onOpenUpload}>
          Upload Invoice
        </Button>
      </div>

      {/* Filters & Search */}
      <div className="p-4 rounded-xl bg-white dark:bg-[#0D1117] border border-slate-200 dark:border-white/8 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search by invoice #, supplier name, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-slate-50 dark:bg-[#161B22] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span className="text-xs text-slate-500 dark:text-slate-400">Status:</span>
          {['ALL', 'PENDING_REVIEW', 'APPROVED', 'PAID', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
                statusFilter === st
                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 font-semibold'
                  : 'bg-slate-100 dark:bg-[#161B22] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/5'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices List */}
      <div className="rounded-xl bg-white dark:bg-[#0D1117] border border-slate-200 dark:border-white/8 overflow-hidden shadow-xs">
        <div className="overflow-x-auto min-w-0">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/8 text-slate-500 dark:text-slate-400 font-semibold bg-slate-50 dark:bg-[#161B22]/50">
                <th className="py-3.5 px-4">Invoice #</th>
                <th className="py-3.5 px-4">Supplier</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Due Date</th>
                <th className="py-3.5 px-4">Intelligence & Risk</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No invoices matching filter criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-mono text-slate-800 dark:text-slate-200 font-semibold flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>{inv.invoice_number}</span>
                      </div>
                      <div className="text-[10px] text-slate-500">{inv.file_name || 'manual_entry'}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-900 dark:text-white">{inv.supplier_name || 'Unassigned Vendor'}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]">{inv.description}</div>
                    </td>

                    <td className="py-3.5 px-4 tabular-nums">
                      <div className="font-bold text-slate-900 dark:text-white text-sm">
                        {formatMinorUnits(inv.amount_minor, inv.currency)}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">{inv.currency}</div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                      <div>{formatDate(inv.due_date)}</div>
                      <div className="text-[10px] text-slate-500">Issued: {formatDate(inv.issue_date)}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      {inv.is_duplicate ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                          <AlertTriangle className="w-3 h-3" />
                          DUPLICATE DETECTED
                        </span>
                      ) : inv.risk_count && inv.risk_count > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                          <AlertTriangle className="w-3 h-3" />
                          {inv.risk_count} Risk Warnings
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          Verified
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge status={inv.status} />
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => onSelectInvoice(inv)}
                        className="px-2.5 py-1 rounded bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer text-xs"
                      >
                        Inspect
                      </button>
                      {inv.status !== 'paid' && inv.status !== 'rejected' && (
                        <button
                          onClick={() => onInitiatePaymentForInvoice(inv)}
                          className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors cursor-pointer text-xs inline-flex items-center gap-1 shadow-xs"
                        >
                          <span>Pay</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
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

