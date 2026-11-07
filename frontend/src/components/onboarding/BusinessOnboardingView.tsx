import React, { useState, useEffect } from 'react';
import {
  Building2,
  UserCheck,
  Globe2,
  FileText,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Save,
  AlertTriangle,
  Upload,
  Lock,
  Clock,
  Sparkles,
  Sun,
  Moon,
} from 'lucide-react';
import { api, authStorage } from '../../lib/api.js';
import { Organisation, User } from '../../lib/types.js';
import { Button } from '../common/Button.js';
import { getInitialTheme, toggleTheme, Theme } from '../../lib/theme.js';

interface BusinessOnboardingViewProps {
  currentUser: User;
  onOnboardingCompleted: (organisation: Organisation, role: string) => void;
  onSignOut: () => void;
}

export const BusinessOnboardingView: React.FC<BusinessOnboardingViewProps> = ({
  currentUser,
  onOnboardingCompleted,
  onSignOut,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [currentTheme, setCurrentTheme] = useState<Theme>(getInitialTheme());

  // Step 1: Personal Details
  const [jobTitle, setJobTitle] = useState('Managing Director');
  const [phoneNumber, setPhoneNumber] = useState(currentUser.phone_number || '');
  const [userRole, setUserRole] = useState<'owner' | 'finance_manager' | 'approver'>('owner');

  // Step 2: Business Profile
  const [businessName, setBusinessName] = useState('');
  const [country, setCountry] = useState('NGA');
  const [businessType, setBusinessType] = useState('limited_company');
  const [baseCurrency, setBaseCurrency] = useState('NGN');

  // Step 3: Contact & Address
  const [contactEmail, setContactEmail] = useState(currentUser.email);
  const [contactPhone, setContactPhone] = useState(currentUser.phone_number || '');
  const [website, setWebsite] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [stateProvince, setStateProvince] = useState('');
  const [postalCode, setPostalCode] = useState('');

  // Step 4: Verification Information & KYB
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [taxId, setTaxId] = useState('');
  const [kybDocuments, setKybDocuments] = useState<Array<{ documentType: string; fileName: string; referenceNumber?: string }>>([
    { documentType: 'certificate_of_incorporation', fileName: 'Certificate_of_Incorporation.pdf', referenceNumber: '' },
    { documentType: 'director_id', fileName: 'Director_Government_ID.pdf', referenceNumber: '' },
  ]);

  // Loading & Error States
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftSavedMsg, setDraftSavedMsg] = useState<string | null>(null);

  // Load existing draft if present
  useEffect(() => {
    api.getOnboardingDraft()
      .then((data) => {
        if (data.draft) {
          const d = data.draft;
          if (d.businessName) setBusinessName(d.businessName);
          if (d.country) setCountry(d.country);
          if (d.businessType) setBusinessType(d.businessType);
          if (d.baseCurrency) setBaseCurrency(d.baseCurrency);
          if (d.jobTitle) setJobTitle(d.jobTitle);
          if (d.phoneNumber) setPhoneNumber(d.phoneNumber);
          if (d.contactEmail) setContactEmail(d.contactEmail);
          if (d.contactPhone) setContactPhone(d.contactPhone);
          if (d.website) setWebsite(d.website);
          if (d.registrationNumber) setRegistrationNumber(d.registrationNumber);
          if (d.taxId) setTaxId(d.taxId);
          if (d.operatingAddress) {
            setStreet(d.operatingAddress.street || '');
            setCity(d.operatingAddress.city || '');
            setStateProvince(d.operatingAddress.state || '');
            setPostalCode(d.operatingAddress.postalCode || '');
          }
          if (data.onboardingStep && data.onboardingStep >= 1 && data.onboardingStep <= 5) {
            setStep(data.onboardingStep as any);
          }
        }
      })
      .catch((err) => console.log('No prior onboarding draft found:', err.message));
  }, []);

  const handleCountryChange = (c: string) => {
    setCountry(c);
    if (c === 'NGA') setBaseCurrency('NGN');
    else if (c === 'USA') setBaseCurrency('USD');
    else if (c === 'GBR') setBaseCurrency('GBP');
    else if (c === 'KEN') setBaseCurrency('KES');
    else if (c === 'CAN') setBaseCurrency('CAD');
    else if (c === 'DEU') setBaseCurrency('EUR');
  };

  const getPayload = () => ({
    jobTitle,
    phoneNumber,
    userRole,
    businessName,
    country,
    businessType,
    baseCurrency,
    contactEmail,
    contactPhone,
    website,
    operatingAddress: {
      street,
      city,
      state: stateProvince,
      postalCode,
      country,
    },
    registrationNumber,
    taxId,
    kybDocuments,
  });

  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    setError(null);
    try {
      await api.saveOnboardingDraft({
        step,
        draftData: getPayload(),
      });
      setDraftSavedMsg('Progress saved successfully. You may safely exit and resume later.');
      setTimeout(() => setDraftSavedMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to save draft.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleComplete = async () => {
    if (!businessName.trim()) {
      setError('Please provide your legal business name.');
      setStep(2);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await api.completeOnboarding(getPayload());
      if (data.organisation) {
        authStorage.setActiveOrgId(data.organisation.id);
        onOnboardingCompleted(data.organisation, data.role || userRole);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to complete business workspace registration.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleTheme = () => {
    const next = toggleTheme();
    setCurrentTheme(next);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090C10] flex flex-col font-['Plus_Jakarta_Sans',sans-serif] transition-colors">
      {/* Top Bar */}
      <header className="px-4 sm:px-6 py-3.5 bg-white dark:bg-[#0D1117] border-b border-slate-200 dark:border-white/8 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-bold shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">ATLAS Business Onboarding</h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Signed in as <strong className="text-slate-800 dark:text-slate-200">{currentUser.full_name}</strong> ({currentUser.email})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleToggleTheme}
            aria-label={`Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} mode`}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-[#161B22] hover:bg-slate-200 dark:hover:bg-[#21262D] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            {currentTheme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-slate-700" />
            )}
          </button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Save className="w-3.5 h-3.5" />}
            onClick={handleSaveDraft}
            isLoading={isSavingDraft}
          >
            Save Draft
          </Button>
          <Button variant="ghost" size="sm" onClick={onSignOut}>
            Sign Out
          </Button>
        </div>
      </header>

      {/* Progress Stepper */}
      <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-6">
        <div className="p-4 rounded-xl bg-white dark:bg-[#0D1117] border border-slate-200 dark:border-white/8 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400 dark:text-slate-500'}`}>
            <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px] font-mono">1</span>
            <span>Account Role</span>
          </div>
          <div className="w-8 h-[1px] bg-slate-200 dark:bg-white/10 hidden sm:block" />
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400 dark:text-slate-500'}`}>
            <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px] font-mono">2</span>
            <span>Legal Profile</span>
          </div>
          <div className="w-8 h-[1px] bg-slate-200 dark:bg-white/10 hidden sm:block" />
          <div className={`flex items-center gap-2 ${step >= 3 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400 dark:text-slate-500'}`}>
            <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px] font-mono">3</span>
            <span>Operating Office</span>
          </div>
          <div className="w-8 h-[1px] bg-slate-200 dark:bg-white/10 hidden sm:block" />
          <div className={`flex items-center gap-2 ${step >= 4 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400 dark:text-slate-500'}`}>
            <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px] font-mono">4</span>
            <span>KYB Verification</span>
          </div>
          <div className="w-8 h-[1px] bg-slate-200 dark:bg-white/10 hidden sm:block" />
          <div className={`flex items-center gap-2 ${step >= 5 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400 dark:text-slate-500'}`}>
            <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px] font-mono">5</span>
            <span>Activation</span>
          </div>
        </div>

        {draftSavedMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{draftSavedMsg}</span>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Card Content */}
        <div className="mt-6 p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#0D1117] border border-slate-200 dark:border-white/8 shadow-2xl space-y-6 text-xs">
          {/* STEP 1: PERSONAL ACCOUNT DETAILS & ROLE */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">Step 1: Account Identity & Workspace Role</h2>
                <p className="text-slate-400 text-xs mt-1">
                  Specify your corporate role within this business organization. Permissions will be enforced deterministically on the backend.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">Your Executive / Job Title</label>
                  <input
                    type="text"
                    required
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Managing Director or Head of Finance"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#161B22] border border-white/10 text-white focus:outline-none focus:border-emerald-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">Direct Phone / Callback Number</label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+234 803 000 0000"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#161B22] border border-white/10 text-white focus:outline-none focus:border-emerald-500 font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-2">Select Your Workspace Role</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setUserRole('owner')}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-colors ${
                      userRole === 'owner'
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-950/40'
                        : 'bg-[#161B22] border-white/10 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <div className="font-bold text-white text-sm">Business Owner</div>
                    <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Full administrative authority, policy configuration, executive dual approval, and payout execution.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUserRole('finance_manager')}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-colors ${
                      userRole === 'finance_manager'
                        ? 'bg-cyan-500/10 border-cyan-500 text-cyan-300 shadow-lg shadow-cyan-950/40'
                        : 'bg-[#161B22] border-white/10 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <div className="font-bold text-white text-sm">Finance Manager</div>
                    <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Initiate supplier invoices, request Blaaiz FX quotes, prepare payment runs, and reconcile ledgers.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUserRole('approver')}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-colors ${
                      userRole === 'approver'
                        ? 'bg-amber-500/10 border-amber-500 text-amber-300 shadow-lg shadow-amber-950/40'
                        : 'bg-[#161B22] border-white/10 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <div className="font-bold text-white text-sm">Approver</div>
                    <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Human-in-the-loop inspection of ProofRail risk flags, dual signature review, and payment authorization.
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: BUSINESS LEGAL PROFILE */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">Step 2: Legal Business Profile</h2>
                <p className="text-slate-400 text-xs mt-1">
                  Enter your registered legal entity credentials for KYB compliance and currency treasury routing.
                </p>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1.5">Registered Legal Entity Name</label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Apex Global Imports & Logistics Ltd"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#161B22] border border-white/10 text-white focus:outline-none focus:border-emerald-500 text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1.5">Country of Registration</label>
                  <select
                    value={country}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#161B22] border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="NGA">Nigeria (NGA)</option>
                    <option value="KEN">Kenya (KEN)</option>
                    <option value="USA">United States (USA)</option>
                    <option value="GBR">United Kingdom (GBR)</option>
                    <option value="CAN">Canada (CAN)</option>
                    <option value="DEU">Germany (DEU)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1.5">Business Structure</label>
                  <select
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#161B22] border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="limited_company">Private Limited Company (Ltd / LLC)</option>
                    <option value="corporation">Corporation (Inc / Corp)</option>
                    <option value="sole_proprietorship">Sole Proprietorship / Enterprise</option>
                    <option value="partnership">General or Limited Partnership</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1.5">Corporate Base Currency</label>
                  <select
                    value={baseCurrency}
                    onChange={(e) => setBaseCurrency(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#161B22] border border-white/10 text-white font-mono focus:outline-none focus:border-emerald-500"
                  >
                    <option value="NGN">NGN (₦) — Nigerian Naira</option>
                    <option value="USD">USD ($) — United States Dollar</option>
                    <option value="KES">KES (KSh) — Kenyan Shilling</option>
                    <option value="GBP">GBP (£) — British Pound</option>
                    <option value="EUR">EUR (€) — Euro</option>
                    <option value="CAD">CAD ($) — Canadian Dollar</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: CONTACT & OPERATING OFFICE */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">Step 3: Contact & Operating Headquarters</h2>
                <p className="text-slate-400 text-xs mt-1">
                  Primary corporate contact channels and physical operating address for regulatory cross-border wire documentation.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Official Company Email</label>
                  <input
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="finance@company.com"
                    className="w-full px-3 py-2 rounded-lg bg-[#161B22] border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Company Phone</label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+234 1 234 5678"
                    className="w-full px-3 py-2 rounded-lg bg-[#161B22] border border-white/10 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Corporate Website (Optional)</label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://company.com"
                    className="w-full px-3 py-2 rounded-lg bg-[#161B22] border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Registered Street Address</label>
                <input
                  type="text"
                  required
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="Plot 12, Commercial Avenue, Victoria Island"
                  className="w-full px-3 py-2 rounded-lg bg-[#161B22] border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Lagos"
                    className="w-full px-3 py-2 rounded-lg bg-[#161B22] border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">State / Province</label>
                  <input
                    type="text"
                    required
                    value={stateProvince}
                    onChange={(e) => setStateProvince(e.target.value)}
                    placeholder="Lagos State"
                    className="w-full px-3 py-2 rounded-lg bg-[#161B22] border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Postal Code</label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="101241"
                    className="w-full px-3 py-2 rounded-lg bg-[#161B22] border border-white/10 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: VERIFICATION & KYB DETAILS */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">Step 4: Required Verification Information (KYB)</h2>
                <p className="text-slate-400 text-xs mt-1">
                  Cross-border payments require verified corporate registration numbers and tax identifiers.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Company Registration Number (RC / EIN / CR)</label>
                  <input
                    type="text"
                    required
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    placeholder="e.g. RC-1849204"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#161B22] border border-white/10 text-white font-mono focus:outline-none focus:border-emerald-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Tax Identification Number (TIN / Tax ID)</label>
                  <input
                    type="text"
                    required
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder="e.g. TIN-09284102-0001"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#161B22] border border-white/10 text-white font-mono focus:outline-none focus:border-emerald-500 text-xs"
                  />
                </div>
              </div>

              {/* KYB Document Registry */}
              <div className="p-4 rounded-xl bg-[#161B22] border border-white/5 space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-white">KYB Document Attestation</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Atlas records corporate document references for submission to regulatory verification partners.
                </p>

                <div className="space-y-2">
                  <div className="p-3 rounded-lg bg-[#0D1117] border border-white/5 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-slate-200">Certificate of Incorporation</div>
                      <div className="text-[10px] text-slate-400">Government registry formation document</div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      ATTACHED: RC_Cert.pdf
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#0D1117] border border-white/5 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-slate-200">Director Identity Verification</div>
                      <div className="text-[10px] text-slate-400">National ID card, International Passport, or BVN</div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      ATTACHED: Director_ID.pdf
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-center gap-2">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>
                    Compliance notice: Your KYB status will remain <strong>"Pending Review"</strong> until validated. You can immediately access test corridors and prepare payment requests.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: REVIEW & ACTIVATE WORKSPACE */}
          {step === 5 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">Step 5: Review & Workspace Activation</h2>
                <p className="text-slate-400 text-xs mt-1">
                  Confirm your legal and operating parameters before activating your business workspace.
                </p>
              </div>

              {/* Review Card */}
              <div className="p-5 rounded-xl bg-[#161B22] border border-white/10 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-400 text-[11px]">Business Legal Name</span>
                    <div className="font-bold text-white text-sm">{businessName || 'Not configured'}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">Country & Base Currency</span>
                    <div className="font-bold text-white text-sm">{country} • {baseCurrency}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">Your Role</span>
                    <div className="font-bold text-emerald-400 text-sm uppercase">{userRole}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">Registration Number</span>
                    <div className="font-mono text-white text-sm">{registrationNumber || 'Not provided'}</div>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/5">
                  <span className="text-slate-400 text-[11px]">Registered Office</span>
                  <div className="text-slate-200 mt-0.5">
                    {street ? `${street}, ${city}, ${stateProvince} ${postalCode}, ${country}` : 'Not provided'}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 to-[#161B22] border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">Ready to initialize your financial rail</div>
                  <div className="text-[11px] text-slate-400">
                    A dedicated enterprise workspace will be established with ProofRail risk rules active.
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleComplete}
                  isLoading={isLoading}
                  icon={<Sparkles className="w-4 h-4" />}
                >
                  Activate Business Workspace
                </Button>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="pt-4 border-t border-white/8 flex items-center justify-between">
            <div>
              {step > 1 && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<ArrowLeft className="w-4 h-4" />}
                  onClick={() => setStep((s) => (s - 1) as any)}
                  disabled={isLoading}
                >
                  Back
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                icon={<Save className="w-3.5 h-3.5" />}
                onClick={handleSaveDraft}
                isLoading={isSavingDraft}
              >
                Save Progress
              </Button>

              {step < 5 && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    if (step === 2 && !businessName.trim()) {
                      setError('Business Legal Name is required to proceed.');
                      return;
                    }
                    setError(null);
                    setStep((s) => (s + 1) as any);
                  }}
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

