import React, { useState } from 'react';
import { X, ShieldCheck, AlertTriangle, Building2, PhoneCall } from 'lucide-react';
import { Recipient } from '../../lib/types.js';
import { api } from '../../lib/api.js';
import { Button } from '../common/Button.js';

interface RecipientChangeModalProps {
  recipient: Recipient | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RecipientChangeModal: React.FC<RecipientChangeModalProps> = ({
  recipient,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [bankName, setBankName] = useState(recipient?.bank_name || '');
  const [accountNumber, setAccountNumber] = useState(recipient?.account_number || '');
  const [routingNumber, setRoutingNumber] = useState(recipient?.routing_number || '');
  const [changeReason, setChangeReason] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !recipient) return null;

  const handleUpdateBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await api.updateRecipientBank(recipient.id, {
        bankName,
        accountNumber,
        routingNumber,
        changeReason,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearFlag = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await api.approveRecipientChange(recipient.id, {
        reviewNotes: reviewNotes.trim() || 'Beneficiary banking verification completed.',
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#0D1117] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">ProofRail Recipient Change Protection</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{recipient.display_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleUpdateBank} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          {recipient.is_flagged ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-sm text-rose-800 dark:text-rose-200">
                  <AlertTriangle className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                  <span>Security Flag Active</span>
                </div>
                <p className="text-xs text-rose-700 dark:text-rose-200/80 leading-relaxed">
                  {recipient.flag_reason || 'Beneficiary banking credentials were recently altered.'}
                </p>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono pt-1">
                  Current Account: {recipient.account_number} ({recipient.bank_name})
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#161B22] border border-slate-200 dark:border-white/8 space-y-2">
                <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <PhoneCall className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Verify Out-of-Band Callback</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-xs">
                  To protect against business email compromise (BEC), confirm with the vendor finance contact via authorized telephone numbers before clearing this flag.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button variant="ghost" type="button" onClick={onClose}>
                  Cancel
                </Button>
                <Button variant="primary" type="button" onClick={handleClearFlag} isLoading={isLoading}>
                  Confirm Callback & Clear Flag
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs">
                Modifying beneficiary bank routing details will immediately flag this recipient in ProofRail and require out-of-band verification on subsequent payouts.
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-400 mb-1 font-medium">Bank Name</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#161B22] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-400 mb-1 font-medium">Account Number / IBAN</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#161B22] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-400 mb-1 font-medium">Routing Number / Sort Code / SWIFT</label>
                <input
                  type="text"
                  value={routingNumber}
                  onChange={(e) => setRoutingNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#161B22] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-400 mb-1 font-medium">Reason for Bank Detail Modification</label>
                <input
                  type="text"
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#161B22] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button variant="ghost" type="button" onClick={onClose}>
                  Cancel
                </Button>
                <Button variant="danger" type="submit" isLoading={isLoading}>
                  Update & Trigger Security Flag
                </Button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

