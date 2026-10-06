import { useState } from 'react';
import StarFieldBackground from '@/components/StarFieldBackground';
import { useAuth } from '@/context/AuthContext';

interface AuthPagesProps {
  mode: 'login' | 'register';
  onNavigate: (page: 'login' | 'register' | 'landing') => void;
}

export default function AuthPage({ mode, onNavigate }: AuthPagesProps) {
  const { signIn, signUp } = useAuth();
  const isRegister = mode === 'register';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (isRegister) {
      if (!username.trim()) {
        setError('Please enter a username.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setLoading(true);

    if (isRegister) {
      const { error: signUpError } = await signUp(email, password, username.trim());
      if (signUpError) {
        setError(signUpError);
        setLoading(false);
      }
      // On success, the auth state change will redirect
    } else {
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        setError(signInError);
        setLoading(false);
      }
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-4">
      <StarFieldBackground />

      <div className="relative z-10 w-full max-w-md">
        {/* Back button */}
        <button
          onClick={() => onNavigate('landing')}
          className="text-slate-400 hover:text-slate-200 text-sm mb-6 flex items-center gap-2 transition-colors"
        >
          ← Back
        </button>

        {/* Card */}
        <div
          className="rounded-2xl p-8 border border-slate-600/30"
          style={{
            background: 'rgba(10,14,39,0.7)',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          <h2
            className="text-2xl font-bold text-center mb-2 text-slate-100 tracking-wide"
            style={{ fontFamily: "'Cinzel', Georgia, serif" }}
          >
            {isRegister ? 'CREATE ACCOUNT' : 'WELCOME BACK'}
          </h2>

          <div className="flex items-center justify-center gap-2 mb-8">
            <span className="text-slate-500 text-sm">✦</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegister && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 tracking-wide uppercase">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-slate-900/60 border border-slate-600/40 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-400/60 focus:ring-2 focus:ring-blue-400/20 transition-all"
                  placeholder="Choose your adventurer name"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 tracking-wide uppercase">
                {isRegister ? 'Email' : 'Email or Username'}
              </label>
              <input
                type={isRegister ? 'email' : 'text'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-slate-900/60 border border-slate-600/40 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-400/60 focus:ring-2 focus:ring-blue-400/20 transition-all"
                placeholder={isRegister ? 'you@example.com' : 'Enter your email'}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 tracking-wide uppercase">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-slate-900/60 border border-slate-600/40 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-400/60 focus:ring-2 focus:ring-blue-400/20 transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            {isRegister && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 tracking-wide uppercase">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-slate-900/60 border border-slate-600/40 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-400/60 focus:ring-2 focus:ring-blue-400/20 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            )}

            {error && (
              <div className="text-sm text-red-300 bg-red-900/30 border border-red-700/30 rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-lg font-medium tracking-wide text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100"
              style={{
                background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a8c 100%)',
                boxShadow: '0 0 20px rgba(45,90,140,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
              }}
            >
              {loading ? 'Please wait...' : isRegister ? 'CREATE ACCOUNT' : 'LOG IN'}
            </button>
          </form>

          {/* Footer links */}
          <div className="mt-6 pt-6 border-t border-slate-700/40 text-center space-y-2">
            {!isRegister && (
              <p className="text-sm text-slate-400">
                <button className="text-blue-300 hover:text-blue-200 transition-colors">
                  Forgot password?
                </button>
              </p>
            )}
            <p className="text-sm text-slate-400">
              {isRegister ? (
                <>
                  Already have an account?{' '}
                  <button
                    onClick={() => onNavigate('login')}
                    className="text-blue-300 hover:text-blue-200 transition-colors font-medium"
                  >
                    LOG IN
                  </button>
                </>
              ) : (
                <>
                  Don't have an account?{' '}
                  <button
                    onClick={() => onNavigate('register')}
                    className="text-blue-300 hover:text-blue-200 transition-colors font-medium"
                  >
                    CREATE ACCOUNT
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
