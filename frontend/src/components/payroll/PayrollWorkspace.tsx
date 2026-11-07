import React, { useState, useEffect } from 'react';
import {
  Layers,
  Users,
  History,
  Plus,
  UserPlus,
  RefreshCw,
  Briefcase,
} from 'lucide-react';
import { PayrollOverviewData, PayrollRun, Recipient, User } from '../../lib/types.js';
import { api } from '../../lib/api.js';
import { PayrollOverview } from './PayrollOverview.js';
import { PayrollRoster } from './PayrollRoster.js';
import { PayrollHistory } from './PayrollHistory.js';
import { PayrollCreationWizard } from './PayrollCreationWizard.js';
import { PayrollRunDetailModal } from './PayrollRunDetailModal.js';
import { NewWorkerModal } from './NewWorkerModal.js';
import { Button } from '../common/Button.js';

interface PayrollWorkspaceProps {
  currentUser: User | null;
  orgId?: string;
  onNavigateTab: (tab: string) => void;
}

export const PayrollWorkspace: React.FC<PayrollWorkspaceProps> = ({
  currentUser,
  orgId,
  onNavigateTab,
}) => {
  const [subTab, setSubTab] = useState<'overview' | 'roster' | 'history'>('overview');
  const [overviewData, setOverviewData] = useState<PayrollOverviewData | null>(null);
  const [workforceRecipients, setWorkforceRecipients] = useState<Recipient[]>([]);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modals
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isNewWorkerOpen, setIsNewWorkerOpen] = useState(false);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);

  const fetchPayrollData = async () => {
    if (!orgId) return;
    setIsLoading(true);
    try {
      const [oData, rData, runData] = await Promise.all([
        api.getPayrollOverview(orgId).catch(() => null),
        api.getPayrollRecipients(orgId).catch(() => ({ recipients: [] })),
        api.getPayrollRuns(orgId).catch(() => ({ runs: [] })),
      ]);

      if (oData) {
        setOverviewData(oData);
      }
      setWorkforceRecipients(rData?.recipients || []);
      setRuns(runData?.runs || []);
    } catch (err) {
      console.error('Failed to load payroll data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayrollData();
  }, [orgId]);

  return (
    <div className="space-y-6">
      {/* Subnavigation Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 dark:border-white/8 pb-3 gap-4">
        <div className="flex items-center gap-2 overflow-x-auto min-w-0 scrollbar-none py-1">
          <button
            onClick={() => setSubTab('overview')}
            className={`shrink-0 flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${
              subTab === 'overview'
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Payroll Overview</span>
          </button>

          <button
            onClick={() => setSubTab('roster')}
            className={`shrink-0 flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${
              subTab === 'roster'
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Employees & Contractors ({workforceRecipients.length})</span>
          </button>

          <button
            onClick={() => setSubTab('history')}
            className={`shrink-0 flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${
              subTab === 'history'
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Disbursement History ({runs.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            onClick={fetchPayrollData}
            isLoading={isLoading}
          >
            Sync
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<UserPlus className="w-3.5 h-3.5" />}
            onClick={() => setIsNewWorkerOpen(true)}
          >
            Onboard Member
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setIsWizardOpen(true)}
          >
            Create Payroll Run
          </Button>
        </div>
      </div>

      {/* Active Sub-tab View */}
      {subTab === 'overview' && (
        <PayrollOverview
          data={overviewData}
          onOpenNewRun={() => setIsWizardOpen(true)}
          onOpenNewWorker={() => setIsNewWorkerOpen(true)}
          onSelectRun={(run) => setSelectedRun(run)}
          onNavigateTab={onNavigateTab}
          onRefresh={fetchPayrollData}
          isRefreshing={isLoading}
        />
      )}

      {subTab === 'roster' && (
        <PayrollRoster
          recipients={workforceRecipients}
          onOpenNewWorker={() => setIsNewWorkerOpen(true)}
          onSelectWorkerForPayout={() => setIsWizardOpen(true)}
        />
      )}

      {subTab === 'history' && (
        <PayrollHistory
          runs={runs}
          onSelectRun={(run) => setSelectedRun(run)}
          onRefresh={fetchPayrollData}
          isRefreshing={isLoading}
        />
      )}

      {/* Creation Wizard Modal */}
      <PayrollCreationWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        recipients={workforceRecipients}
        orgId={orgId || ''}
        onSuccess={() => {
          fetchPayrollData();
        }}
      />

      {/* Run Inspector & Approval Modal */}
      <PayrollRunDetailModal
        isOpen={!!selectedRun}
        run={selectedRun}
        currentUser={currentUser}
        onClose={() => setSelectedRun(null)}
        onRunUpdated={() => {
          fetchPayrollData();
        }}
      />

      {/* Onboard Team Member Modal */}
      <NewWorkerModal
        isOpen={isNewWorkerOpen}
        onClose={() => setIsNewWorkerOpen(false)}
        orgId={orgId || ''}
        onSuccess={() => {
          fetchPayrollData();
        }}
      />
    </div>
  );
};

