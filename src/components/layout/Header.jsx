import React, { useState, useEffect, useRef } from 'react';
import { Loader2, CheckCircle2, Link2, LogOut, FlaskConical } from 'lucide-react';

const AVATAR_COLORS = [
  'bg-purple-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-rose-500',
];

function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function Header({ user, connection, connectionLoading, testMode, onTestModeToggle, onDisconnectJira, onLogout, onGoHome }) {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const isConnected = connection?.connected;

  useEffect(() => {
    function handleClickOutside(e) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setProfileMenuOpen(false);
      }
    }
    if (profileMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileMenuOpen]);

  return (
    <header className="border-b border-gray-200 bg-white shadow-soft">
      <div className="px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={onGoHome}>
          <img src="/icons/cortex-header-logo.png" alt="Cortex" className="w-8 h-8 rounded-lg" />
          <h1 className="text-lg font-bold text-gray-900">Cortex</h1>
        </div>

        <div className="flex items-center gap-4">
          {connectionLoading ? (
            <Loader2 size={16} className="animate-spin text-gray-400" />
          ) : isConnected ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-green-600">
                <CheckCircle2 size={12} />
                {connection.siteName}
              </div>
              <button
                onClick={onDisconnectJira}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                title="Disconnect Jira"
              >
                <Link2 size={12} />
              </button>
            </div>
          ) : (
            <a
              href="/auth/login"
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-accent-600 border border-gray-200 hover:border-accent-200 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <Link2 size={12} />
              Connect Jira
            </a>
          )}

          <div className="relative border-l border-gray-200 pl-4" ref={profileMenuRef}>
            <button
              onClick={() => setProfileMenuOpen(prev => !prev)}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <div className={`w-8 h-8 rounded-full ${getAvatarColor(user.name)} flex items-center justify-center text-white text-sm font-semibold shrink-0`}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{user.jobTitle}</p>
              </div>
            </button>
            {profileMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <button
                  onClick={() => { setProfileMenuOpen(false); onLogout(); }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <LogOut size={14} />
                  Log out
                </button>
                <div className="border-t border-gray-100 my-1" />
                <div className="px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FlaskConical size={14} className={testMode ? 'text-amber-600' : 'text-gray-400'} />
                    <span className="text-sm text-gray-700">Test Mode</span>
                  </div>
                  <button
                    role="switch"
                    aria-checked={testMode}
                    onClick={onTestModeToggle}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                      testMode ? 'bg-amber-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                        testMode ? 'translate-x-[19px]' : 'translate-x-[3px]'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
