import React from 'react';
import { ChevronRight, Plus, Loader2, Send } from 'lucide-react';
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
  onSubmitTickets, provider, onBack,
}) {
  const isConnected = connection?.connected;

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
      {/* Sticky top bar */}
      {tickets.length > 0 && (
        <div className="sticky top-0 z-30 bg-white border-b border-[#e9e8e4]">
          <div className="flex items-center justify-between px-6 py-2.5">
            <nav className="flex items-center gap-1.5 text-sm min-w-0">
              <button
                onClick={onBack}
                className="text-[#787774] hover:text-[#37352f] shrink-0"
              >
                Documents
              </button>
              <ChevronRight size={14} className="text-[#c4c4c0] shrink-0" />
              <span className="text-[#37352f] font-medium truncate max-w-[300px]">
                {provider.itemLabelPlural}
              </span>
              <span className="text-xs text-[#9b9a97] ml-1">({tickets.length})</span>
            </nav>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 bg-[rgba(55,53,47,0.06)] text-[#37352f] text-xs font-medium px-3 py-1 rounded-[3px]">
                {connection?.siteName || projectKey || provider.displayName}
              </span>
              {!isConnected && provider.name === 'jira' && (
                <a href="/auth/login" className="text-xs text-[#2383e2] hover:text-[#1b6abf] underline">Connect {provider.displayName}</a>
              )}
              <button
                onClick={onSubmitTickets}
                disabled={submitting || (provider.name === 'jira' && !isConnected) || tickets.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-[#2383e2] text-white rounded-[3px] hover:bg-[#1b6abf] disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm transition-colors"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {submitting ? 'Pushing...' : `Push ${provider.itemLabelPlural} to ${provider.displayName}`}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-6 pt-8 pb-20">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-medium text-[#37352f]">{tickets.length} {provider.itemLabel}{tickets.length !== 1 ? 's' : ''}</h2>
          <p className="text-xs text-[#9b9a97]">Edit, delete, or add {provider.itemLabelPlural.toLowerCase()} before submitting to {provider.displayName}</p>
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

      {submitResult && (
        <div className={`mt-6 text-sm p-4 rounded-[3px] ${submitResult.error ? 'bg-[#fef2f2] border border-[#e9e8e4] text-[#e03e3e]' : 'bg-[#f0fdf4] border border-[#e9e8e4] text-[#0f7b6c]'}`}>
          {submitResult.error ? (
            <p>Error: {submitResult.error}</p>
          ) : (
            <div>
              <p className="font-medium">{submitResult.created}/{submitResult.total} {provider.itemLabelPlural.toLowerCase()} created in {provider.displayName}</p>
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

    </div>
  );
}
