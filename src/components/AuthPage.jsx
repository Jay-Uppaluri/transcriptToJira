import React, { useState } from 'react';
import { Loader2, FileText } from 'lucide-react';

const JOB_TITLES = ['Product', 'Engineering', 'UX Designer', 'QA', 'Admin', 'Other'];

export default function AuthPage({ onAuth }) {
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
    <div className="min-h-screen bg-[#fafbfc] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <FileText size={28} className="text-accent-600" />
          <h1 className="text-2xl font-bold text-gray-900">Transcript to Jira</h1>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-soft">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            {isSignup ? 'Create an account' : 'Welcome back'}
          </h2>
          <p className="text-sm text-gray-500 mb-5">
            {isSignup ? 'Sign up to start generating PRDs' : 'Log in to continue'}
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {isSignup && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-100"
                    placeholder="Jane Smith"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Job Title</label>
                  <select
                    required
                    value={jobTitle}
                    onChange={e => setJobTitle(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-100"
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
              <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-100"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-100"
                placeholder={isSignup ? 'At least 6 characters' : 'Your password'}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-accent-600 hover:bg-accent-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-150 mt-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {isSignup ? 'Sign Up' : 'Log In'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => { setIsSignup(!isSignup); setError(''); }}
              className="text-sm text-accent-600 hover:text-accent-700 transition-colors"
            >
              {isSignup ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
