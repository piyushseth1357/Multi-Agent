import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, ShieldCheck, Cpu } from 'lucide-react';
import { User } from '../types';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      // Deterministic user ID per email so re-logging in restores your exact projects
      await new Promise(r => setTimeout(r, 400));
      const normalized = email.trim().toLowerCase();
      const safeId = 'usr_' + btoa(normalized).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
      const mockUser: User = {
        id: safeId,
        email: normalized
      };
      localStorage.setItem('auth_user', JSON.stringify(mockUser));
      onLoginSuccess(mockUser);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-surface-900 relative overflow-hidden p-6">
      {/* Background Hologram Orbs */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-sky-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Glassmorphic Auth Card */}
      <div className="w-full max-w-md holo-card rounded-2xl p-8 relative z-10 shadow-2xl border border-brand-500/20">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-sky-400 text-white shadow-lg shadow-brand-500/30 mb-4 animate-bounce-slow">
            <Cpu className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight holo-effect">
            AI Software Team Studio
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Autonomous Multi-Agent Engineering Pipeline
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-surface-800/80 p-1 rounded-xl mb-6 border border-slate-700/50">
          <button
            type="button"
            onClick={() => setIsSignUp(false)}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              !isSignUp ? 'bg-brand-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setIsSignUp(true)}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              isSignUp ? 'bg-brand-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Work Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full bg-surface-800/90 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-surface-800/90 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl font-medium text-sm text-white holo-button flex items-center justify-center gap-2 mt-2 shadow-lg disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Connecting to Studio...
              </span>
            ) : (
              <>
                <span>{isSignUp ? 'Get Started' : 'Enter Workspace'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-800/80 text-center">
          <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
            100% Free Tier Orchestrator • Isolated Data Sandbox
          </p>
        </div>
      </div>
    </div>
  );
};
