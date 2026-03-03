import React, { useState } from 'react';
import { Copy, Plus, Loader2, Send } from 'lucide-react';
import TicketCard from './TicketCard.jsx';

function textToADF(text) {
  return {
    type: 'doc',
    version: 1,
    content: text.split('\n').filter(Boolean).map(line => ({
      type: 'paragraph',
      content: [{ type: 'text', text: line }],
    })),
  };
}

export default function TicketView({
  tickets, setTickets, projectKey, connection, submitting,
  submitResult, submittedSiteUrl, currentUser,
  onSubmitToJira, onBack,
}) {
  const [copied, setCopied] = useState('');
  const isConnected = connection?.connected;

  function copyToClipboard(text, label) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  }

  function handleTicketUpdate(index, updatedTicket) {
    setTickets(prev => prev.map((t, i) => i === index ? updatedTicket : t));
  }

  function handleTicketDelete(index) {
    setTickets(prev => prev.filter((_, i) => i !== index));
  }

  function handleAddTicket() {
    const newTicket = {
      fields: {
        project: { key: projectKey || 'PROJ' },
        summary: 'New Ticket',
        description: textToADF('Enter ticket description here.'),
        issuetype: { name: 'Task' },
        priority: { name: 'Medium' },
        labels: [],
      },
    };
    setTickets(prev => [...prev, newTicket]);
  }

  function browseUrl(issueKey) {
    const base = submittedSiteUrl || connection?.siteUrl || '';
    if (!base) return '#';
    return `${base.replace(/\/$/, '')}/browse/${issueKey}`;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{tickets.length} Jira Ticket{tickets.length !== 1 ? 's' : ''}</h2>
          <p className="text-xs text-gray-400">Edit, delete, or add tickets before submitting to Jira</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onBack} className="text-xs text-gray-500 hover:text-gray-700 transition-colors">&larr; Back to PRD</button>
          <button
            onClick={() => copyToClipboard(JSON.stringify(tickets, null, 2), 'tickets')}
            className={`flex items-center gap-1 text-xs border px-3 py-1.5 rounded-lg transition-all ${copied === 'tickets' ? 'bg-accent-50 border-accent-200 text-accent-600' : 'bg-white border-gray-200 hover:border-accent-200 text-gray-500 hover:text-accent-600'}`}
          >
            <Copy size={12} /> {copied === 'tickets' ? 'Copied!' : 'Copy All JSON'}
          </button>
        </div>
      </div>
      <div className="space-y-3 mb-4">
        {tickets.map((t, i) => <TicketCard key={i} ticket={t} index={i} onUpdate={handleTicketUpdate} onDelete={handleTicketDelete} currentUser={currentUser} />)}
      </div>
      <button
        onClick={handleAddTicket}
        className="flex items-center gap-2 w-full justify-center py-3 border-2 border-dashed border-gray-200 hover:border-accent-300 rounded-xl text-sm text-gray-400 hover:text-accent-600 transition-all duration-150 mb-6"
      >
        <Plus size={16} /> Add Ticket
      </button>

      <details className="group">
        <summary className="text-sm text-gray-500 cursor-pointer hover:text-accent-600 transition-colors font-medium">View full JSON payload</summary>
        <pre className="mt-3 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-xl p-4 overflow-x-auto overflow-y-auto max-h-96 whitespace-pre-wrap break-all">{JSON.stringify(tickets, null, 2)}</pre>
      </details>

      {submitResult && (
        <div className={`mt-6 text-sm p-4 rounded-xl ${submitResult.error ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}>
          {submitResult.error ? (
            <p>Error: {submitResult.error}</p>
          ) : (
            <div>
              <p className="font-medium">{submitResult.created}/{submitResult.total} tickets created in Jira</p>
              {submitResult.failed > 0 && <p className="mt-1">{submitResult.failed} failed</p>}
              {submitResult.results && submitResult.results.map((r, i) => (
                <div key={i} className="mt-1 text-xs">
                  {r.success ? (
                    <span>&#10003; <a href={browseUrl(r.data.key)} target="_blank" rel="noreferrer" className="underline text-accent-600 hover:text-accent-700">{r.data.key}</a></span>
                  ) : (
                    <span>&#10007; Ticket {i+1}: {JSON.stringify(r.data?.errors || r.data?.errorMessages || r.error)}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="h-20" />

      {/* Fixed bottom bar */}
      {tickets.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 shadow-elevated">
          <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 bg-accent-50 text-accent-700 text-xs font-medium px-3 py-1 rounded-full border border-accent-200">
                {connection?.siteName || projectKey || 'Jira'}
              </span>
              <span className="text-xs text-gray-400">{tickets.length} ticket{tickets.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-3">
              {!isConnected && (
                <a href="/auth/login" className="text-xs text-accent-600 hover:text-accent-700 underline">Connect Jira</a>
              )}
              <button
                onClick={onSubmitToJira}
                disabled={submitting || !isConnected || tickets.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-accent-600 text-white rounded-xl hover:bg-accent-700 disabled:opacity-50 transition-all duration-150 text-sm font-medium shadow-soft"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {submitting ? 'Pushing...' : 'Push Tickets to Jira'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
