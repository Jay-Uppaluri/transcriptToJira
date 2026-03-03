import React from 'react';
import { ChevronRight, MessageSquare, Users, Ticket, Loader2 } from 'lucide-react';

export default function PRDToolbar({
  sidebarTab, onSetSidebarTab, commentCount,
  onBack, prdTitle,
  onGenerateTickets, loading,
}) {
  return (
    <div className="sticky top-0 z-30 bg-white border-b border-[#e9e8e4]">
      <div className="flex items-center justify-between px-6 py-2.5">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm min-w-0">
          <button
            onClick={onBack}
            className="text-[#787774] hover:text-[#37352f] shrink-0"
          >
            Documents
          </button>
          <ChevronRight size={14} className="text-[#c4c4c0] shrink-0" />
          <span className="text-[#37352f] font-medium truncate max-w-[300px]">
            {prdTitle}
          </span>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Secondary CTAs */}
          <button
            onClick={() => onSetSidebarTab(sidebarTab === 'summary' ? null : 'summary')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-[3px] border transition-colors ${
              sidebarTab === 'summary'
                ? 'border-[#2383e2] text-[#2383e2] bg-[rgba(35,131,226,0.04)]'
                : 'border-[#d5d4d0] text-[#787774] hover:text-[#37352f] hover:border-[#c4c4c0] bg-transparent'
            }`}
          >
            <Users size={16} />
            Summary
          </button>

          <button
            onClick={() => onSetSidebarTab(sidebarTab === 'comments' ? null : 'comments')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-[3px] border transition-colors ${
              sidebarTab === 'comments'
                ? 'border-[#2383e2] text-[#2383e2] bg-[rgba(35,131,226,0.04)]'
                : 'border-[#d5d4d0] text-[#787774] hover:text-[#37352f] hover:border-[#c4c4c0] bg-transparent'
            }`}
          >
            <MessageSquare size={16} />
            Comments
            {commentCount > 0 && (
              <span className="bg-[rgba(55,53,47,0.06)] text-[#37352f] text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {commentCount}
              </span>
            )}
          </button>

          {/* Primary CTA */}
          <button
            onClick={onGenerateTickets}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-[#2383e2] text-white rounded-[3px] hover:bg-[#1b6abf] disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm transition-colors"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Ticket size={16} />}
            Generate Tickets
          </button>
        </div>
      </div>
    </div>
  );
}
