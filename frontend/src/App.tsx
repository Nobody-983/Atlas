import React, { useEffect, useState } from 'react';
import { api, authStorage } from './lib/api.js';
import {
  AnalyticsOverview,
  AuditEvent,
  Invoice,
  Organisation,
  OrganisationPolicy,
  Payment,
  PaymentRequest,
  Recipient,
  Supplier,
  User,
} from './lib/types.js';
import { Navbar } from './components/layout/Navbar.js';
import { AuthView } from './components/auth/AuthView.js';
import { BusinessOnboardingView } from './components/onboarding/BusinessOnboardingView.js';
import { OverviewView } from './components/dashboard/OverviewView.js';
import { PayrollWorkspace } from './components/payroll/PayrollWorkspace.js';
import { InvoiceWorkspace } from './components/commerce/InvoiceWorkspace.js';
import { SupplierDirectory } from './components/commerce/SupplierDirectory.js';
import { ProofRailView } from './components/proofrail/ProofRailView.js';
import { ApprovalInbox } from './components/approvals/ApprovalInbox.js';
import { RelayPaymentsView } from './components/relay/RelayPaymentsView.js';
import { RecipientsView } from './components/recipients/RecipientsView.js';
import { AuditView } from './components/audit/AuditView.js';

// Modals
import { InvoiceUploadModal } from './components/modals/InvoiceUploadModal.js';
import { PaymentInitiatorModal } from './components/modals/PaymentInitiatorModal.js';
import { PaymentDetailModal } from './components/modals/PaymentDetailModal.js';
import { RecipientChangeModal } from './components/modals/RecipientChangeModal.js';
import { CreateSupplierModal } from './components/modals/CreateSupplierModal.js';
import { CreateRecipientModal } from './components/modals/CreateRecipientModal.js';
import { Activity, Loader2 } from 'lucide-react';

type AuthStatus = 'loading' | 'unauthenticated' | 'needs_verification' | 'needs_onboarding' | 'authenticated';

