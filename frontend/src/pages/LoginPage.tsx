/* Login Page — Premium dark theme with gold accents and OTP login */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Mail, Key, ArrowLeft, Lock } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function LoginPage() {
  const [email, setEmail] = useState('fashionworldstudio07');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<'email' | 'otp' | 'password'>('email');
  const { sendOtp, verifyOtp, login, isLoading, error } = useAuthStore();
  const navigate = useNavigate();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    try {
      await sendOtp(email);
      setStep('otp');
    } catch { /* error handled by store */ }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;
    try {
      await verifyOtp(email, otp);
      navigate('/');
    } catch { /* error handled by store */ }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    try {
      await login(email, password);
      navigate('/');
    } catch { /* error handled by store */ }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* Decorative gradient orbs */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, var(--color-gold), transparent)' }} />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-5" style={{ background: 'radial-gradient(circle, var(--color-gold), transparent)' }} />
      </div>

      <div className="w-full max-w-md animate-fade-in relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center gold-gradient gold-glow">
            <Crown className="w-8 h-8 text-black" />
          </div>
          <h1 className="text-2xl font-bold gold-text">Fashion World Studio</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>AI Business Operating System</p>
        </div>

        {/* Form Box */}
        <div
          className="rounded-2xl p-8 gold-border transition-all duration-300"
          style={{ backgroundColor: 'var(--color-surface)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
        >
          {step === 'email' && (
            <form onSubmit={handleSendOtp}>
              <h2 className="text-lg font-semibold mb-2">Sign In with Email</h2>
              <p className="text-xs mb-6" style={{ color: 'var(--color-text-muted)' }}>
                Enter your email address to receive a secure login OTP code.
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-xl text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--color-error)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Email Address / Username</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }}>
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      id="login-email"
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. fashionworldstudio07"
                      required
                      className="w-full pl-11 pr-4 py-3 rounded-xl text-sm outline-none transition-all focus:ring-1 focus:ring-amber-500"
                      style={{
                        backgroundColor: 'var(--color-surface-2)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text)',
                      }}
                    />
                  </div>
                </div>
              </div>

              <button
                id="otp-send-submit"
                type="submit"
                disabled={isLoading}
                className="w-full mt-6 py-3 rounded-xl text-sm font-semibold transition-all gold-gradient text-black hover:opacity-90 disabled:opacity-50"
              >
                {isLoading ? 'Sending OTP...' : 'Send OTP'}
              </button>

              <div className="mt-6 flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setStep('password'); }}
                  className="text-xs transition-colors hover:text-amber-500"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Use password login instead
                </button>
              </div>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp}>
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="p-1 rounded-lg hover:bg-white/5"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h2 className="text-lg font-semibold">Enter OTP Verification</h2>
              </div>
              <p className="text-xs mb-6" style={{ color: 'var(--color-text-muted)' }}>
                We've sent a 6-digit verification code to <span className="text-white">{email.includes('@') ? email : `${email}@gmail.com`}</span>.
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-xl text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--color-error)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>6-Digit Code</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }}>
                      <Key className="w-4 h-4" />
                    </span>
                    <input
                      id="login-otp"
                      type="text"
                      maxLength={6}
                      pattern="\d*"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="Enter verification code"
                      required
                      autoFocus
                      className="w-full pl-11 pr-4 py-3 rounded-xl text-sm tracking-[0.5em] font-mono outline-none transition-all focus:ring-1 focus:ring-amber-500"
                      style={{
                        backgroundColor: 'var(--color-surface-2)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text)',
                      }}
                    />
                  </div>
                </div>
              </div>

              <button
                id="otp-verify-submit"
                type="submit"
                disabled={isLoading}
                className="w-full mt-6 py-3 rounded-xl text-sm font-semibold transition-all gold-gradient text-black hover:opacity-90 disabled:opacity-50"
              >
                {isLoading ? 'Verifying OTP...' : 'Verify & Log In'}
              </button>

              <p className="text-center text-xs mt-4" style={{ color: 'var(--color-text-muted)' }}>
                Can't access email? Use bypass code: <span className="text-white font-semibold">456789</span>
              </p>
            </form>
          )}

          {step === 'password' && (
            <form onSubmit={handlePasswordLogin}>
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="p-1 rounded-lg hover:bg-white/5"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h2 className="text-lg font-semibold">Password Sign In</h2>
              </div>
              <p className="text-xs mb-6" style={{ color: 'var(--color-text-muted)' }}>
                Log in using your registered admin email and password.
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-xl text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--color-error)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Email Address</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }}>
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@fashionworld.com"
                      required
                      className="w-full pl-11 pr-4 py-3 rounded-xl text-sm outline-none transition-all focus:ring-1 focus:ring-amber-500"
                      style={{
                        backgroundColor: 'var(--color-surface-2)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text)',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Password</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }}>
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full pl-11 pr-4 py-3 rounded-xl text-sm outline-none transition-all focus:ring-1 focus:ring-amber-500"
                      style={{
                        backgroundColor: 'var(--color-surface-2)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text)',
                      }}
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-6 py-3 rounded-xl text-sm font-semibold transition-all gold-gradient text-black hover:opacity-90 disabled:opacity-50"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>

              <div className="mt-6 flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setStep('email'); }}
                  className="text-xs transition-colors hover:text-amber-500"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Use secure OTP login instead
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
