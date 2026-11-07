import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  RefreshCw,
  Building2,
  ExternalLink,
  Users,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import { PayrollItem, PayrollRun, User } from '../../lib/types.js';
import { api } from '../../lib/api.js';
import { formatDate, formatDateTime, formatMinorUnits, truncateAccount } from '../../lib/formatters.js';
import { Badge } from '../common/Badge.js';
import { Button } from '../common/Button.js';

interface PayrollRunDetailModalProps {
  run: PayrollRun | null;
  currentUser: User | null;
  isOpen: boolean;
  onClose: () => void;
  onRunUpdated: () => void;
}

export const PayrollRunDetailModal: React.FC<PayrollRunDetailModalProps> = ({
  run,
  currentUser,
  isOpen,
  onClose,
  onRunUpdated,
}) => {
  const [details, setDetails] = useState<PayrollRun | null>(null);
  const [items, setItems] = useState<PayrollItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');

  const loadRunDetails = async (runId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getPayrollRunDetail(runId);
      setDetails(data.run);
      setItems(data.items || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && run) {
      loadRunDetails(run.id);
    }
  }, [isOpen, run]);

  if (!isOpen || !run) return null;

  const currentRun = details || run;

  // Actions
  const handleSubmitForApproval = async () => {
    setActionLoading(true);
    setError(null);
    try {
      await api.submitPayrollRun(currentRun.id);
      await loadRunDetails(currentRun.id);
      onRunUpdated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    setError(null);
    try {
      await api.approvePayrollRun(
        currentRun.id,
        currentUser?.id,
        approvalNotes || 'Authorized executive approval for global workforce payroll.'
      );
      await loadRunDetails(currentRun.id);
      onRunUpdated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExecute = async () => {
    setActionLoading(true);
    setError(null);
    try {
      await api.executePayrollRun(currentRun.id);
      await loadRunDetails(currentRun.id);
      onRunUpdated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetryFailed = async () => {
    setActionLoading(true);
    setError(null);
    try {
      await api.retryFailedPayrollItem(currentRun.id, '');
      await loadRunDetails(currentRun.id);
      onRunUpdated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const completedItemsCount = items.filter((i) => i.status === 'completed').length;
  const failedItemsCount = items.filter((i) => i.status === 'failed').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-white dark:bg-[#0D1117] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-white text-base">{currentRun.title}</h3>
                <Badge status={currentRun.status} />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Pay Date: {formatDate(currentRun.pay_date)} • Period: {formatDate(currentRun.pay_period_start)} to {formatDate(currentRun.pay_period_end)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadRunDetails(currentRun.id)}
              disabled={isLoading || actionLoading}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Hero Financial Banner */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#161B22] border border-slate-200 dark:border-white/8 grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <div className="text-slate-500 dark:text-slate-400 text-xs">Corporate Funding Required</div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight mt-0.5">
                {formatMinorUnits(currentRun.total_funding_minor, currentRun.funding_currency)}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Net Payouts + Blaaiz Fees
              </div>
            </div>

            <div>
              <div className="text-slate-500 dark:text-slate-400 text-xs">Provider FX & Network Fees</div>
              <div className="text-xl font-bold text-slate-700 dark:text-slate-300 tabular-nums tracking-tight mt-0.5">
                {formatMinorUnits(currentRun.total_fee_minor, currentRun.funding_currency)}
              </div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                Locked FX Quote Rate
              </div>
            </div>

            <div>
              <div className="text-slate-500 dark:text-slate-400 text-xs">Disbursements Progress</div>
              <div className="text-xl font-bold text-slate-900 dark:text-white tabular-nums tracking-tight mt-0.5">
                {completedItemsCount} / {items.length} Completed
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {failedItemsCount > 0 ? (
                  <span className="text-rose-600 dark:text-rose-400 font-semibold">{failedItemsCount} Failed Transfers</span>
                ) : (
                  <span>{currentRun.recipient_count} Total Recipients</span>
                )}
              </div>
            </div>

            <div>
              <div className="text-slate-500 dark:text-slate-400 text-xs">Authorization State</div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
                {currentRun.approved_by ? (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approved by {currentRun.approver_name || 'Executive'}</span>
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>Dual Signature Required</span>
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                {currentRun.approved_at ? formatDateTime(currentRun.approved_at) : 'Awaiting authorization'}
              </div>
            </div>
          </div>

          {/* Workflow Action Bar */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-slate-100 to-slate-50 dark:from-[#111620] dark:to-[#0D1117] border border-slate-200 dark:border-white/8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-slate-900 dark:text-white text-xs">Cycle Lifecycle Control</div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                {currentRun.status === 'draft' && 'Draft cycle created. Submit for executive dual authorization.'}
                {currentRun.status === 'pending_approval' && 'Pending approval. Authorized signers can commit funds.'}
                {currentRun.status === 'approved' && 'Batch authorized. Ready for instant multi-currency dispatch via Blaaiz Relay.'}
                {currentRun.status === 'processing' && 'Payout transfers currently executing across banking corridors.'}
                {currentRun.status === 'completed' && 'All disbursements successfully settled. Records archived in audit ledger.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {currentRun.status === 'draft' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSubmitForApproval}
                  isLoading={actionLoading}
                >
                  Submit for Approval
                </Button>
              )}

              {currentRun.status === 'pending_approval' && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<CheckCircle2 className="w-4 h-4" />}
                    onClick={handleApprove}
                    isLoading={actionLoading}
                  >
                    Authorize Batch Payout
                  </Button>
                </div>
              )}

              {currentRun.status === 'approved' && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Send className="w-4 h-4" />}
                  onClick={handleExecute}
                  isLoading={actionLoading}
                >
                  Dispatch via Blaaiz Relay
                </Button>
              )}

              {failedItemsCount > 0 && (
                <Button
                  variant="danger"
                  size="sm"
                  icon={<RefreshCw className="w-4 h-4" />}
                  onClick={handleRetryFailed}
                  isLoading={actionLoading}
                >
                  Retry Failed ({failedItemsCount})
                </Button>
              )}
            </div>
          </div>

          {/* Itemized Workforce Line Items Table */}
          <div className="space-y-3">
            <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Disbursement Line Items ({items.length})
            </h4>

            <div className="rounded-xl bg-white dark:bg-[#161B22] border border-slate-200 dark:border-white/8 overflow-hidden">
              <div className="overflow-x-auto min-w-0">
                <table className="w-full min-w-[700px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/8 text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-white/[0.02]">
                      <th className="py-2.5 px-3">Worker Details</th>
                      <th className="py-2.5 px-3">Classification</th>
                      <th className="py-2.5 px-3">Banking Rail</th>
                      <th className="py-2.5 px-3">Net Payout</th>
                      <th className="py-2.5 px-3">Exchange Rate</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Provider Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900 dark:text-white">{item.recipient_name}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">{item.department} • {item.job_title}</div>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase font-semibold ${
                              item.recipient_type === 'employee'
                                ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20'
                                : 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20'
                            }`}
                          >
                            {item.item_type}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <div className="text-slate-800 dark:text-slate-200">{item.bank_name}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-500 font-mono">
                            {truncateAccount(item.account_number)} ({item.recipient_country})
                          </div>
                        </td>

                        <td className="py-3 px-3 tabular-nums font-bold text-slate-900 dark:text-white">
                          {formatMinorUnits(item.destination_amount_minor, item.destination_currency)}
                        </td>

                        <td className="py-3 px-3 tabular-nums text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                          {item.destination_currency === item.source_currency
                            ? 'Domestic (1.00)'
                            : `1 NGN = ${typeof item.exchange_rate === 'number' ? item.exchange_rate.toFixed(6) : item.exchange_rate} ${item.destination_currency}`}
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <Badge status={item.status} />
                          {item.error_message && (
                            <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 max-w-xs truncate">
                              {item.error_message}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 text-[11px] whitespace-nowrap">
                          {item.provider_reference || item.quote_reference || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-white/8 flex items-center justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close Inspector
          </Button>
        </div>
      </div>
    </div>
  );
};

