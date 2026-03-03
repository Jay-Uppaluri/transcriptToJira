import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import AuthPage from './components/AuthPage.jsx';
import PRDList from './components/PRDList.jsx';
import Header from './components/layout/Header.jsx';
import TranscriptModal from './components/modal/TranscriptModal.jsx';
import PRDDocument from './components/prd/PRDDocument.jsx';
import TicketView from './components/tickets/TicketView.jsx';
import useComments from './hooks/useComments.js';
import { authHeaders } from './utils/api.js';

const API = '/api';
const fetchOpts = { credentials: 'include' };

export default function App() {
  // Auth state
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  // View: 'dashboard' | 'prd' | 'tickets'
  const [view, setView] = useState('dashboard');
  const [modalOpen, setModalOpen] = useState(false);

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
    setView('dashboard');
    setModalOpen(false);
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

  async function submitToJira() {
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/submit-to-jira`, {
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
      <div className="min-h-screen bg-[#fafbfc] flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-accent-500" />
      </div>
    );
  }

  // Not logged in
  if (!user) return <AuthPage onAuth={handleAuth} />;

  return (
    <div className="min-h-screen bg-[#fafbfc] text-gray-900">
      <Header
        user={user}
        connection={connection}
        connectionLoading={connectionLoading}
        testMode={testMode}
        onTestModeToggle={() => setTestMode(m => !m)}
        onDisconnectJira={disconnectJira}
        onLogout={logout}
        onGoHome={goToDashboard}
      />

      {error && (
        <div className="max-w-5xl mx-auto px-6 mt-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-600 text-sm">
            <AlertCircle size={18} />
            {error}
            <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600 text-xs">Dismiss</button>
          </div>
        </div>
      )}

      {/* Dashboard */}
      {view === 'dashboard' && (
        <main className="max-w-5xl mx-auto px-6 py-12">
          <PRDList token={token} onNewPRD={handleNewPRD} onOpenPRD={openPRD} />
        </main>
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
        <main className="max-w-5xl mx-auto px-6 py-12">
          <TicketView
            tickets={tickets}
            setTickets={setTickets}
            projectKey={projectKey}
            connection={connection}
            submitting={submitting}
            submitResult={submitResult}
            submittedSiteUrl={submittedSiteUrl}
            currentUser={user}
            onSubmitToJira={submitToJira}
            onBack={() => setView('prd')}
          />
        </main>
      )}

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