export function App() {
  const [currentTab, setCurrentTab] = useState<string>('overview');

  // Authentication & Session State
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string>('');

  // Multi-tenant & Persona state
  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [policy, setPolicy] = useState<OrganisationPolicy | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [availablePersonas, setAvailablePersonas] = useState<User[]>([]);
  const [isEmulator, setIsEmulator] = useState(true);

  // Data states
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PaymentRequest[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);

  // Modals & interaction state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isPayoutOpen, setIsPayoutOpen] = useState(false);
  const [isCreateSupplierOpen, setIsCreateSupplierOpen] = useState(false);
  const [isCreateRecipientOpen, setIsCreateRecipientOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [editingRecipient, setEditingRecipient] = useState<Recipient | null>(null);
  const [isReconciling, setIsReconciling] = useState(false);
  const [reconciliationSummary, setReconciliationSummary] = useState<any | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const orgId = organisation?.id || '';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async (activeOrgId: string, userId?: string) => {
    if (!activeOrgId) return;
    try {
      const [sessionData, healthData, analyticsData, invData, suppData, recipData, appData, payData, auditData] =
        await Promise.all([
          api.getSession(activeOrgId, userId).catch(() => ({ organisation: null, user: null, availablePersonas: [] })),
          api.getHealth().catch(() => ({})),
          api.getAnalytics(activeOrgId).catch(() => ({ summary: null })),
          api.getInvoices(activeOrgId).catch(() => ({ invoices: [] })),
          api.getSuppliers(activeOrgId).catch(() => ({ suppliers: [] })),
          api.getRecipients(activeOrgId).catch(() => ({ recipients: [] })),
          api.getPendingApprovals(activeOrgId).catch(() => ({ pendingApprovals: [] })),
          api.getPayments(activeOrgId).catch(() => ({ payments: [] })),
          api.getAuditEvents(activeOrgId).catch(() => ({ auditEvents: [] })),
        ]);

      if (sessionData.organisation) setOrganisation(sessionData.organisation);
      if (sessionData.user) {
        setCurrentUser((prev) => ({
          ...(prev || sessionData.user),
          ...sessionData.user,
          role: sessionData.role || sessionData.user.role || prev?.role || 'member',
        }));
      }
      if (sessionData.organisations) setOrganisations(sessionData.organisations);
      if (sessionData.availablePersonas) setAvailablePersonas(sessionData.availablePersonas);

      if (healthData?.blaaiz) {
        setIsEmulator(healthData.blaaiz.isEmulatorActive);
      }

      setAnalytics(analyticsData.summary || null);
      setInvoices(invData.invoices || []);
      setSuppliers(suppData.suppliers || []);
      setRecipients(recipData.recipients || []);
      setPendingApprovals(appData.pendingApprovals || []);
      setPayments(payData.payments || []);
      setAuditEvents(auditData.auditEvents || []);

      // Load policy
      try {
        const orgDetail = await api.getOrganisation(activeOrgId);
        if (orgDetail.policy) setPolicy(orgDetail.policy);
      } catch (e) {
        // No policy found
      }
    } catch (err) {
      console.error('Error loading ATLAS data:', err);
    }
  };

  // Check Cryptographic Session on Initial Load
  const initAuth = async () => {
    const token = authStorage.getToken();
    if (!token) {
      setAuthStatus('unauthenticated');
      return;
    }

    try {
      const activeOrgId = authStorage.getActiveOrgId() || undefined;
      const sessionData = await api.getSession(activeOrgId);

      if (!sessionData.user) {
        authStorage.removeToken();
        setAuthStatus('unauthenticated');
        return;
      }

      setCurrentUser(sessionData.user);
      if (sessionData.organisations) {
        setOrganisations(sessionData.organisations);
      }

      if (!sessionData.user.is_email_verified) {
        setPendingVerificationEmail(sessionData.user.email);
        setAuthStatus('needs_verification');
        return;
      }

      if (sessionData.needsOnboarding || !sessionData.organisation) {
        setAuthStatus('needs_onboarding');
        return;
      }

      const activeOrg = sessionData.organisation;
      setOrganisation(activeOrg);
      if (sessionData.role) {
        setCurrentUser({ ...sessionData.user, role: sessionData.role });
      }
      if (sessionData.availablePersonas) {
        setAvailablePersonas(sessionData.availablePersonas);
      }

      setAuthStatus('authenticated');
      await loadData(activeOrg.id, sessionData.user.id);
    } catch (err) {
      console.error('Session validation error:', err);
      authStorage.removeToken();
      setAuthStatus('unauthenticated');
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  // Authentication Handlers
  const handleAuthenticated = (user: User, org: Organisation | null, orgs: Organisation[], needsOnboarding: boolean) => {
    setCurrentUser(user);
    if (!user.is_email_verified) {
      setPendingVerificationEmail(user.email);
      setAuthStatus('needs_verification');
      return;
    }

    if (needsOnboarding || !org) {
      setOrganisations(orgs || []);
      setAuthStatus('needs_onboarding');
      return;
    }

    setOrganisation(org);
    setOrganisations(orgs || [org]);
    authStorage.setActiveOrgId(org.id);
    setAuthStatus('authenticated');
    loadData(org.id, user.id);
    showToast(`Authenticated as ${user.full_name}`);
  };

  const handleOnboardingCompleted = (newOrg: Organisation, role: string) => {
    setOrganisation(newOrg);
    setOrganisations((prev) => [...prev.filter((o) => o.id !== newOrg.id), newOrg]);
    authStorage.setActiveOrgId(newOrg.id);
    if (currentUser) {
      setCurrentUser({ ...currentUser, role });
    }
    setAuthStatus('authenticated');
    loadData(newOrg.id, currentUser?.id);
    showToast(`Workspace "${newOrg.name}" activated successfully!`);
  };

  const handleSignOut = async () => {
    try {
      await api.logout();
    } catch (e) {
      // Ignore
    }
    authStorage.removeToken();
    setOrganisation(null);
    setCurrentUser(null);
    setOrganisations([]);
    setPolicy(null);
    setInvoices([]);
    setSuppliers([]);
    setRecipients([]);
    setPayments([]);
    setPendingApprovals([]);
    setAnalytics(null);
    setAuditEvents([]);
    setAuthStatus('unauthenticated');
    showToast('Signed out of ATLAS.');
  };

  const handleSwitchOrganisation = async (newOrg: Organisation) => {
    setOrganisation(newOrg);
    authStorage.setActiveOrgId(newOrg.id);
    await loadData(newOrg.id, currentUser?.id);
    showToast(`Switched active workspace to ${newOrg.name}`);
  };

  const handleSelectPersona = (p: User) => {
    setCurrentUser(p);
    loadData(orgId, p.id);
    showToast(`Switched active identity to ${p.full_name} (${p.role?.toUpperCase()})`);
  };

  const handleRunReconciliation = async () => {
    setIsReconciling(true);
    try {
      const res = await api.runReconciliation(orgId);
      if (res.reconciliation) {
        setReconciliationSummary(res.reconciliation);
        showToast('Ledger reconciliation completed: 0 discrepancies found.');
      }
      loadData(orgId, currentUser?.id);
    } catch (err: any) {
      showToast(`Reconciliation error: ${err.message}`);
    } finally {
      setIsReconciling(false);
    }
  };

  const handleApprovePayment = async (req: PaymentRequest) => {
    try {
      await api.decideApproval({
        paymentRequestId: req.id,
        approverId: currentUser?.id,
        decision: 'approved',
        notes: `Authorized by ${currentUser?.full_name} (${currentUser?.role})`,
      });
      showToast(`Payment request for ${req.recipient_name} approved!`);
      loadData(orgId, currentUser?.id);
    } catch (err: any) {
      showToast(`Approval failed: ${err.message}`);
    }
  };

  const handleRejectPayment = async (req: PaymentRequest) => {
    try {
      await api.decideApproval({
        paymentRequestId: req.id,
        approverId: currentUser?.id,
        decision: 'rejected',
        rejectionReason: 'Declined during human review.',
      });
      showToast(`Payment request declined.`);
      loadData(orgId, currentUser?.id);
    } catch (err: any) {
      showToast(`Rejection failed: ${err.message}`);
    }
  };

  // State: Loading Session
  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#090C10] text-slate-800 dark:text-[#E6EDF3] flex flex-col items-center justify-center font-['Plus_Jakarta_Sans',sans-serif] transition-colors">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-xl shadow-emerald-950/20 dark:shadow-emerald-950/50 border border-emerald-400/30 mb-4 animate-pulse">
          <Activity className="w-6 h-6 text-white" />
        </div>
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 text-sm font-medium">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-500 dark:text-emerald-400" />
          <span>Verifying cryptographic session...</span>
        </div>
        <p className="text-xs text-slate-500 mt-1">Establishing authenticated connection to ATLAS API</p>
      </div>
    );
  }

  // State: Unauthenticated (Login / Signup)
  if (authStatus === 'unauthenticated') {
    return <AuthView onAuthenticated={handleAuthenticated} />;
  }

  // State: Needs Email Verification
  if (authStatus === 'needs_verification') {
    return (
      <AuthView
        initialMode="verify_email"
        pendingEmail={pendingVerificationEmail || currentUser?.email || ''}
        onAuthenticated={handleAuthenticated}
      />
    );
  }

  // State: Needs Business Onboarding
  if (authStatus === 'needs_onboarding' && currentUser) {
    return (
      <BusinessOnboardingView
        currentUser={currentUser}
        onOnboardingCompleted={handleOnboardingCompleted}
        onSignOut={handleSignOut}
      />
    );
  }

  // State: Fully Authenticated Workspace
  const flaggedRecipients = recipients.filter((r) => r.is_flagged);
  const criticalRisksCount = Number(analytics?.risks?.critical_count || 0) + flaggedRecipients.length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090C10] text-slate-900 dark:text-[#E6EDF3] flex flex-col font-['Plus_Jakarta_Sans',sans-serif] transition-colors duration-150">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-emerald-600 text-white font-medium text-xs shadow-2xl shadow-emerald-950 flex items-center gap-2 border border-emerald-400/30 animate-bounce">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        organisation={organisation}
        organisations={organisations}
        onSwitchOrganisation={handleSwitchOrganisation}
        currentUser={currentUser}
        availablePersonas={availablePersonas}
        onSelectPersona={handleSelectPersona}
        onSignOut={handleSignOut}
        isEmulator={isEmulator}
        pendingApprovalsCount={pendingApprovals.length}
        criticalRisksCount={criticalRisksCount}
      />

      {/* Main Workspace Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 min-w-0">
        {currentTab === 'overview' && (
          <OverviewView
            analytics={analytics}
            pendingApprovals={pendingApprovals}
            recentPayments={payments}
            onOpenUpload={() => setIsUploadOpen(true)}
            onOpenPayout={() => setIsPayoutOpen(true)}
            onNavigateTab={setCurrentTab}
            onSelectPayment={setSelectedPayment}
            onRunReconciliation={handleRunReconciliation}
            isReconciling={isReconciling}
          />
        )}

        {currentTab === 'payroll' && (
          <PayrollWorkspace
            currentUser={currentUser}
            orgId={orgId}
            onNavigateTab={setCurrentTab}
          />
        )}

        {currentTab === 'invoices' && (
          <InvoiceWorkspace
            invoices={invoices}
            onOpenUpload={() => setIsUploadOpen(true)}
            onSelectInvoice={(inv) => {
              showToast(`Inspecting invoice ${inv.invoice_number}`);
            }}
            onInitiatePaymentForInvoice={(_inv) => {
              setIsPayoutOpen(true);
            }}
          />
        )}

        {currentTab === 'suppliers' && (
          <SupplierDirectory
            suppliers={suppliers}
            onOpenCreateSupplier={() => setIsCreateSupplierOpen(true)}
            onSelectSupplier={(s) => {
              showToast(`Selected supplier: ${s.name}`);
            }}
          />
        )}

        {currentTab === 'proofrail' && (
          <ProofRailView
            policy={policy}
            flaggedRecipients={flaggedRecipients}
            onReviewRecipientChange={(r) => setEditingRecipient(r)}
            onOpenPolicyConfig={() => {
              showToast('Policy parameters locked to organization admin');
            }}
          />
        )}

        {currentTab === 'approvals' && (
          <ApprovalInbox
            requests={pendingApprovals}
            onApprove={handleApprovePayment}
            onReject={handleRejectPayment}
            onViewInvoice={(_invId) => {
              setCurrentTab('invoices');
            }}
          />
        )}

        {currentTab === 'payments' && (
          <RelayPaymentsView
            payments={payments}
            onOpenNewPayout={() => setIsPayoutOpen(true)}
            onSelectPayment={setSelectedPayment}
            onRefresh={() => loadData(orgId, currentUser?.id)}
            isRefreshing={false}
          />
        )}

        {currentTab === 'recipients' && (
          <RecipientsView
            recipients={recipients}
            onOpenCreateRecipient={() => setIsCreateRecipientOpen(true)}
            onOpenEditBank={(r) => setEditingRecipient(r)}
            onClearFlag={(r) => setEditingRecipient(r)}
          />
        )}

        {currentTab === 'audit' && (
          <AuditView
            auditEvents={auditEvents}
            onRunReconciliation={handleRunReconciliation}
            isReconciling={isReconciling}
            reconciliationSummary={reconciliationSummary}
          />
        )}
      </main>

      {/* Modals */}
      <InvoiceUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        suppliers={suppliers}
        orgId={orgId}
        onUploadSuccess={(data) => {
          showToast(`Invoice ${data.invoice?.invoice_number || ''} extracted successfully!`);
          loadData(orgId, currentUser?.id);
        }}
      />

      <PaymentInitiatorModal
        isOpen={isPayoutOpen}
        onClose={() => setIsPayoutOpen(false)}
        recipients={recipients}
        orgId={orgId}
        onSuccess={(data) => {
          showToast(`Payment request submitted for ${data.paymentRequest?.destination_currency} payout!`);
          loadData(orgId, currentUser?.id);
          setCurrentTab('approvals');
        }}
      />

      <PaymentDetailModal
        payment={selectedPayment}
        onClose={() => setSelectedPayment(null)}
      />

      <RecipientChangeModal
        recipient={editingRecipient}
        isOpen={Boolean(editingRecipient)}
        onClose={() => setEditingRecipient(null)}
        onSuccess={() => {
          showToast('Beneficiary updated and ProofRail rules re-evaluated!');
          loadData(orgId, currentUser?.id);
        }}
      />

      <CreateSupplierModal
        isOpen={isCreateSupplierOpen}
        onClose={() => setIsCreateSupplierOpen(false)}
        orgId={orgId}
        onSuccess={(supplier) => {
          showToast(`Supplier ${supplier.name} registered successfully!`);
          loadData(orgId, currentUser?.id);
        }}
      />

      <CreateRecipientModal
        isOpen={isCreateRecipientOpen}
        onClose={() => setIsCreateRecipientOpen(false)}
        orgId={orgId}
        suppliers={suppliers}
        onSuccess={(recip) => {
          showToast(`Recipient ${recip.display_name} registered successfully!`);
          loadData(orgId, currentUser?.id);
        }}
      />
    </div>
  );
}

export default App;
