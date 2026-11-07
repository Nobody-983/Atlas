import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Calendar,
  DollarSign,
  Users,
  ShieldCheck,
  Calculator,
  Building2,
  Sparkles,
  Lock,
} from 'lucide-react';
import { Recipient } from '../../lib/types.js';
import { api } from '../../lib/api.js';
import { formatDate, formatMinorUnits, truncateAccount } from '../../lib/formatters.js';
import { Button } from '../common/Button.js';
import { Badge } from '../common/Badge.js';

interface PayrollCreationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  recipients: Recipient[];
  orgId?: string;
  onSuccess: (run: any) => void;
}

export const PayrollCreationWizard: React.FC<PayrollCreationWizardProps> = ({
  isOpen,
  onClose,
  recipients,
  orgId,
  onSuccess,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Cycle Metadata
  const now = new Date();
  const currentMonthYear = now.toLocaleString('default', { month: 'long', year: 'numeric' });
  const [title, setTitle] = useState(`${currentMonthYear} Global Workforce Payroll`);
  const [payPeriodStart, setPayPeriodStart] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  );
  const [payPeriodEnd, setPayPeriodEnd] = useState(
    new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  );
  const [payDate, setPayDate] = useState(
    new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  );
  const [fundingCurrency, setFundingCurrency] = useState('NGN');
  const [notes, setNotes] = useState('');

  // Step 2: Selected Recipients & Amounts
  const [selectedWorkers, setSelectedWorkers] = useState<
    Record<
      string,
      {
        selected: boolean;
        amountMajor: number;
        itemType: 'salary' | 'contractor_fee' | 'bonus' | 'reimbursement';
        notes: string;
      }
    >
  >({});

  // Initialize selected workers on mount
  useEffect(() => {
    if (recipients.length > 0) {
      const initial: Record<string, any> = {};
      recipients.forEach((r) => {
        const defaultMajor = Number(r.default_salary_minor || 0) / 100;
        initial[r.id] = {
          selected: true,
          amountMajor: defaultMajor > 0 ? defaultMajor : 1000,
          itemType: r.recipient_type === 'employee' ? 'salary' : 'contractor_fee',
          notes: `${currentMonthYear} disbursement`,
        };
      });
      setSelectedWorkers(initial);
    }
  }, [recipients]);

  // Step 3: Live Quotes
  const [quotes, setQuotes] = useState<Record<string, any>>({});
  const [isQuoting, setIsQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // Submitting
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleSelectAll = (select: boolean) => {
    const updated = { ...selectedWorkers };
    Object.keys(updated).forEach((id) => {
      updated[id] = { ...updated[id], selected: select };
    });
    setSelectedWorkers(updated);
  };

  const toggleSelectCategory = (category: 'employee' | 'contractor') => {
    const updated = { ...selectedWorkers };
    recipients.forEach((r) => {
      if (r.recipient_type === category) {
        updated[r.id] = { ...updated[r.id], selected: true };
      } else {
        updated[r.id] = { ...updated[r.id], selected: false };
      }
    });
    setSelectedWorkers(updated);
  };

  // Fetch real FX quotes for all selected workers
  const fetchLiveQuotes = async () => {
    setIsQuoting(true);
    setQuoteError(null);
    try {
      const selectedList = recipients.filter((r) => selectedWorkers[r.id]?.selected);
      const quotesMap: Record<string, any> = {};

      for (const worker of selectedList) {
        const itemConfig = selectedWorkers[worker.id];
        if (worker.currency === fundingCurrency) {
          quotesMap[worker.id] = {
            rate: 1.0,
            fee: 50, // 50 NGN domestic fee
            sourceAmount: itemConfig.amountMajor,
            totalDebit: itemConfig.amountMajor + 50,
          };
        } else {
          const data = await api.getQuote({
            fromCurrency: fundingCurrency,
            toCurrency: worker.currency,
            toAmount: itemConfig.amountMajor,
          });
          const q = data.quote;
          quotesMap[worker.id] = {
            rate: q.exchange_rate,
            fee: Number(q.provider_fee_minor) / 100,
            sourceAmount: Number(q.from_amount_minor) / 100,
            totalDebit: Number(q.total_charge_minor) / 100,
          };
        }
      }
      setQuotes(quotesMap);
      setStep(3);
    } catch (err: any) {
      setQuoteError(err.message || 'Failed to fetch quotes from Blaaiz.');
    } finally {
      setIsQuoting(false);
    }
  };

  // Selected Workers Summary
  const selectedList = recipients.filter((r) => selectedWorkers[r.id]?.selected);
  const totalFundingEstimate = selectedList.reduce((acc, worker) => {
    const q = quotes[worker.id];
    return acc + (q?.totalDebit || 0);
  }, 0);

  // Check ProofRail flags
  const flaggedSelected = selectedList.filter((r) => r.is_flagged);

  const handleSubmit = async (submitForApproval: boolean) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const items = selectedList.map((worker) => {
        const cfg = selectedWorkers[worker.id];
        return {
          recipientId: worker.id,
          itemType: cfg.itemType,
          destinationAmountMinor: Math.round(cfg.amountMajor * 100),
          notes: cfg.notes,
        };
      });

      const data = await api.createPayrollRun({
        organisationId: orgId,
        title,
        payPeriodStart,
        payPeriodEnd,
        payDate,
        fundingCurrency,
        items,
        notes,
      });

      const createdRun = data.run;

      if (submitForApproval) {
        const submitData = await api.submitPayrollRun(createdRun.id);
        onSuccess(submitData.run);
      } else {
        onSuccess(createdRun);
      }

      onClose();
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit payroll run');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-white dark:bg-[#0D1117] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Wizard Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">New International Payroll Run</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Step {step} of 4: {step === 1 ? 'Cycle Parameters' : step === 2 ? 'Select Team & Compensation' : step === 3 ? 'Live FX Quotes & Fees' : 'Review & Authorization'}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Tracker */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-[#161B22]/60 border-b border-slate-200 dark:border-white/5 flex items-center justify-between text-xs overflow-x-auto min-w-0 scrollbar-none">
          <div className={`flex items-center gap-2 shrink-0 ${step >= 1 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400 dark:text-slate-500'}`}>
            <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px] font-mono">1</span>
            <span>Parameters</span>
          </div>
          <div className="w-8 h-[1px] bg-slate-300 dark:bg-white/10 shrink-0 mx-1" />
          <div className={`flex items-center gap-2 shrink-0 ${step >= 2 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400 dark:text-slate-500'}`}>
            <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px] font-mono">2</span>
            <span>Roster & Amounts</span>
          </div>
          <div className="w-8 h-[1px] bg-slate-300 dark:bg-white/10 shrink-0 mx-1" />
          <div className={`flex items-center gap-2 shrink-0 ${step >= 3 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400 dark:text-slate-500'}`}>
            <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px] font-mono">3</span>
            <span>Provider FX Quotes</span>
          </div>
          <div className="w-8 h-[1px] bg-slate-300 dark:bg-white/10 shrink-0 mx-1" />
          <div className={`flex items-center gap-2 shrink-0 ${step >= 4 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400 dark:text-slate-500'}`}>
            <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px] font-mono">4</span>
            <span>ProofRail Pre-Flight</span>
          </div>
        </div>

        {/* Wizard Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs">
          {submitError && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* STEP 1: PARAMETERS */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1.5">Payroll Cycle Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 dark:bg-[#161B22] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 text-sm font-medium"
                  placeholder="e.g. November 2026 Core Workforce Payroll"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">Pay Period Start</label>
                  <input
                    type="date"
                    value={payPeriodStart}
                    onChange={(e) => setPayPeriodStart(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#161B22] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">Pay Period End</label>
                  <input
                    type="date"
                    value={payPeriodEnd}
                    onChange={(e) => setPayPeriodEnd(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#161B22] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">Disbursement Date</label>
                  <input
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#161B22] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Corporate Funding Currency</label>
                <select
                  value={fundingCurrency}
                  onChange={(e) => setFundingCurrency(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#161B22] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
                >
                  <option value="NGN">NGN — Nigerian Naira (Corporate Treasury Account)</option>
                  <option value="USD">USD — US Dollar</option>
                  <option value="KES">KES — Kenyan Shilling</option>
                </select>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  Source wallet debited for payouts and provider exchange fees.
                </p>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Cycle Notes / Memo</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#161B22] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                  placeholder="Optional internal reconciliation notes..."
                />
              </div>
            </div>
          )}

          {/* STEP 2: ROSTER & AMOUNTS */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 dark:bg-[#161B22] border border-slate-200 dark:border-white/5">
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  Selected: <strong className="text-slate-900 dark:text-white">{selectedList.length} of {recipients.length} workers</strong>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleSelectAll(true)}
                    className="px-2.5 py-1 rounded bg-slate-200/70 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleSelectCategory('employee')}
                    className="px-2.5 py-1 rounded bg-slate-200/70 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    Employees Only
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleSelectCategory('contractor')}
                    className="px-2.5 py-1 rounded bg-slate-200/70 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    Contractors Only
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleSelectAll(false)}
                    className="px-2.5 py-1 rounded bg-slate-200/70 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 cursor-pointer"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {quoteError && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300">
                  {quoteError}
                </div>
              )}

              <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                {recipients.map((worker) => {
                  const cfg = selectedWorkers[worker.id] || { selected: false, amountMajor: 0, itemType: 'salary' };
                  return (
                    <div
                      key={worker.id}
                      className={`p-3.5 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        cfg.selected
                          ? 'bg-slate-50 dark:bg-[#161B22] border-emerald-400 dark:border-emerald-500/30 shadow-sm'
                          : 'bg-slate-100/50 dark:bg-[#161B22]/40 border-slate-200 dark:border-white/5 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={cfg.selected}
                          onChange={(e) =>
                            setSelectedWorkers({
                              ...selectedWorkers,
                              [worker.id]: { ...cfg, selected: e.target.checked },
                            })
                          }
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-0 cursor-pointer"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 dark:text-white">{worker.display_name}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase">
                              {worker.recipient_type}
                            </span>
                            {worker.is_flagged && (
                              <span className="text-[10px] text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Flagged</span>
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {worker.department || 'Operations'} • {worker.bank_name} ({truncateAccount(worker.account_number)})
                          </div>
                        </div>
                      </div>

                      {cfg.selected && (
                        <div className="flex items-center gap-3">
                          <select
                            value={cfg.itemType}
                            onChange={(e) =>
                              setSelectedWorkers({
                                ...selectedWorkers,
                                [worker.id]: { ...cfg, itemType: e.target.value as any },
                              })
                            }
                            className="px-2.5 py-1.5 rounded bg-white dark:bg-[#0D1117] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white text-xs"
                          >
                            <option value="salary">Salary</option>
                            <option value="contractor_fee">Contractor Fee</option>
                            <option value="bonus">Bonus</option>
                            <option value="reimbursement">Reimbursement</option>
                          </select>

                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-slate-600 dark:text-slate-400 font-semibold">{worker.currency}</span>
                            <input
                              type="number"
                              value={cfg.amountMajor}
                              onChange={(e) =>
                                setSelectedWorkers({
                                  ...selectedWorkers,
                                  [worker.id]: { ...cfg, amountMajor: parseFloat(e.target.value) || 0 },
                                })
                              }
                              className="w-28 px-2.5 py-1.5 rounded bg-white dark:bg-[#0D1117] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-mono text-right font-semibold"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: LIVE FX QUOTES BREAKDOWN */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-slate-50 dark:from-emerald-950/30 dark:to-[#161B22] border border-emerald-200 dark:border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-slate-600 dark:text-slate-400 text-xs">Total Estimated Corporate Funding</div>
                  <div className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight mt-0.5">
                    {formatMinorUnits(Math.round(totalFundingEstimate * 100), fundingCurrency)}
                  </div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                    Includes provider foreign exchange & clearing fees
                  </div>
                </div>
                <div className="sm:text-right">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Total Workers</div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">{selectedList.length} Recipients</div>
                </div>
              </div>

              <div className="rounded-xl bg-white dark:bg-[#161B22] border border-slate-200 dark:border-white/8 overflow-hidden">
                <div className="overflow-x-auto min-w-0">
                  <table className="w-full min-w-[550px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-white/8 text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-white/[0.02]">
                        <th className="py-2.5 px-3">Recipient</th>
                        <th className="py-2.5 px-3">Net Payout</th>
                        <th className="py-2.5 px-3">Live FX Rate</th>
                        <th className="py-2.5 px-3">Provider Fee</th>
                        <th className="py-2.5 px-3 text-right">Debit in NGN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                      {selectedList.map((worker) => {
                        const cfg = selectedWorkers[worker.id];
                        const q = quotes[worker.id] || { rate: 1, fee: 0, sourceAmount: cfg.amountMajor, totalDebit: cfg.amountMajor };
                        return (
                          <tr key={worker.id}>
                            <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                              <div>{worker.display_name}</div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">{worker.country} • {worker.recipient_type}</div>
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {formatMinorUnits(Math.round(cfg.amountMajor * 100), worker.currency)}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                              1 NGN = {typeof q.rate === 'number' ? q.rate.toFixed(6) : q.rate} {worker.currency}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500 dark:text-slate-400">
                              {formatMinorUnits(Math.round(q.fee * 100), fundingCurrency)}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-semibold text-slate-900 dark:text-white text-right">
                              {formatMinorUnits(Math.round(q.totalDebit * 100), fundingCurrency)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: PROOFRAIL PRE-FLIGHT REVIEW */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#161B22] border border-slate-200 dark:border-white/8 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h4 className="font-semibold text-slate-900 dark:text-white text-sm">ProofRail Policy & Anti-Fraud Pre-Flight</h4>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  ProofRail evaluated {selectedList.length} recipient payment profiles against corporate dual-authorization thresholds and beneficiary change history.
                </p>

                {flaggedSelected.length > 0 ? (
                  <div className="p-3.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 space-y-1">
                    <div className="font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" />
                      <span>{flaggedSelected.length} Recipient Account Warnings Detected</span>
                    </div>
                    <p className="text-[11px] text-rose-600/80 dark:text-rose-200/80">
                      The run will be marked as "Review Required" upon creation. Executive dual signature will be mandatory prior to payout release.
                    </p>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>All recipient accounts verified. No fraud or modified bank alerts found.</span>
                  </div>
                )}
              </div>

              {/* Final Summary Card */}
              <div className="p-4 rounded-xl bg-slate-100/70 dark:bg-[#111620] border border-slate-200 dark:border-white/10 space-y-2">
                <h5 className="font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Execution Summary</h5>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">Total Workers</span>
                    <div className="font-bold text-slate-900 dark:text-white text-sm">{selectedList.length}</div>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">Funding Wallet</span>
                    <div className="font-bold text-slate-900 dark:text-white text-sm">{fundingCurrency} Treasury</div>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">Pay Date</span>
                    <div className="font-bold text-slate-900 dark:text-white text-sm">{formatDate(payDate)}</div>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">Total Funding</span>
                    <div className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      {formatMinorUnits(Math.round(totalFundingEstimate * 100), fundingCurrency)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Navigation */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-white/8 flex items-center justify-between">
          <div>
            {step > 1 && (
              <Button
                variant="secondary"
                size="sm"
                icon={<ArrowLeft className="w-4 h-4" />}
                onClick={() => setStep((s) => (s - 1) as any)}
                disabled={isSubmitting || isQuoting}
              >
                Back
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>

            {step === 1 && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  if (!title.trim()) return;
                  setStep(2);
                }}
              >
                <span>Select Workers</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            )}

            {step === 2 && (
              <Button
                variant="primary"
                size="sm"
                onClick={fetchLiveQuotes}
                isLoading={isQuoting}
                disabled={selectedList.length === 0}
              >
                <span>Fetch Live FX Quotes</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            )}

            {step === 3 && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setStep(4)}
              >
                <span>Compliance Pre-Flight</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            )}

            {step === 4 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleSubmit(false)}
                  isLoading={isSubmitting}
                >
                  Save as Draft
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleSubmit(true)}
                  isLoading={isSubmitting}
                >
                  Create & Submit for Approval
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
