/* Login Page — Premium dark theme with gold accents */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const { login, isLoading, error } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl p-8 gold-border"
          style={{ backgroundColor: 'var(--color-surface)' }}
        >
          <h2 className="text-lg font-semibold mb-6">Welcome Back</h2>

          {error && (
            <div className="mb-4 p-3 rounded-xl text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--color-error)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Email</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@fashionworld.com"
                required
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all focus:ring-2"
                style={{
                  backgroundColor: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Password</label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all pr-12"
                  style={{
                    backgroundColor: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <button
            id="login-submit"
            type="submit"
            disabled={isLoading}
            className="w-full mt-6 py-3 rounded-xl text-sm font-semibold transition-all gold-gradient text-black hover:opacity-90 disabled:opacity-50"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>

          <p className="text-center text-xs mt-4" style={{ color: 'var(--color-text-muted)' }}>
            Default: admin@fashionworld.com / admin123
          </p>
        </form>
      </div>
    </div>
  );
}
