import React, { useState } from 'react';
import {
  Users,
  Search,
  UserPlus,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Mail,
  Briefcase,
  DollarSign,
  Send,
  MoreVertical,
  Globe2,
} from 'lucide-react';
import { Recipient } from '../../lib/types.js';
import { formatMinorUnits, truncateAccount } from '../../lib/formatters.js';
import { Badge } from '../common/Badge.js';
import { Button } from '../common/Button.js';

interface PayrollRosterProps {
  recipients: Recipient[];
  onOpenNewWorker: () => void;
  onSelectWorkerForPayout?: (worker: Recipient) => void;
  onEditWorker?: (worker: Recipient) => void;
}

export const PayrollRoster: React.FC<PayrollRosterProps> = ({
  recipients,
  onOpenNewWorker,
  onSelectWorkerForPayout,
  onEditWorker,
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'employee' | 'contractor'>('ALL');

  const filtered = recipients.filter((r) => {
    const matchesSearch =
      r.display_name.toLowerCase().includes(search.toLowerCase()) ||
      (r.email && r.email.toLowerCase().includes(search.toLowerCase())) ||
      (r.department && r.department.toLowerCase().includes(search.toLowerCase())) ||
      (r.job_title && r.job_title.toLowerCase().includes(search.toLowerCase())) ||
      r.country.toLowerCase().includes(search.toLowerCase()) ||
      r.currency.toLowerCase().includes(search.toLowerCase());

    const matchesType = typeFilter === 'ALL' || r.recipient_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const employeeCount = recipients.filter((r) => r.recipient_type === 'employee').length;
  const contractorCount = recipients.filter((r) => r.recipient_type === 'contractor').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Workforce Directory & Compensation Profiles</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
              {recipients.length} VERIFIED WORKERS
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage international full-time employees, specialized contractors, and verified bank payout rails.
          </p>
        </div>

        <Button variant="primary" icon={<UserPlus className="w-4 h-4" />} onClick={onOpenNewWorker}>
          Onboard Team Member
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
            placeholder="Search by name, email, department, country, or job title..."
            className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-slate-50 dark:bg-[#161B22] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Worker Category Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-[#161B22] border border-slate-200 dark:border-white/5 text-xs">
          <button
            onClick={() => setTypeFilter('ALL')}
            className={`px-3 py-1 rounded cursor-pointer transition-colors ${
              typeFilter === 'ALL' ? 'bg-white dark:bg-emerald-500 text-slate-900 dark:text-white font-semibold shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All Workers ({recipients.length})
          </button>
          <button
            onClick={() => setTypeFilter('employee')}
            className={`px-3 py-1 rounded cursor-pointer transition-colors ${
              typeFilter === 'employee' ? 'bg-white dark:bg-emerald-500 text-slate-900 dark:text-white font-semibold shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Employees ({employeeCount})
          </button>
          <button
            onClick={() => setTypeFilter('contractor')}
            className={`px-3 py-1 rounded cursor-pointer transition-colors ${
              typeFilter === 'contractor' ? 'bg-white dark:bg-emerald-500 text-slate-900 dark:text-white font-semibold shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Contractors ({contractorCount})
          </button>
        </div>
      </div>

      {/* Workforce Roster Table */}
      <div className="rounded-xl bg-white dark:bg-[#0D1117] border border-slate-200 dark:border-white/8 overflow-hidden shadow-xs">
        {filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 mx-auto flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">No Workforce Members Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {search
                ? 'No workers match your filter criteria. Try clearing your search.'
                : 'No employees or contractors added yet. Start by onboarding your first team member.'}
            </p>
            {!search && (
              <Button variant="primary" size="sm" icon={<UserPlus className="w-4 h-4" />} onClick={onOpenNewWorker}>
                Onboard First Member
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto min-w-0">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/8 text-slate-500 dark:text-slate-400 font-semibold bg-slate-50 dark:bg-[#161B22]/50">
                  <th className="py-3 px-4 font-semibold">Worker Details</th>
                  <th className="py-3 px-4 font-semibold">Classification</th>
                  <th className="py-3 px-4 font-semibold">Department & Role</th>
                  <th className="py-3 px-4 font-semibold">Payout Account</th>
                  <th className="py-3 px-4 font-semibold">Monthly Base</th>
                  <th className="py-3 px-4 font-semibold">Verification</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filtered.map((worker) => (
                  <tr key={worker.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
                    {/* Worker Details */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white text-sm">{worker.display_name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                        <span>{worker.email || 'No email registered'}</span>
                      </div>
                    </td>

                    {/* Classification */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded uppercase ${
                          worker.recipient_type === 'employee'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                            : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                        }`}
                      >
                        {worker.recipient_type === 'employee' ? 'Full-Time Employee' : 'Contractor'}
                      </span>
                    </td>

                    {/* Department & Role */}
                    <td className="py-3.5 px-4">
                      <div className="text-slate-800 dark:text-slate-200 font-medium">{worker.job_title || 'Worker'}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">{worker.department || 'General'}</div>
                    </td>

                    {/* Payout Account */}
                    <td className="py-3.5 px-4">
                      <div className="text-slate-800 dark:text-slate-200 flex items-center gap-1 font-medium">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        <span>{worker.bank_name || 'Bank Account'}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                        {truncateAccount(worker.account_number)} • {worker.country} ({worker.currency})
                      </div>
                    </td>

                    {/* Monthly Base */}
                    <td className="py-3.5 px-4 tabular-nums">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {formatMinorUnits(worker.default_salary_minor || '0', worker.currency)}
                      </div>
                      <div className="text-[10px] text-slate-500">Scheduled cycle base</div>
                    </td>

                    {/* Verification */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <Badge status={worker.verification_level} />
                      {worker.is_flagged && (
                        <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>ProofRail Flagged</span>
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {onSelectWorkerForPayout && (
                        <button
                          onClick={() => onSelectWorkerForPayout(worker)}
                          className="px-2.5 py-1 rounded bg-slate-100 dark:bg-white/5 hover:bg-emerald-500/20 text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors cursor-pointer text-xs font-medium"
                        >
                          Disburse
                        </button>
                      )}
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

