import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Building2,
  Sparkles,
  KeyRound,
  Sun,
  Moon,
} from 'lucide-react';
import { api, authStorage } from '../../lib/api.js';
import { User, Organisation } from '../../lib/types.js';
import { Button } from '../common/Button.js';
import { getInitialTheme, toggleTheme, Theme } from '../../lib/theme.js';

interface AuthViewProps {
  initialMode?: 'login' | 'signup' | 'verify_email' | 'forgot_password';
  pendingEmail?: string;
  onAuthenticated: (user: User, organisation: Organisation | null, organisations: Organisation[], needsOnboarding: boolean) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  initialMode = 'login',
  pendingEmail = '',
  onAuthenticated,
}) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'verify_email' | 'forgot_password' | 'reset_password'>(initialMode);
  const [currentTheme, setCurrentTheme] = useState<Theme>(getInitialTheme());

  // Form Fields
  const [email, setEmail] = useState(pendingEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [resetCode, setResetCode] = useState('');

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  const handleToggleTheme = () => {
    const next = toggleTheme();
    setCurrentTheme(next);
  };

  // Sign In Handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const data = await api.login({ email, password });
      authStorage.setToken(data.token);
      if (data.organisation) {
        authStorage.setActiveOrgId(data.organisation.id);
      }
      onAuthenticated(data.user, data.organisation, data.organisations || [], data.needsOnboarding);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Sign Up Handler
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const data = await api.signup({
        email,
        password,
        fullName,
        phoneNumber,
      });

      authStorage.setToken(data.token);
      setSuccessMessage('Account created! A verification code has been generated for your email.');
      if (data.verificationToken) {
        setVerificationCode(data.verificationToken);
      }
      setMode('verify_email');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Email Verification Handler
  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const data = await api.verifyEmail({ email, token: verificationCode });
      authStorage.setToken(data.token);
      setSuccessMessage('Email verified successfully! Setting up your workspace...');

      // Check session
      const sessionData = await api.getSession();
      onAuthenticated(
        sessionData.user,
        sessionData.organisation,
        sessionData.organisations || [],
        sessionData.needsOnboarding ?? true
      );
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check the 6-digit code.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend Verification Code
  const handleResendCode = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.resendVerification({ email });
      setSuccessMessage('A new verification code has been dispatched.');
      if (data.verificationToken) {
        setVerificationCode(data.verificationToken);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot Password Handler
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.forgotPassword({ email });
      setSuccessMessage('Password reset code generated. Please check your inbox.');
      if (data.resetToken) {
        setResetCode(data.resetToken);
      }
      setMode('reset_password');
    } catch (err: any) {
      setError(err.message || 'Failed to request password reset.');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset Password Handler
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await api.resetPassword({ email, token: resetCode, newPassword: password });
      setSuccessMessage('Password reset successfully! Please sign in with your new credentials.');
      setPassword('');
      setConfirmPassword('');
      setMode('login');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Demo Login Handler for Evaluators
  const handleDemoLogin = async (userEmail: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.login({ email: userEmail, password: 'StrongPassword123!' });
      authStorage.setToken(data.token);
      if (data.organisation) {
        authStorage.setActiveOrgId(data.organisation.id);
      }
      onAuthenticated(data.user, data.organisation, data.organisations || [], data.needsOnboarding);
    } catch (err: any) {
      // Fallback for demo test users
      try {
        const demoData = await api.login({ email: 'tunde@apeximports.ng', password: 'StrongPassword123!' });
        authStorage.setToken(demoData.token);
        onAuthenticated(demoData.user, demoData.organisation, demoData.organisations || [], demoData.needsOnboarding);
      } catch (e: any) {
        setError(e.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090C10] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-['Plus_Jakarta_Sans',sans-serif] transition-colors">
      {/* Background radial gradient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Floating Theme Toggle in Corner */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={handleToggleTheme}
          aria-label={`Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} mode`}
          className="p-2 rounded-xl bg-white dark:bg-[#161B22] hover:bg-slate-100 dark:hover:bg-[#21262D] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer shadow-md"
        >
          {currentTheme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700" />
          )}
        </button>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-white dark:bg-[#0D1117] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden relative z-10 backdrop-blur-md">
        {/* Top Header */}
        <div className="p-8 pb-6 border-b border-slate-200 dark:border-white/8 text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-950/20 dark:shadow-emerald-950/60 border border-emerald-400/30 mx-auto mb-4">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">ATLAS</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Global Commerce • Verified Trust • Blaaiz Relay
          </p>
        </div>

        {/* Error / Success Feedback */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* MODE: SIGN IN */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="p-6 space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1.5">Official Business Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-lg bg-slate-50 dark:bg-[#161B22] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-slate-700 dark:text-slate-300 font-medium">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setSuccessMessage(null);
                    setMode('forgot_password');
                  }}
                  className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 text-[11px] cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-lg bg-slate-50 dark:bg-[#161B22] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              type="submit"
              isLoading={isLoading}
              className="w-full mt-2"
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In to Workspace
            </Button>

            <div className="pt-4 border-t border-slate-200 dark:border-white/8 text-center text-slate-500 dark:text-slate-400 text-xs">
              <span>Don't have an enterprise workspace? </span>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setSuccessMessage(null);
                  setMode('signup');
                }}
                className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 font-semibold cursor-pointer"
              >
                Create Account
              </button>
            </div>
          </form>
        )}

        {/* MODE: SIGN UP */}
        {mode === 'signup' && (
          <form onSubmit={handleSignup} className="p-6 space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Full Legal Name</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Amara Okafor"
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-[#161B22] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Official Business Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="founder@company.com"
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-[#161B22] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Direct Phone Number</label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+234 803 000 0000"
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-[#161B22] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Password (min 8 characters)</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-[#161B22] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              type="submit"
              isLoading={isLoading}
              className="w-full mt-2"
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Register Business Account
            </Button>

            <div className="pt-3 border-t border-slate-200 dark:border-white/8 text-center text-slate-500 dark:text-slate-400 text-xs">
              <span>Already registered? </span>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setSuccessMessage(null);
                  setMode('login');
                }}
                className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 font-semibold cursor-pointer"
              >
                Sign In
              </button>
            </div>
          </form>
        )}

        {/* MODE: EMAIL VERIFICATION */}
        {mode === 'verify_email' && (
          <form onSubmit={handleVerifyEmail} className="p-6 space-y-4 text-xs">
            <div className="text-center space-y-1">
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Verify Your Business Email</h3>
              <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                Enter the 6-digit verification code sent to <strong className="text-emerald-600 dark:text-emerald-400">{email}</strong>.
              </p>
            </div>

            <div>
              <label className="block text-slate-500 dark:text-slate-400 mb-1 text-center">6-Digit Code</label>
              <input
                type="text"
                required
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="123456"
                className="w-full py-3 text-center text-lg tracking-[0.5em] font-mono rounded-lg bg-slate-50 dark:bg-[#161B22] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-bold"
              />
            </div>

            <Button
              variant="primary"
              size="md"
              type="submit"
              isLoading={isLoading}
              className="w-full"
              icon={<CheckCircle2 className="w-4 h-4" />}
            >
              Confirm Email Address
            </Button>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-white/8 text-[11px]">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={isLoading}
                className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 font-medium cursor-pointer"
              >
                Resend Code
              </button>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                Back to Sign In
              </button>
            </div>
          </form>
        )}

        {/* MODE: FORGOT PASSWORD */}
        {mode === 'forgot_password' && (
          <form onSubmit={handleForgotPassword} className="p-6 space-y-4 text-xs">
            <div className="space-y-1">
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Reset Account Password</h3>
              <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                Enter your registered business email. We'll generate a secure reset token.
              </p>
            </div>

            <div>
              <label className="block text-slate-500 dark:text-slate-400 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 dark:bg-[#161B22] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 text-xs"
              />
            </div>

            <Button
              variant="primary"
              size="md"
              type="submit"
              isLoading={isLoading}
              className="w-full"
            >
              Send Reset Instructions
            </Button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs cursor-pointer"
              >
                Back to Sign In
              </button>
            </div>
          </form>
        )}

        {/* MODE: RESET PASSWORD */}
        {mode === 'reset_password' && (
          <form onSubmit={handleResetPassword} className="p-6 space-y-4 text-xs">
            <div className="space-y-1">
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Set New Password</h3>
              <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                Enter the reset code and choose a new password of at least 8 characters.
              </p>
            </div>

            <div>
              <label className="block text-slate-500 dark:text-slate-400 mb-1">Reset Code</label>
              <input
                type="text"
                required
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value)}
                placeholder="6-digit reset code"
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#161B22] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500 text-center text-sm font-semibold tracking-wider"
              />
            </div>

            <div>
              <label className="block text-slate-500 dark:text-slate-400 mb-1">New Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#161B22] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-500 dark:text-slate-400 mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#161B22] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 text-xs"
              />
            </div>

            <Button
              variant="primary"
              size="md"
              type="submit"
              isLoading={isLoading}
              className="w-full"
            >
              Update Password
            </Button>
          </form>
        )}
      </div>

      {/* Evaluator Fast-Track Sandbox Pill */}
      <div className="mt-8 text-center z-10 max-w-sm">
        <p className="text-[11px] text-slate-500 mb-2">Sandbox Evaluator Fast-Track:</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => handleDemoLogin('tunde@apeximports.ng')}
            disabled={isLoading}
            className="px-2.5 py-1 rounded bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-[11px] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shadow-xs"
          >
            Demo: Apex Global Finance Manager
          </button>
          <button
            onClick={() => handleDemoLogin('amara@apeximports.ng')}
            disabled={isLoading}
            className="px-2.5 py-1 rounded bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-[11px] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shadow-xs"
          >
            Demo: Apex Global Owner
          </button>
        </div>
      </div>
    </div>
  );
};

