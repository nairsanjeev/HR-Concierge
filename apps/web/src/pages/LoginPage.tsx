import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, LogIn } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const validUsers: Record<string, { password: string; displayName: string }> = {
    'Sanjeev Nair': { password: 'demo123', displayName: 'Sanjeev Nair' },
    'sarah@zava.com': { password: 'demo123', displayName: 'Sarah Chen' },
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const user = validUsers[username];
    if (user && password === user.password) {
      sessionStorage.setItem('hr-concierge-auth', 'true');
      sessionStorage.setItem('hr-concierge-user', user.displayName);
      navigate('/');
    } else {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--surface-0)] text-[var(--text-primary)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center mb-4">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold">HR Concierge</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Sign in to continue</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="glass rounded-xl p-6 space-y-4 border border-[var(--border)]">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">
              User Name
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(''); }}
              className="w-full px-3 py-2 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition"
              placeholder="Enter your name"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              className="w-full px-3 py-2 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition"
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium transition-colors"
          >
            <LogIn className="w-4 h-4" />
            Sign In
          </button>
        </form>

        <p className="text-xs text-[var(--text-tertiary)] text-center mt-4">
          Demo environment — use provided credentials
        </p>
      </div>
    </div>
  );
}
