import React, { useState } from 'react';
import { X, UserCheck, Building2, Globe, DollarSign, ShieldCheck } from 'lucide-react';
import { Supplier } from '../../lib/types.js';
import { Button } from '../common/Button.js';
import { api } from '../../lib/api.js';

interface CreateRecipientModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  suppliers: Supplier[];
  onSuccess: (recipient: any) => void;
}

export const CreateRecipientModal: React.FC<CreateRecipientModalProps> = ({
  isOpen,
  onClose,
  orgId,
  suppliers,
  onSuccess,
}) => {
  const [displayName, setDisplayName] = useState('');
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '');
  const [country, setCountry] = useState('NGA');
  const [currency, setCurrency] = useState('NGN');
  const [payoutMethod, setPayoutMethod] = useState<'bank_transfer' | 'mobile_money'>('bank_transfer');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [swiftBic, setSwiftBic] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !bankName.trim() || !accountNumber.trim()) {
      setError('Recipient name, bank name, and account number are required.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await api.createRecipient({
        organisationId: orgId,
        supplierId: supplierId || null,
        displayName: displayName.trim(),
        country,
        currency,
        payoutMethod,
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        routingNumber: routingNumber.trim() || null,
        swiftBic: swiftBic.trim() || null,
      });

      onSuccess(data.recipient);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create beneficiary recipient.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#0D1117] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-white/8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Add Payout Recipient</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">ProofRail-protected international beneficiary profile</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Recipient Full Name / Entity</label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. John Doe / Global Logix Ltd"
              className="w-full bg-slate-50 dark:bg-[#161B22] border border-slate-300 dark:border-white/10 rounded-lg px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {suppliers.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Link to Supplier (Optional)</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#161B22] border border-slate-300 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="">Independent Beneficiary (No Supplier Link)</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.country})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Destination Country</label>
              <select
                value={country}
                onChange={(e) => {
                  setCountry(e.target.value);
                  if (e.target.value === 'NGA') setCurrency('NGN');
                  else if (e.target.value === 'USA') setCurrency('USD');
                  else if (e.target.value === 'GBR') setCurrency('GBP');
                  else if (e.target.value === 'KEN') setCurrency('KES');
                  else if (e.target.value === 'GHA') setCurrency('GHS');
                  else if (e.target.value === 'ZAF') setCurrency('ZAR');
                }}
                className="w-full bg-slate-50 dark:bg-[#161B22] border border-slate-300 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="NGA">Nigeria (NGA)</option>
                <option value="USA">United States (USA)</option>
                <option value="GBR">United Kingdom (GBR)</option>
                <option value="KEN">Kenya (KEN)</option>
                <option value="GHA">Ghana (GHA)</option>
                <option value="ZAF">South Africa (ZAF)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Payout Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#161B22] border border-slate-300 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="NGN">NGN - Nigerian Naira</option>
                <option value="USD">USD - US Dollar</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="EUR">EUR - Euro</option>
                <option value="KES">KES - Kenyan Shilling</option>
                <option value="GHS">GHS - Ghanaian Cedi</option>
                <option value="ZAR">ZAR - South African Rand</option>
              </select>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#161B22]/80 border border-slate-200 dark:border-white/5 space-y-3">
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Bank Routing & Account Details</span>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">Bank Name</label>
              <input
                type="text"
                required
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. Access Bank / Chase Bank"
                className="w-full bg-white dark:bg-[#0D1117] border border-slate-300 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">Account Number / IBAN</label>
              <input
                type="text"
                required
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="0123456789"
                className="w-full bg-white dark:bg-[#0D1117] border border-slate-300 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">Routing / Sort Code</label>
                <input
                  type="text"
                  value={routingNumber}
                  onChange={(e) => setRoutingNumber(e.target.value)}
                  placeholder="Optional routing"
                  className="w-full bg-white dark:bg-[#0D1117] border border-slate-300 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">SWIFT / BIC</label>
                <input
                  type="text"
                  value={swiftBic}
                  onChange={(e) => setSwiftBic(e.target.value)}
                  placeholder="Optional SWIFT"
                  className="w-full bg-white dark:bg-[#0D1117] border border-slate-300 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-white/8 flex items-center justify-end gap-2.5">
            <Button variant="ghost" size="sm" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isLoading}>
              Save Beneficiary
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

