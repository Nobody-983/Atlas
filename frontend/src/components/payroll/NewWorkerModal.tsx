import React, { useState } from 'react';
import {
  X,
  UserPlus,
  Building2,
  Mail,
  DollarSign,
  Globe2,
  CheckCircle2,
  AlertTriangle,
  Briefcase,
} from 'lucide-react';
import { Button } from '../common/Button.js';
import { api } from '../../lib/api.js';

interface NewWorkerModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId?: string;
  onSuccess: (worker: any) => void;
}

export const NewWorkerModal: React.FC<NewWorkerModalProps> = ({
  isOpen,
  onClose,
  orgId,
  onSuccess,
}) => {
  const [displayName, setDisplayName] = useState('');
  const [recipientType, setRecipientType] = useState<'employee' | 'contractor'>('employee');
  const [department, setDepartment] = useState('Engineering');
  const [jobTitle, setJobTitle] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('NGA');
  const [currency, setCurrency] = useState('NGN');
  const [salaryMajor, setSalaryMajor] = useState<number>(0);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [swiftBic, setSwiftBic] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Sync currency with country selection
  const handleCountryChange = (c: string) => {
    setCountry(c);
    if (c === 'NGA') setCurrency('NGN');
    else if (c === 'USA') setCurrency('USD');
    else if (c === 'GBR') setCurrency('GBP');
    else if (c === 'KEN') setCurrency('KES');
    else if (c === 'CAN') setCurrency('CAD');
    else if (c === 'DEU') setCurrency('EUR');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !bankName.trim() || !accountNumber.trim()) {
      setError('Please provide worker full name, bank name, and account number.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await api.createPayrollRecipient({
        organisationId: orgId,
        displayName: displayName.trim(),
        recipientType,
        country,
        currency,
        department,
        jobTitle: jobTitle.trim(),
        email: email.trim(),
        defaultSalaryMinor: Math.round(salaryMajor * 100),
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        routingNumber: routingNumber.trim() || null,
        swiftBic: swiftBic.trim() || null,
      });

      onSuccess(data.recipient);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-[#0D1117] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/8 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Onboard Global Team Member</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Add an employee or contractor with compliant bank payout details</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          {/* Classification Selector */}
          <div>
            <label className="block text-slate-700 dark:text-slate-400 mb-1.5 font-medium">Worker Classification</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRecipientType('employee')}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-colors ${
                  recipientType === 'employee'
                    ? 'bg-blue-50 dark:bg-blue-500/15 border-blue-400 dark:border-blue-500/40 text-blue-900 dark:text-blue-200'
                    : 'bg-slate-50 dark:bg-[#161B22] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20'
                }`}
              >
                <div className="font-semibold text-slate-900 dark:text-white">Full-Time Employee</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Fixed payroll, standard cycle schedule</div>
              </button>

              <button
                type="button"
                onClick={() => setRecipientType('contractor')}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-colors ${
                  recipientType === 'contractor'
                    ? 'bg-purple-50 dark:bg-purple-500/15 border-purple-400 dark:border-purple-500/40 text-purple-900 dark:text-purple-200'
                    : 'bg-slate-50 dark:bg-[#161B22] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20'
                }`}
              >
                <div className="font-semibold text-slate-900 dark:text-white">Independent Contractor</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Retainer fee or milestone payments</div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-400 mb-1">Full Legal Name</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Sarah Jenkins"
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#161B22] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-400 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sarah.jenkins@company.com"
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#161B22] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-400 mb-1">Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Engineering, Operations, etc."
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#161B22] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-400 mb-1">Job Title</label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Senior Frontend Engineer"
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#161B22] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-400 mb-1">Country</label>
              <select
                value={country}
                onChange={(e) => handleCountryChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#161B22] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="NGA">Nigeria (NGA)</option>
                <option value="USA">United States (USA)</option>
                <option value="GBR">United Kingdom (GBR)</option>
                <option value="KEN">Kenya (KEN)</option>
                <option value="CAN">Canada (CAN)</option>
                <option value="DEU">Germany (DEU)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-400 mb-1">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#161B22] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
              >
                <option value="NGN">NGN (₦)</option>
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
                <option value="EUR">EUR (€)</option>
                <option value="KES">KES (KSh)</option>
                <option value="CAD">CAD ($)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-400 mb-1">Base Monthly Pay</label>
              <input
                type="number"
                min="0"
                step="any"
                value={salaryMajor}
                onChange={(e) => setSalaryMajor(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#161B22] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500 text-right"
              />
            </div>
          </div>

          {/* Banking Details */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#161B22] border border-slate-200 dark:border-white/5 space-y-3">
            <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Banking & Payout Coordinates</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Bank Name</label>
                <input
                  type="text"
                  required
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. JPMorgan Chase or GTBank"
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#0D1117] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Account Number / IBAN</label>
                <input
                  type="text"
                  required
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="e.g. 0128492049"
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#0D1117] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Routing / Sort Code (Optional)</label>
                <input
                  type="text"
                  value={routingNumber}
                  onChange={(e) => setRoutingNumber(e.target.value)}
                  placeholder="e.g. 021000021"
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#0D1117] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">SWIFT / BIC (Optional)</label>
                <input
                  type="text"
                  value={swiftBic}
                  onChange={(e) => setSwiftBic(e.target.value)}
                  placeholder="e.g. CHASUS33"
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#0D1117] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-200 dark:border-white/8 flex items-center justify-end gap-2">
            <Button variant="ghost" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isLoading} icon={<UserPlus className="w-4 h-4" />}>
              Add to Workforce Directory
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

