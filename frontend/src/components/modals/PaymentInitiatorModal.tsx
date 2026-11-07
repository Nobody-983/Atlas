import React, { useState, useEffect } from 'react';
import { X, Send, Calculator, ShieldCheck, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Recipient } from '../../lib/types.js';
import { api } from '../../lib/api.js';
import { formatMinorUnits, truncateAccount } from '../../lib/formatters.js';
import { Button } from '../common/Button.js';
import { Badge } from '../common/Badge.js';

interface PaymentInitiatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipients: Recipient[];
  orgId?: string;
  initialRecipientId?: string;
  initialAmount?: number;
  initialPurpose?: string;
  onSuccess: (paymentRequest: any) => void;
}

export const PaymentInitiatorModal: React.FC<PaymentInitiatorModalProps> = ({
  isOpen,
  onClose,
  recipients,
  orgId,
  initialRecipientId,
  initialAmount = 0,
  initialPurpose = '',
  onSuccess,
}) => {
  const [recipientId, setRecipientId] = useState(initialRecipientId || recipients[0]?.id || '');
  const [sourceCurrency, setSourceCurrency] = useState('NGN');
  const [amount, setAmount] = useState<number>(initialAmount);
  const [purpose, setPurpose] = useState(initialPurpose);

  const [quote, setQuote] = useState<any | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedRecipient = recipients.find((r) => r.id === recipientId) || recipients[0];
  const destCurrency = selectedRecipient?.currency || 'USD';

  // Automatically fetch quote when recipient or amount changes
  useEffect(() => {
    if (!isOpen || !selectedRecipient || !amount || amount <= 0) return;

    const timer = setTimeout(async () => {
      setIsQuoting(true);
      setError(null);
      try {
        const data = await api.getQuote({
          fromCurrency: sourceCurrency,
          toCurrency: destCurrency,
          toAmount: amount,
        });
        setQuote(data.quote);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsQuoting(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [isOpen, recipientId, amount, sourceCurrency, destCurrency]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const data = await api.createPaymentRequest({
        organisationId: orgId,
        recipientId,
        sourceCurrency,
        destinationCurrency: destCurrency,
        amount,
        purpose,
      });

      onSuccess(data);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-[#0D1117] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Prepare International Payout</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Live Blaaiz FX quotation & ProofRail trust evaluation</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          {/* Select Recipient */}
          <div>
            <label className="block text-slate-700 dark:text-slate-400 mb-1 font-medium">Target Recipient & Beneficiary</label>
            <select
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#161B22] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
            >
              {recipients.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.display_name} — {r.country} ({r.currency}) • {r.bank_name || 'Bank'} {truncateAccount(r.account_number)}
                </option>
              ))}
            </select>
          </div>

          {/* Amount and Currencies */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 dark:text-slate-400 mb-1 font-medium">
                Amount Recipient Receives ({destCurrency})
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#161B22] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:border-emerald-500 tabular-nums"
                  required
                />
                <span className="absolute right-3 top-2.5 text-xs font-mono text-slate-500">{destCurrency}</span>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-400 mb-1 font-medium">Funding Wallet Currency</label>
              <select
                value={sourceCurrency}
                onChange={(e) => setSourceCurrency(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#161B22] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="NGN">NGN — Nigerian Naira Business Wallet</option>
                <option value="USD">USD — Dollar Operating Balance</option>
                <option value="KES">KES — Kenyan Shilling Account</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-400 mb-1 font-medium">Commercial Purpose & Explainability</label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#161B22] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          {/* Blaaiz Live Quote Card */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#161B22] border border-slate-200 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-2">
              <span className="text-slate-800 dark:text-slate-300 font-semibold flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Blaaiz Quote Breakdown</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-semibold">
                {isQuoting ? 'Fetching live rates...' : 'Executable Quote (Valid 15m)'}
              </span>
            </div>

            {quote ? (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Exchange Rate:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200 font-medium">
                    1 {sourceCurrency} = {Number(quote.exchange_rate).toFixed(6)} {destCurrency}
                  </span>
                </div>

                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Provider Processing Fee:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200 font-medium">
                    {formatMinorUnits(quote.provider_fee_minor, sourceCurrency)}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-white/5 flex justify-between text-sm">
                  <span className="font-semibold text-slate-900 dark:text-white">Total Charge to Wallet:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {formatMinorUnits(quote.total_charge_minor, sourceCurrency)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center text-slate-500 text-xs">
                Enter an amount to request an automated Blaaiz exchange rate quote.
              </div>
            )}
          </div>

          {/* ProofRail Warning notice if recipient is flagged */}
          {selectedRecipient?.is_flagged && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <div>
                <span className="font-semibold">ProofRail Notice:</span> Beneficiary details were recently modified. This payment request will be marked for compliance callback review.
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="pt-4 border-t border-slate-200 dark:border-white/8 flex items-center justify-end gap-2">
            <Button variant="ghost" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={isSubmitting}
              disabled={!quote || isQuoting}
              icon={<Send className="w-4 h-4" />}
            >
              Submit for Authorization
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

