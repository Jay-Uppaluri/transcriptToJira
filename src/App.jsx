import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import AuthPage from './components/AuthPage.jsx';
import PRDList from './components/PRDList.jsx';
import TranscriptList from './components/TranscriptList.jsx';
import Sidebar from './components/layout/Sidebar.jsx';
import TranscriptView from './components/TranscriptView.jsx';
import TranscriptModal from './components/modal/TranscriptModal.jsx';
import VTTUpload from './components/VTTUpload.jsx';
import PRDDocument from './components/prd/PRDDocument.jsx';
import TicketView from './components/tickets/TicketView.jsx';
import useComments from './hooks/useComments.js';
import { authHeaders } from './utils/api.js';
import useProvider from './hooks/useProvider.js';

const API = '/api';
const fetchOpts = { credentials: 'include' };

export default function App() {
  // Provider info
  const provider = useProvider();

  // Auth state
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  // View: 'dashboard' | 'prd' | 'tickets' | 'transcript'
  const [view, setView] = useState('dashboard');
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTranscript, setActiveTranscript] = useState(null);

  // Sidebar state
  const [sidebarSection, setSidebarSection] = useState('documents');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Workflow state
  const [transcript, setTranscript] = useState('');
  const [projectKey, setProjectKey] = useState('');
  const [prd, setPrd] = useState('');
  const [prdId, setPrdId] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [testMode, setTestMode] = useState(false);

  // Jira state
  const [connection, setConnection] = useState(null);
  const [connectionLoading, setConnectionLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [submittedSiteUrl, setSubmittedSiteUrl] = useState('');

  // Comments hook
  const { comments, loadComments, addComment, addReply, resolveComment, deleteComment } = useComments(prdId, token, prd);

  // Check auth on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${savedToken}` } })
        .then(res => res.ok ? res.json() : Promise.reject())
        .then(data => { setUser(data); setToken(savedToken); })
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setAuthChecked(true));
    } else {
      setAuthChecked(true);
    }
  }, []);

  // Check Jira connection
  useEffect(() => {
    fetch('/auth/status', fetchOpts)
      .then(r => r.json())
      .then(data => { setConnection(data); setConnectionLoading(false); })
      .catch(() => setConnectionLoading(false));
  }, []);

  // Load projects when connected
  useEffect(() => {
    if (connection?.connected) {
      setProjectsLoading(true);
      fetch(`${API}/jira/projects`, fetchOpts)
        .then(r => r.json())
        .then(data => {
          setProjects(data.projects || []);
          if (!projectKey && data.projects?.length) setProjectKey(data.projects[0].key);
        })
        .catch(() => {})
        .finally(() => setProjectsLoading(false));
    } else {
      setProjects([]);
    }
  }, [connection?.connected]);

  function handleAuth(userData, tokenStr) {
    setUser(userData);
    setToken(tokenStr);
  }

  function logout() {
    localStorage.removeItem('token');
    setUser(null);
    setToken(null);
    goToDashboard();
  }

  async function disconnectJira() {
    await fetch('/auth/disconnect', { method: 'POST', ...fetchOpts });
    setConnection({ connected: false });
    setProjects([]);
    setProjectKey('');
  }

  function resetWorkflow() {
    setTranscript('');
    setPrd('');
    setPrdId(null);
    setTickets([]);
    setError('');
    setSubmitResult(null);
    loadComments([]);
  }

  function goToDashboard() {
    resetWorkflow();
    setActiveTranscript(null);
    setView('dashboard');
    setModalOpen(false);
  }

  function openTranscript(transcript) {
    setActiveTranscript(transcript);
    setView('transcript');
  }

  function handleGeneratePRDFromTranscript(t) {
    const text = t.lines.map(l => `${l.speaker}: ${l.text}`).join('\n');
    setTranscript(text);
    setActiveTranscript(null);
    setModalOpen(true);
    setView('dashboard');
    setSidebarSection('documents');
  }

  function handleNewPRD() {
    resetWorkflow();
    setModalOpen(true);
  }

  async function openPRD(id) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/prds/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to load PRD');
      const data = await res.json();
      setTranscript(data.transcript);
      setPrd(data.content);
      setPrdId(data.id);
      setProjectKey(data.project_key || 'KAN');
      loadComments(data.comments || []);
      setView('prd');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function generatePRD() {
    setLoading(true);
    setError('');
    const effectiveTranscript = testMode && !transcript.trim() ? '[Test mode — placeholder transcript]' : transcript;
    try {
      const res = await fetch(`${API}/generate-prd`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ transcript: effectiveTranscript, projectKey, testMode }),
        ...fetchOpts,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPrd(data.prd);
      setPrdId(data.prdId);
      loadComments([]);
      setModalOpen(false);
      setView('prd');
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  async function generateTickets() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/generate-tickets`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ prd, projectKey, testMode }),
        ...fetchOpts,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTickets(data.tickets);
      setSubmitResult(null);
      setView('tickets');
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  async function submitTickets() {
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/submit-tickets`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ tickets }),
        ...fetchOpts,
      });
      const data = await res.json();
      setSubmitResult(data);
      if (data.siteUrl) setSubmittedSiteUrl(data.siteUrl);
    } catch (e) {
      setSubmitResult({ error: e.message });
    } finally {
      setSubmitting(false);
    }
  }

  async function savePRDEdits() {
    if (!prdId) return;
    try {
      await fetch(`/api/prds/${prdId}`, {
        method: 'PUT',
        headers: authHeaders(token),
        body: JSON.stringify({ content: prd }),
      });
    } catch { /* silent */ }
  }

  async function handleResolveComment(commentId, action) {
    const data = await resolveComment(commentId, action);
    // If suggestion was accepted, update the PRD content
    if (data.updatedPrdContent) {
      setPrd(data.updatedPrdContent);
    }
  }

  async function handleAddComment(commentData) {
    try {
      await addComment(commentData);
    } catch (e) {
      setError(e.message);
    }
  }

  // Loading auth
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-[#787774]" />
      </div>
    );
  }

  // Not logged in
  if (!user) return <AuthPage onAuth={handleAuth} />;

  return (
    <div className="h-screen flex bg-white text-[#37352f]">
        <Sidebar
          activeSection={sidebarSection}
          onSectionChange={(section) => {
            setSidebarSection(section);
            if (view !== 'dashboard') {
              resetWorkflow();
              setView('dashboard');
              setModalOpen(false);
            }
          }}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(c => !c)}
          onGoHome={goToDashboard}
          user={user}
          testMode={testMode}
          onTestModeToggle={() => setTestMode(m => !m)}
          onLogout={logout}
          connection={connection}
          connectionLoading={connectionLoading}
          onDisconnectJira={disconnectJira}
          provider={provider}
        />

        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="max-w-5xl mx-auto px-6 mt-4">
              <div className="p-4 bg-[#fef2f2] border border-[#e9e8e4] rounded-[3px] flex items-center gap-3 text-[#e03e3e] text-sm">
                <AlertCircle size={18} />
                {error}
                <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600 text-xs">Dismiss</button>
              </div>
            </div>
          )}

          {/* Dashboard — Documents or Transcripts */}
          {view === 'dashboard' && (
            <main className="max-w-5xl mx-auto px-6 py-12">
              {sidebarSection === 'documents' ? (
                <PRDList token={token} onNewPRD={handleNewPRD} onOpenPRD={openPRD} />
              ) : sidebarSection === 'vtt-upload' ? (
                <VTTUpload token={token} connection={connection} provider={provider} />
              ) : (
                <TranscriptList onOpenTranscript={openTranscript} />
              )}
            </main>
          )}

          {/* Transcript View (full-page) */}
          {view === 'transcript' && activeTranscript && (
            <TranscriptView
              transcript={activeTranscript}
              onBack={() => { setActiveTranscript(null); setView('dashboard'); setSidebarSection('transcripts'); }}
              onGeneratePRD={handleGeneratePRDFromTranscript}
            />
          )}

          {/* PRD Document (full-page) */}
          {view === 'prd' && prd && (
            <PRDDocument
              prd={prd}
              setPrd={setPrd}
              prdId={prdId}
              savePRDEdits={savePRDEdits}
              comments={comments}
              onAddComment={handleAddComment}
              onAddReply={addReply}
              onResolveComment={handleResolveComment}
              onDeleteComment={deleteComment}
              currentUser={user}
              token={token}
              loading={loading}
              onGenerateTickets={generateTickets}
              onBack={goToDashboard}
            />
          )}

          {/* Tickets */}
          {view === 'tickets' && (
              <TicketView
                tickets={tickets}
                setTickets={setTickets}
                projectKey={projectKey}
                connection={connection}
                submitting={submitting}
                submitResult={submitResult}
                submittedSiteUrl={submittedSiteUrl}
                currentUser={user}
                onSubmitTickets={submitTickets}
                provider={provider}
                onBack={() => setView('prd')}
              />
          )}
        </div>

      {/* Transcript Modal */}
      <TranscriptModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        transcript={transcript}
        setTranscript={setTranscript}
        loading={loading}
        testMode={testMode}
        onGenerate={generatePRD}
      />
    </div>
  );
}
