import React, { useState, useEffect, useRef } from 'react';
import { FileText, Mic, Upload, PanelLeftClose, PanelLeft, LogOut, FlaskConical, Loader2, MoreHorizontal } from 'lucide-react';

const NAV_ITEMS = [
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'transcripts', label: 'Transcripts', icon: Mic },
  { key: 'vtt-upload', label: 'VTT Upload', icon: Upload },
];

const AVATAR_COLORS = [
  'bg-purple-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-rose-500',
];

function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function Sidebar({ activeSection, onSectionChange, collapsed, onToggleCollapse, onGoHome, user, testMode, onTestModeToggle, onLogout, connection, connectionLoading, onDisconnectJira, figmaConnection, figmaConnectionLoading, onDisconnectFigma }) {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [jiraMenuOpen, setJiraMenuOpen] = useState(false);
  const [figmaMenuOpen, setFigmaMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const jiraMenuRef = useRef(null);
  const figmaMenuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setProfileMenuOpen(false);
      }
      if (jiraMenuRef.current && !jiraMenuRef.current.contains(e.target)) {
        setJiraMenuOpen(false);
      }
      if (figmaMenuRef.current && !figmaMenuRef.current.contains(e.target)) {
        setFigmaMenuOpen(false);
      }
    }
    if (profileMenuOpen || jiraMenuOpen || figmaMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileMenuOpen, jiraMenuOpen, figmaMenuOpen]);

  return (
    <aside
      className={`shrink-0 bg-[#F7F7F9] border-r border-[#e9e8e4] flex flex-col transition-all duration-200 ${
        collapsed ? 'w-[52px]' : 'w-[240px]'
      }`}
    >
      {/* Logo + Collapse toggle */}
      <div className={`flex items-center px-2.5 py-3 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && (
          <div className="flex items-center gap-2 cursor-pointer pl-1" onClick={onGoHome}>
            <img src="/icons/cortex-header-logo.png" alt="Cortex" className="w-6 h-6 rounded-[3px]" />
            <span className="text-sm font-medium text-[#37352f]">Cortex</span>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-[3px] text-[#9b9a97] hover:bg-[rgba(55,53,47,0.08)]"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex flex-col gap-0.5 px-2">
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
          const isActive = activeSection === key;
          return (
            <button
              key={key}
              onClick={() => onSectionChange(key)}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-2.5 rounded-[3px] text-sm font-semibold ${
                collapsed ? 'justify-center px-0 py-1.5' : 'px-3 py-1.5'
              } ${
                isActive
                  ? 'bg-[rgba(55,53,47,0.08)] text-[#37352f]'
                  : 'text-[#787774] hover:bg-[rgba(55,53,47,0.08)]'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-[#37352f]' : 'text-[#9b9a97]'} />
              {!collapsed && <span>{label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Connected Apps */}
      {!collapsed && (
        <div className="mt-auto border-t border-[#e9e8e4] px-2 pt-3 pb-1">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-[#9b9a97]">Connected Apps</p>
          <div className="flex flex-col gap-0.5">
            {/* Jira */}
            <div className="flex items-center justify-between px-3 py-1.5 rounded-[3px] group" ref={jiraMenuRef}>
              <div className="flex items-center gap-2">
                <img src="/icons/jira.png" alt="Jira" className="w-4 h-4" />
                <span className="text-sm text-[#37352f]">Jira</span>
              </div>
              <div className="flex items-center gap-1.5">
                {connectionLoading ? (
                  <Loader2 size={12} className="animate-spin text-[#9b9a97]" />
                ) : connection?.connected ? (
                  <>
                    <span className="relative text-[11px] text-[#9b9a97] cursor-default group/tip">
                      Connected
                      <span className="absolute bottom-full right-0 mb-1.5 hidden group-hover/tip:block whitespace-nowrap bg-[#37352f] text-white text-[11px] px-2 py-1 rounded-[4px] shadow-lg pointer-events-none">
                        {connection.siteName}
                      </span>
                    </span>
                    <div className="relative">
                      <button
                        onClick={() => setJiraMenuOpen(prev => !prev)}
                        className="p-0.5 rounded-[3px] text-[#9b9a97] hover:bg-[rgba(55,53,47,0.08)]"
                      >
                        <MoreHorizontal size={14} />
                      </button>
                      {jiraMenuOpen && (
                        <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-[6px] shadow-notion-popup py-1 z-50">
                          <button
                            onClick={() => { setJiraMenuOpen(false); onDisconnectJira(); }}
                            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-[#e03e3e] hover:bg-[rgba(55,53,47,0.08)]"
                          >
                            Disconnect
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <a
                    href="/auth/login"
                    className="text-xs font-medium text-[#37352f] border border-[#d3d3d3] hover:border-[#b0b0b0] px-2 py-0.5 rounded-[3px]"
                  >
                    Connect
                  </a>
                )}
              </div>
            </div>
            {/* Figma */}
            <div className="flex items-center justify-between px-3 py-1.5 rounded-[3px] group" ref={figmaMenuRef}>
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 38 57" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5Z" fill="#1ABCFE"/>
                  <path d="M0 47.5C0 42.2533 4.25329 38 9.5 38H19V47.5C19 52.7467 14.7467 57 9.5 57C4.25329 57 0 52.7467 0 47.5Z" fill="#0ACF83"/>
                  <path d="M19 0V19H28.5C33.7467 19 38 14.7467 38 9.5C38 4.25329 33.7467 0 28.5 0H19Z" fill="#FF7262"/>
                  <path d="M0 9.5C0 14.7467 4.25329 19 9.5 19H19V0H9.5C4.25329 0 0 4.25329 0 9.5Z" fill="#F24E1E"/>
                  <path d="M0 28.5C0 33.7467 4.25329 38 9.5 38H19V19H9.5C4.25329 19 0 23.2533 0 28.5Z" fill="#A259FF"/>
                </svg>
                <span className="text-sm text-[#37352f]">Figma</span>
              </div>
              <div className="flex items-center gap-1.5">
                {figmaConnectionLoading ? (
                  <Loader2 size={12} className="animate-spin text-[#9b9a97]" />
                ) : figmaConnection?.connected ? (
                  <>
                    <span className="relative text-[11px] text-[#9b9a97] cursor-default group/tip">
                      Connected
                      <span className="absolute bottom-full right-0 mb-1.5 hidden group-hover/tip:block whitespace-nowrap bg-[#37352f] text-white text-[11px] px-2 py-1 rounded-[4px] shadow-lg pointer-events-none">
                        {figmaConnection.handle}
                      </span>
                    </span>
                    <div className="relative">
                      <button
                        onClick={() => setFigmaMenuOpen(prev => !prev)}
                        className="p-0.5 rounded-[3px] text-[#9b9a97] hover:bg-[rgba(55,53,47,0.08)]"
                      >
                        <MoreHorizontal size={14} />
                      </button>
                      {figmaMenuOpen && (
                        <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-[6px] shadow-notion-popup py-1 z-50">
                          <button
                            onClick={() => { setFigmaMenuOpen(false); onDisconnectFigma(); }}
                            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-[#e03e3e] hover:bg-[rgba(55,53,47,0.08)]"
                          >
                            Disconnect
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <a
                    href="/auth/figma/login"
                    className="text-xs font-medium text-[#37352f] border border-[#d3d3d3] hover:border-[#b0b0b0] px-2 py-0.5 rounded-[3px]"
                  >
                    Connect
                  </a>
                )}
              </div>
            </div>
            {/* Teams */}
            <div className="flex items-center justify-between px-3 py-1.5 rounded-[3px]">
              <div className="flex items-center gap-2">
                <img src="/icons/teams.png" alt="Teams" className="w-4 h-4" />
                <span className="text-sm text-[#37352f]">Teams</span>
              </div>
              <span className="text-xs font-medium text-[#37352f] border border-[#d3d3d3] px-2 py-0.5 rounded-[3px] cursor-default opacity-50" title="Coming soon">
                Connect
              </span>
            </div>
          </div>
        </div>
      )}

      {collapsed && (
        <div className="mt-auto border-t border-[#e9e8e4] px-2 pt-3 pb-3 flex flex-col items-center gap-1">
          <a href={connection?.connected ? undefined : '/auth/login'} title={connection?.connected ? `Jira: ${connection.siteName}` : 'Connect Jira'}>
            <img src="/icons/jira.png" alt="Jira" className={`w-4 h-4 ${connection?.connected ? '' : 'opacity-40'}`} />
          </a>
          <a href={figmaConnection?.connected ? undefined : '/auth/figma/login'} title={figmaConnection?.connected ? `Figma: ${figmaConnection.handle}` : 'Connect Figma'}>
            <svg width="16" height="16" viewBox="0 0 38 57" fill="none" xmlns="http://www.w3.org/2000/svg" className={figmaConnection?.connected ? '' : 'opacity-40'}>
              <path d="M19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5Z" fill="#1ABCFE"/>
              <path d="M0 47.5C0 42.2533 4.25329 38 9.5 38H19V47.5C19 52.7467 14.7467 57 9.5 57C4.25329 57 0 52.7467 0 47.5Z" fill="#0ACF83"/>
              <path d="M19 0V19H28.5C33.7467 19 38 14.7467 38 9.5C38 4.25329 33.7467 0 28.5 0H19Z" fill="#FF7262"/>
              <path d="M0 9.5C0 14.7467 4.25329 19 9.5 19H19V0H9.5C4.25329 0 0 4.25329 0 9.5Z" fill="#F24E1E"/>
              <path d="M0 28.5C0 33.7467 4.25329 38 9.5 38H19V19H9.5C4.25329 19 0 23.2533 0 28.5Z" fill="#A259FF"/>
            </svg>
          </a>
          <img src="/icons/teams.png" alt="Teams" className="w-4 h-4 opacity-40" title="Teams (coming soon)" />
        </div>
      )}

      {/* Profile — pinned to bottom */}
      {user && (
        <div className="border-t border-[#e9e8e4] px-2 py-3 relative" ref={profileMenuRef}>
          <button
            onClick={() => setProfileMenuOpen(prev => !prev)}
            title={collapsed ? user.name : undefined}
            className={`flex items-center gap-2.5 w-full rounded-[3px] hover:bg-[rgba(55,53,47,0.08)] ${
              collapsed ? 'justify-center px-0 py-1.5' : 'px-3 py-1.5'
            }`}
          >
            <div className={`w-7 h-7 rounded-full ${getAvatarColor(user.name)} flex items-center justify-center text-white text-xs font-semibold shrink-0`}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="text-left min-w-0">
                <p className="text-sm font-medium text-[#37352f] truncate">{user.name}</p>
                <p className="text-xs text-[#9b9a97] truncate">
                  {user.jobTitle}
                  {testMode && <span className="ml-1.5 text-[10px] font-semibold text-amber-600 uppercase">Test Mode On</span>}
                </p>
              </div>
            )}
          </button>
          {profileMenuOpen && (
            <div className="absolute left-2 bottom-full mb-2 w-52 bg-white rounded-[6px] shadow-notion-popup py-1 z-50">
              <button
                onClick={() => { setProfileMenuOpen(false); onLogout(); }}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-[#37352f] hover:bg-[rgba(55,53,47,0.08)]"
              >
                <LogOut size={14} />
                Log out
              </button>
              <div className="border-t border-[#e9e8e4] my-1" />
              <div className="px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FlaskConical size={14} className={testMode ? 'text-amber-600' : 'text-[#9b9a97]'} />
                  <span className="text-sm text-[#37352f]">Test Mode</span>
                </div>
                <button
                  role="switch"
                  aria-checked={testMode}
                  onClick={onTestModeToggle}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full duration-200 focus:outline-none ${
                    testMode ? 'bg-amber-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm duration-200 ${
                      testMode ? 'translate-x-[19px]' : 'translate-x-[3px]'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
