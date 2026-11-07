import React, { useState, useRef, useEffect } from 'react';
import {
  Building2,
  ChevronDown,
  Layers,
  ShieldCheck,
  Send,
  FileText,
  Users,
  CheckCircle2,
  History,
  Activity,
  UserCheck,
  Briefcase,
  LogOut,
  Clock,
  AlertTriangle,
  User as UserIcon,
  Shield,
  Check,
  Sun,
  Moon,
  Menu,
  X,
} from 'lucide-react';
import { Organisation, User } from '../../lib/types.js';
import { getInitialTheme, toggleTheme, Theme } from '../../lib/theme.js';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  organisation: Organisation | null;
  organisations?: Organisation[];
  onSwitchOrganisation?: (org: Organisation) => void;
  currentUser: User | null;
  availablePersonas: User[];
  onSelectPersona: (user: User) => void;
  onSignOut: () => void;
  isEmulator: boolean;
  pendingApprovalsCount: number;
  criticalRisksCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  organisation,
  organisations = [],
  onSwitchOrganisation,
  currentUser,
  availablePersonas,
  onSelectPersona,
  onSignOut,
  isEmulator,
  pendingApprovalsCount,
  criticalRisksCount,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<Theme>(getInitialTheme());
  const menuRef = useRef<HTMLDivElement>(null);

  // Sync theme changes if triggered externally
  useEffect(() => {
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ theme: Theme }>;
      if (customEvent.detail?.theme) {
        setCurrentTheme(customEvent.detail.theme);
      }
    };
    window.addEventListener('atlas_theme_changed', handleThemeChange);
    return () => window.removeEventListener('atlas_theme_changed', handleThemeChange);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: <Layers className="w-4 h-4 shrink-0" /> },
    { id: 'payroll', label: 'Payroll', icon: <Briefcase className="w-4 h-4 shrink-0" /> },
    { id: 'invoices', label: 'Invoices', icon: <FileText className="w-4 h-4 shrink-0" /> },
    { id: 'suppliers', label: 'Suppliers', icon: <Users className="w-4 h-4 shrink-0" /> },
    {
      id: 'proofrail',
      label: 'ProofRail',
      icon: <ShieldCheck className="w-4 h-4 shrink-0" />,
      badge: criticalRisksCount > 0 ? criticalRisksCount : undefined,
      badgeColor: 'bg-rose-500/20 text-rose-500 dark:text-rose-400 border-rose-500/30',
    },
    {
      id: 'approvals',
      label: 'Approvals',
      icon: <CheckCircle2 className="w-4 h-4 shrink-0" />,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30',
    },
    { id: 'payments', label: 'Relay Payments', icon: <Send className="w-4 h-4 shrink-0" /> },
    { id: 'recipients', label: 'Recipients', icon: <UserCheck className="w-4 h-4 shrink-0" /> },
    { id: 'audit', label: 'Audit & Recon', icon: <History className="w-4 h-4 shrink-0" /> },
  ];

  // KYB Verification status renderer
  const renderKybBadge = () => {
    const status = organisation?.kyb_verification_status || organisation?.onboarding_status;
    if (status === 'verified') {
      return (
        <span
          className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold flex items-center gap-1 shrink-0"
          title="Verified enterprise business credentials"
        >
          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500 dark:text-emerald-400" />
          KYB VERIFIED
        </span>
      );
    }
    if (status === 'pending_review' || status === 'pending_verification') {
      return (
        <span
          className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[10px] font-semibold flex items-center gap-1 shrink-0"
          title="Compliance documents submitted & awaiting verification. Operational sandbox enabled."
        >
          <Clock className="w-2.5 h-2.5 text-amber-500 dark:text-amber-400" />
          KYB PENDING REVIEW
        </span>
      );
    }
    return (
      <span
        className="px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-[10px] font-semibold flex items-center gap-1 shrink-0"
        title="Unverified business profile"
      >
        <AlertTriangle className="w-2.5 h-2.5 text-rose-500 dark:text-rose-400" />
        KYB UNVERIFIED
      </span>
    );
  };

  const handleToggleTheme = () => {
    const next = toggleTheme();
    setCurrentTheme(next);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#090C10]/95 backdrop-blur-md border-b border-slate-200 dark:border-white/8 transition-colors">
      {/* Top Banner: Status, Context & Theme Toggle */}
      <div className="px-4 py-1.5 bg-slate-100/90 dark:bg-[#0D1117] border-b border-slate-200 dark:border-white/5 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 gap-2 overflow-x-auto min-w-0 scrollbar-none">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden xs:inline">BLAAIZ SANDBOX {isEmulator ? '(EMULATOR)' : '(LIVE API)'}</span>
            <span className="xs:hidden">SANDBOX</span>
          </div>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <Building2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
            <span className="text-slate-800 dark:text-slate-200 font-medium truncate max-w-[110px] sm:max-w-[200px]">
              {organisation?.name || 'Workspace'}
            </span>
            <span className="px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400 text-[10px] font-mono shrink-0 hidden sm:inline-block">
              {organisation?.country || 'NGA'} • {organisation?.base_currency || 'NGN'}
            </span>
            <div className="hidden md:inline-flex">{renderKybBadge()}</div>
          </div>
        </div>

        {/* Right Controls: Theme Toggle & User Menu */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Theme Toggle Button */}
          <button
            onClick={handleToggleTheme}
            aria-label={`Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} mode`}
            className="p-1.5 rounded-lg bg-white dark:bg-[#161B22] hover:bg-slate-200 dark:hover:bg-[#21262D] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer flex items-center justify-center shadow-xs"
          >
            {currentTheme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-slate-700" />
            )}
          </button>

          {/* User Profile & Account Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 rounded-lg bg-white dark:bg-[#161B22] hover:bg-slate-100 dark:hover:bg-[#21262D] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer shadow-xs"
            >
              <div className="w-2 h-2 rounded-full bg-cyan-500 shrink-0" />
              <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[80px] sm:max-w-[130px]">
                {currentUser?.full_name || 'User'}
              </span>
              <span className="text-[10px] text-cyan-700 dark:text-cyan-300 font-mono uppercase px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950/60 border border-cyan-300 dark:border-cyan-800/40 hidden sm:inline-block">
                {currentUser?.role?.replace('_', ' ') || 'Member'}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-500 dark:text-slate-400 shrink-0" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-72 bg-white dark:bg-[#161B22] border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl p-2 z-50 divide-y divide-slate-100 dark:divide-white/5">
                {/* User Identity Header */}
                <div className="px-3 py-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 dark:text-white text-xs">{currentUser?.full_name}</span>
                    <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      {currentUser?.is_email_verified ? 'Verified ✓' : 'Unverified'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{currentUser?.email}</div>
                  <div className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono uppercase pt-0.5">
                    Role: {currentUser?.role?.replace('_', ' ')}
                  </div>
                  <div className="md:hidden pt-1">{renderKybBadge()}</div>
                </div>

                {/* Workspaces Switcher if Multiple */}
                {organisations.length > 1 && (
                  <div className="py-1.5">
                    <div className="px-3 py-1 text-[10px] uppercase font-mono tracking-wider text-slate-500 dark:text-slate-400">
                      Switch Workspace
                    </div>
                    <div className="space-y-0.5">
                      {organisations.map((org) => {
                        const isCurrent = org.id === organisation?.id;
                        return (
                          <button
                            key={org.id}
                            onClick={() => {
                              if (onSwitchOrganisation) onSwitchOrganisation(org);
                              setIsMenuOpen(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors ${
                              isCurrent
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                            }`}
                          >
                            <div className="truncate">
                              <div className="truncate">{org.name}</div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">{org.country} • {org.base_currency}</div>
                            </div>
                            {isCurrent && <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Persona Switcher for Evaluator Demo Testing */}
                {availablePersonas && availablePersonas.length > 0 && (
                  <div className="py-1.5">
                    <div className="px-3 py-1 text-[10px] uppercase font-mono tracking-wider text-slate-500 dark:text-slate-400">
                      Sandbox Personas (RBAC Demo)
                    </div>
                    <div className="space-y-0.5">
                      {availablePersonas.map((p) => {
                        const isCurrent = currentUser?.id === p.id;
                        return (
                          <button
                            key={p.id}
                            onClick={() => {
                              onSelectPersona(p);
                              setIsMenuOpen(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors ${
                              isCurrent
                                ? 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 font-medium'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                            }`}
                          >
                            <div>
                              <div className="text-slate-800 dark:text-slate-200">{p.full_name}</div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-mono">{p.role}</div>
                            </div>
                            {isCurrent && <Check className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Sign Out Action */}
                <div className="pt-1.5">
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onSignOut();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center gap-2 cursor-pointer transition-colors font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out of ATLAS</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14 gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-950/20 dark:shadow-emerald-950/50 border border-emerald-400/30 shrink-0">
            <Activity className="w-4 h-4 sm:w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white font-['Plus_Jakarta_Sans']">ATLAS</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
                v1.0
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wide hidden xs:block">
              COMMERCE • PROOFRAIL • RELAY
            </p>
          </div>
        </div>

        {/* Tab Navigation for Desktop & Tablets (Responsive scrollable container) */}
        <nav className="hidden sm:flex items-center gap-1 overflow-x-auto min-w-0 scrollbar-none py-1.5 px-1">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`shrink-0 relative px-2.5 lg:px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-500/10 dark:bg-white/10 text-emerald-700 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold border ${item.badgeColor || 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200'}`}
                  >
                    {item.badge}
                  </span>
                )}
                {isActive && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-emerald-500 rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Mobile Navigation Menu Toggle (<640px) */}
        <div className="flex sm:hidden items-center">
          <button
            onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
            aria-label="Toggle navigation menu"
            className="p-2 rounded-lg bg-slate-100 dark:bg-[#161B22] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#21262D] cursor-pointer"
          >
            {isMobileNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation (<640px) */}
      {isMobileNavOpen && (
        <div className="sm:hidden px-4 pb-4 pt-2 border-t border-slate-200 dark:border-white/5 bg-white dark:bg-[#0D1117] grid grid-cols-2 gap-1.5 text-xs animate-in slide-in-from-top-2 duration-200">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  setIsMobileNavOpen(false);
                }}
                className={`px-3 py-2 rounded-lg font-medium flex items-center justify-between transition-colors cursor-pointer text-left ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-500/30'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold border shrink-0 ${item.badgeColor || 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200'}`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
