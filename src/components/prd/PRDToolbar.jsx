import React from 'react';
import { ArrowLeft, Eye, Pencil, Copy, MessageSquare, Users } from 'lucide-react';

export default function PRDToolbar({
  editMode, onToggleEdit, onCopy, copied,
  sidebarTab, onSetSidebarTab, commentCount,
  onBack,
}) {
  return (
    <div className="sticky top-0 z-30 bg-white border-b border-[#e9e8e4]">
      <div className="flex items-center justify-between px-6 py-2.5 max-w-[1200px] mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-[#787774] hover:text-[#37352f]"
        >
          <ArrowLeft size={14} />
          Dashboard
        </button>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onToggleEdit}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[3px] ${
              editMode
                ? 'bg-[rgba(55,53,47,0.08)] text-[#37352f]'
                : 'text-[#787774] hover:bg-[rgba(55,53,47,0.08)]'
            }`}
          >
            {editMode ? <><Eye size={13} /> Preview</> : <><Pencil size={13} /> Edit</>}
          </button>

          <button
            onClick={onCopy}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[3px] ${
              copied ? 'text-[#2383e2]' : 'text-[#787774] hover:bg-[rgba(55,53,47,0.08)]'
            }`}
          >
            <Copy size={13} />
            {copied ? 'Copied!' : 'Copy'}
          </button>

          <button
            onClick={() => onSetSidebarTab(sidebarTab === 'summary' ? null : 'summary')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[3px] ${
              sidebarTab === 'summary'
                ? 'bg-[rgba(55,53,47,0.08)] text-[#37352f]'
                : 'text-[#787774] hover:bg-[rgba(55,53,47,0.08)]'
            }`}
          >
            <Users size={13} />
            Summary
          </button>

          <button
            onClick={() => onSetSidebarTab(sidebarTab === 'comments' ? null : 'comments')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[3px] ${
              sidebarTab === 'comments'
                ? 'bg-[rgba(55,53,47,0.08)] text-[#37352f]'
                : 'text-[#787774] hover:bg-[rgba(55,53,47,0.08)]'
            }`}
          >
            <MessageSquare size={13} />
            Comments
            {commentCount > 0 && (
              <span className="bg-[rgba(55,53,47,0.06)] text-[#37352f] text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {commentCount}
              </span>
            )}
          </button>

        </div>
      </div>
    </div>
  );
}
