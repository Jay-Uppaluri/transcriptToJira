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
      <div className="max-w-5xl mx-auto px-6 pt-12 pb-20">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-medium text-[#37352f]">{tickets.length} Jira Ticket{tickets.length !== 1 ? 's' : ''}</h2>
          <p className="text-xs text-[#9b9a97]">Edit, delete, or add tickets before submitting to Jira</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onBack} className="text-xs text-[#787774] hover:text-[#37352f]">&larr; Back to PRD</button>
          <button
            onClick={() => copyToClipboard(JSON.stringify(tickets, null, 2), 'tickets')}
            className={`flex items-center gap-1 text-xs border px-3 py-1.5 rounded-[3px] ${copied === 'tickets' ? 'bg-[rgba(55,53,47,0.06)] border-[#e9e8e4] text-[#2383e2]' : 'bg-white border-[#e9e8e4] text-[#787774] hover:bg-[rgba(55,53,47,0.08)]'}`}
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
        className="flex items-center gap-2 w-full justify-center py-3 border-2 border-dashed border-[#e9e8e4] hover:border-[#787774] rounded-[3px] text-sm text-[#9b9a97] hover:text-[#37352f] mb-6"
      >
        <Plus size={16} /> Add Ticket
      </button>

      <details className="group">
        <summary className="text-sm text-[#787774] cursor-pointer hover:text-[#37352f] font-medium">View full JSON payload</summary>
        <pre className="mt-3 text-xs text-[#787774] bg-[rgba(55,53,47,0.04)] border border-[#e9e8e4] rounded-[3px] p-4 overflow-x-auto overflow-y-auto max-h-96 whitespace-pre-wrap break-all">{JSON.stringify(tickets, null, 2)}</pre>
      </details>

      {submitResult && (
        <div className={`mt-6 text-sm p-4 rounded-[3px] ${submitResult.error ? 'bg-[#fef2f2] border border-[#e9e8e4] text-[#e03e3e]' : 'bg-[#f0fdf4] border border-[#e9e8e4] text-[#0f7b6c]'}`}>
          {submitResult.error ? (
            <p>Error: {submitResult.error}</p>
          ) : (
            <div>
              <p className="font-medium">{submitResult.created}/{submitResult.total} tickets created in Jira</p>
              {submitResult.failed > 0 && <p className="mt-1">{submitResult.failed} failed</p>}
              {submitResult.results && submitResult.results.map((r, i) => (
                <div key={i} className="mt-1 text-xs">
                  {r.success ? (
                    <span>&#10003; <a href={browseUrl(r.data.key)} target="_blank" rel="noreferrer" className="underline text-[#2383e2] hover:text-[#1b6abf]">{r.data.key}</a></span>
                  ) : (
                    <span>&#10007; Ticket {i+1}: {JSON.stringify(r.data?.errors || r.data?.errorMessages || r.error)}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      </div>

      {/* Sticky bottom bar */}
      {tickets.length > 0 && (
        <div className="sticky bottom-0 bg-white border-t border-[#e9e8e4] z-40">
          <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 bg-[rgba(55,53,47,0.06)] text-[#37352f] text-xs font-medium px-3 py-1 rounded-[3px]">
                {connection?.siteName || projectKey || 'Jira'}
              </span>
              <span className="text-xs text-[#9b9a97]">{tickets.length} ticket{tickets.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-3">
              {!isConnected && (
                <a href="/auth/login" className="text-xs text-[#2383e2] hover:text-[#1b6abf] underline">Connect Jira</a>
              )}
              <button
                onClick={onSubmitToJira}
                disabled={submitting || !isConnected || tickets.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#2383e2] text-white rounded-[3px] hover:bg-[#1b6abf] disabled:opacity-50 text-sm font-medium"
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
