import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const JOB_TITLES = ['Product', 'Engineering', 'UX Designer', 'QA', 'Admin', 'Other'];

export default function AuthPage({ onAuth }) {
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const endpoint = isSignup ? '/api/auth/signup' : '/api/auth/login';
    const body = isSignup
      ? { email, password, name, jobTitle }
      : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error('Server is not responding. Please make sure the backend is running.');
      }

      if (!res.ok) throw new Error(data.error || 'Something went wrong');

      localStorage.setItem('token', data.token);
      onAuth(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <button
          onClick={() => navigate('/')}
          className="w-full flex items-center justify-center gap-2 mb-8 hover:opacity-80 transition-opacity"
        >
          <img src="/icons/cortex-header-logo.png" alt="Cortex" className="w-7 h-7" />
          <h1 className="text-2xl font-semibold text-[#37352f]">Cortex</h1>
        </button>

        <div className="bg-white border border-[#e9e8e4] rounded-[3px] p-6">
          <h2 className="text-lg font-medium text-[#37352f] mb-1">
            {isSignup ? 'Create an account' : 'Welcome back'}
          </h2>
          <p className="text-sm text-[#787774] mb-5">
            {isSignup ? 'Sign up to start generating PRDs' : 'Log in to continue'}
          </p>

          {error && (
            <div className="mb-4 p-3 bg-[#fef2f2] border border-[#e9e8e4] rounded-[3px] text-sm text-[#e03e3e]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {isSignup && (
              <>
                <div>
                  <label className="block text-xs font-medium text-[#787774] mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-white border border-[#e9e8e4] rounded-[3px] px-3 py-2 text-sm text-[#37352f] focus:outline-none focus:border-[#2383e2] focus:ring-1 focus:ring-[#2383e2]"
                    placeholder="Jane Smith"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#787774] mb-1">Job Title</label>
                  <select
                    required
                    value={jobTitle}
                    onChange={e => setJobTitle(e.target.value)}
                    className="w-full bg-white border border-[#e9e8e4] rounded-[3px] px-3 py-2 text-sm text-[#37352f] focus:outline-none focus:border-[#2383e2] focus:ring-1 focus:ring-[#2383e2]"
                  >
                    <option value="">Select your role...</option>
                    {JOB_TITLES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
            <div>
              <label className="block text-xs font-medium text-[#787774] mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-white border border-[#e9e8e4] rounded-[3px] px-3 py-2 text-sm text-[#37352f] focus:outline-none focus:border-[#2383e2] focus:ring-1 focus:ring-[#2383e2]"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#787774] mb-1">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-white border border-[#e9e8e4] rounded-[3px] px-3 py-2 text-sm text-[#37352f] focus:outline-none focus:border-[#2383e2] focus:ring-1 focus:ring-[#2383e2]"
                placeholder={isSignup ? 'At least 6 characters' : 'Your password'}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#2383e2] hover:bg-[#1b6abf] disabled:opacity-50 text-white px-4 py-2.5 rounded-[3px] font-medium text-sm mt-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {isSignup ? 'Sign Up' : 'Log In'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => { setIsSignup(!isSignup); setError(''); }}
              className="text-sm text-[#2383e2] hover:text-[#1b6abf]"
            >
              {isSignup ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
