import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-grain text-ledger-ivory min-h-screen flex flex-col font-ui selection:bg-ledger-bronze selection:text-white relative overflow-hidden fade-in">
      <div className="flex-grow flex flex-col md:flex-row items-center justify-center p-6 md:p-12 z-10 w-full max-w-7xl mx-auto h-full min-h-[calc(100vh-48px)]">
        {/* Left Panel: Headline & Intro */}
        <div className="w-full md:w-1/2 flex flex-col items-start justify-center pr-0 md:pr-16 mb-16 md:mb-0">
          <h1 className="font-[family-name:var(--font-display)] text-5xl md:text-7xl font-400 tracking-tight mb-6">
            Quantus
          </h1>
          <p className="text-xl text-ledger-muted font-[family-name:var(--font-display)] tracking-wide max-w-md">
            Institutional Intelligence. Precision tools for high-net-worth treasury management and private banking.
          </p>
          <div className="mt-8 text-xs font-600 tracking-[0.2em] text-ledger-muted uppercase">
            Global Markets Division
          </div>
        </div>

        {/* Right Panel: Login Form */}
        <div className="w-full md:w-1/2 max-w-md ml-auto mr-auto md:mr-0">
          <div className="mb-10">
            <h2 className="font-[family-name:var(--font-display)] text-3xl mb-3">Sign In</h2>
            <p className="text-sm text-ledger-muted">Enter your credentials to access the terminal.</p>
          </div>

          {error && (
            <div className="mb-8 py-3 border-b border-[#8C3B3B] flex items-start gap-3">
              <AlertCircle size={16} className="text-[#8C3B3B] shrink-0 mt-0.5" />
              <p className="text-ledger-ivory text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Email Field */}
            <div className="relative group">
              <label htmlFor="email" className="block text-[10px] font-600 tracking-widest text-ledger-muted uppercase mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@institution.com"
                required
                className="w-full bg-transparent border-0 border-b border-ledger-border focus:border-ledger-ivory focus:ring-0 px-0 py-2 text-base text-ledger-ivory transition-colors placeholder:text-ledger-muted/50"
              />
            </div>

            {/* Password Field */}
            <div className="relative group">
              <div className="flex justify-between items-end mb-2">
                <label htmlFor="password" className="block text-[10px] font-600 tracking-widest text-ledger-muted uppercase">
                  Password
                </label>
                <a href="#" className="text-[10px] font-600 tracking-widest text-ledger-muted hover:text-ledger-ivory transition-colors uppercase">
                  Forgot?
                </a>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-transparent border-0 border-b border-ledger-border focus:border-ledger-ivory focus:ring-0 px-0 py-2 text-base text-ledger-ivory transition-colors"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-ledger-bronze text-white py-4 text-xs font-600 uppercase tracking-[0.15em] hover:bg-[#c79152] transition-colors duration-200 disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Authenticate'}
              </button>
            </div>
          </form>

          {/* Animated Demo Notice */}
          <div className="mt-12 flex justify-center pt-8 border-t border-ledger-border/50">
            <div className="demo-card">
              <div className="bg">
                <p className="text-[10px] font-600 text-ledger-ivory uppercase tracking-widest mb-4 text-center">
                  Demo Credentials Available
                </p>
                <div className="space-y-3 text-sm text-ledger-ivory/80 text-left w-full max-w-[260px] mx-auto">
                  <div className="flex justify-between">
                    <span>Manager</span>
                    <span className="text-ledger-ivory font-semibold">manager1@pipelineiq.com</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rep</span>
                    <span className="text-ledger-ivory font-semibold">rep1@pipelineiq.com</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-ledger-ivory/10">
                    <span>Pass</span>
                    <span className="text-ledger-ivory font-[family-name:var(--font-ticker)] font-bold">password123</span>
                  </div>
                </div>
              </div>
              <div className="blob"></div>
            </div>
          </div>
        </div>
      </div>

      <footer className="z-20 flex h-12 items-center border-t border-ledger-border px-6 font-[family-name:var(--font-ticker)] text-[10px] uppercase tracking-[.12em] text-ledger-muted">
        Quantus · Secure sales workspace
      </footer>
    </div>
  );
}
