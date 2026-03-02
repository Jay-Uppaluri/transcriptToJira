import React, { useState } from 'react';
import { FileText, ArrowRight, ClipboardList, Loader2, CheckCircle2, Copy, ChevronDown, ChevronUp, AlertCircle, Ticket, Send } from 'lucide-react';

const API = '/api';

const steps = [
  { id: 1, label: 'Paste Transcript', icon: FileText },
  { id: 2, label: 'Generate PRD', icon: ClipboardList },
  { id: 3, label: 'Generate Jira Tickets', icon: Ticket },
];

function StepIndicator({ current }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-10">
      {steps.map((s, i) => {
        const Icon = s.icon;
        const done = current > s.id;
        const active = current === s.id;
        return (
          <React.Fragment key={s.id}>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${active ? 'bg-red-500/20 text-red-300 border border-red-500/40' : done ? 'bg-green-500/20 text-green-300 border border-green-500/40' : 'bg-gray-800 text-gray-500 border border-gray-700'}`}>
              {done ? <CheckCircle2 size={16} /> : <Icon size={16} />}
              {s.label}
            </div>
            {i < steps.length - 1 && <ArrowRight size={16} className="text-gray-600" />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function TicketCard({ ticket, index }) {
  const [open, setOpen] = useState(false);
  const f = ticket.fields;
  const priorityColors = { Highest: 'text-red-400', High: 'text-orange-400', Medium: 'text-yellow-400', Low: 'text-blue-400', Lowest: 'text-gray-400' };
  const typeColors = { Epic: 'bg-purple-500/20 text-purple-300', Story: 'bg-green-500/20 text-green-300', Task: 'bg-blue-500/20 text-blue-300', Bug: 'bg-red-500/20 text-red-300' };

  function extractText(node) {
    if (!node) return '';
    if (node.text) return node.text;
    if (node.content) return node.content.map(extractText).join('\n');
    return '';
  }

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 hover:border-gray-500 transition-all overflow-hidden">
      <div className="p-4 cursor-pointer flex items-start justify-between gap-3" onClick={() => setOpen(!open)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[f.issuetype?.name] || 'bg-gray-700 text-gray-300'}`}>{f.issuetype?.name || 'Task'}</span>
            <span className={`text-xs font-medium ${priorityColors[f.priority?.name] || 'text-gray-400'}`}>{f.priority?.name}</span>
            {f.labels?.map(l => <span key={l} className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">{l}</span>)}
          </div>
          <h3 className="font-semibold text-white text-sm">{f.summary}</h3>
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400 shrink-0 mt-1" /> : <ChevronDown size={16} className="text-gray-400 shrink-0 mt-1" />}
      </div>
      {open && (
        <div className="px-4 pb-4 border-t border-gray-700/50 pt-3">
          <div className="text-xs text-gray-400 whitespace-pre-wrap leading-relaxed mb-3 break-words overflow-hidden">{extractText(f.description)}</div>
          <details className="group">
            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300 transition-colors">View raw JSON</summary>
            <pre className="mt-2 text-xs text-gray-500 bg-gray-900 rounded-lg p-3 overflow-x-auto overflow-y-auto max-h-60 break-all whitespace-pre-wrap">{JSON.stringify(ticket, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [step, setStep] = useState(1);
  const [transcript, setTranscript] = useState('');
  const [projectKey, setProjectKey] = useState('PROJ');
  const [prd, setPrd] = useState('');
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  async function generatePRD() {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/generate-prd`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPrd(data.prd);
      setStep(2);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  async function generateTickets() {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/generate-tickets`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prd, projectKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTickets(data.tickets);
      setStep(3);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  function copyToClipboard(text, label) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/30">
              <FileText size={24} className="text-red-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Transcript → PRD → Jira</h1>
              <p className="text-sm text-gray-500">Paste a Teams transcript, get a PRD, generate Jira-ready tickets</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <StepIndicator current={step} />

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-300 text-sm">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* Step 1: Transcript Input */}
        {step === 1 && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Paste your Teams meeting transcript</label>
            <textarea
              className="w-full h-80 bg-gray-800 border border-gray-700 rounded-xl p-4 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 resize-none font-mono"
              placeholder={"Paste your Microsoft Teams transcript here...\n\nExample:\n0:00:01 — John Smith\nAlright, let's kick off the sprint planning...\n\n0:01:15 — Jane Doe\nI think we need to prioritize the checkout flow..."}
              value={transcript}
              onChange={e => setTranscript(e.target.value)}
            />
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-gray-500">{transcript.length.toLocaleString()} characters</span>
              <div className="flex items-center gap-3">
                <div>
                  <label className="text-xs text-gray-500 mr-2">Jira Project Key:</label>
                  <input
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 w-24 focus:outline-none focus:border-red-500/50"
                    value={projectKey}
                    onChange={e => setProjectKey(e.target.value.toUpperCase())}
                    placeholder="PROJ"
                  />
                </div>
                <button
                  onClick={generatePRD}
                  disabled={!transcript.trim() || loading}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-6 py-2.5 rounded-xl font-medium text-sm transition-all"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                  Generate PRD
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: PRD Review */}
        {step === 2 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-300">Generated PRD</label>
              <div className="flex gap-2">
                <button onClick={() => setStep(1)} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">← Back to transcript</button>
                <button onClick={() => copyToClipboard(prd, 'prd')} className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors">
                  <Copy size={12} /> {copied === 'prd' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            <textarea
              className="w-full h-96 bg-gray-800 border border-gray-700 rounded-xl p-4 text-sm text-gray-200 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 resize-none font-mono leading-relaxed"
              value={prd}
              onChange={e => setPrd(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-2 mb-4">You can edit the PRD above before generating tickets.</p>
            <div className="flex justify-end">
              <button
                onClick={generateTickets}
                disabled={loading}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-6 py-2.5 rounded-xl font-medium text-sm transition-all"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Ticket size={16} />}
                Generate Jira Tickets
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Jira Tickets */}
        {step === 3 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">{tickets.length} Jira Tickets Generated</h2>
                <p className="text-xs text-gray-500">Each ticket is in exact Jira REST API format (POST /rest/api/3/issue)</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep(2)} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">← Back to PRD</button>
                <button
                  onClick={() => copyToClipboard(JSON.stringify(tickets, null, 2), 'tickets')}
                  className="flex items-center gap-1 text-xs bg-gray-800 border border-gray-700 hover:border-gray-500 text-gray-300 px-3 py-1.5 rounded-lg transition-all"
                >
                  <Copy size={12} /> {copied === 'tickets' ? 'Copied!' : 'Copy All JSON'}
                </button>
              </div>
            </div>
            <div className="space-y-3 mb-6">
              {tickets.map((t, i) => <TicketCard key={i} ticket={t} index={i} />)}
            </div>

            {/* Raw JSON export */}
            <details className="group">
              <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-300 transition-colors font-medium">View full JSON payload</summary>
              <pre className="mt-3 text-xs text-gray-400 bg-gray-800 border border-gray-700 rounded-xl p-4 overflow-x-auto overflow-y-auto max-h-96 whitespace-pre-wrap break-all">{JSON.stringify(tickets, null, 2)}</pre>
            </details>

            {/* Jira submit placeholder */}
            <div className="mt-8 p-6 bg-gray-800/50 border border-dashed border-gray-600 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <Send size={18} className="text-gray-500" />
                <h3 className="font-medium text-gray-400">Submit to Jira</h3>
              </div>
              <p className="text-sm text-gray-500">
                The Jira API integration endpoint is stubbed at <code className="text-red-400 bg-gray-900 px-1.5 py-0.5 rounded text-xs">POST /api/submit-to-jira</code>. 
                Open <code className="text-red-400 bg-gray-900 px-1.5 py-0.5 rounded text-xs">server.js</code> and wire up your Jira base URL, email, and API token to push these tickets directly.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
