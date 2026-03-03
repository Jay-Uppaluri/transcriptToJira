import React from 'react';
import { ArrowLeft, Eye, Pencil, Copy, MessageSquare, Users } from 'lucide-react';

export default function PRDToolbar({
  editMode, onToggleEdit, onCopy, copied,
  sidebarTab, onSetSidebarTab, commentCount,
  onBack,
}) {
  return (
    <div className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-2.5 max-w-[1200px] mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={14} />
          Dashboard
        </button>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onToggleEdit}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              editMode
                ? 'bg-accent-50 text-accent-700 border border-accent-200'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 border border-transparent'
            }`}
          >
            {editMode ? <><Eye size={13} /> Preview</> : <><Pencil size={13} /> Edit</>}
          </button>

          <button
            onClick={onCopy}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              copied ? 'text-accent-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Copy size={13} />
            {copied ? 'Copied!' : 'Copy'}
          </button>

          <button
            onClick={() => onSetSidebarTab(sidebarTab === 'summary' ? null : 'summary')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              sidebarTab === 'summary'
                ? 'bg-accent-50 text-accent-700 border border-accent-200'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 border border-transparent'
            }`}
          >
            <Users size={13} />
            Summary
          </button>

          <button
            onClick={() => onSetSidebarTab(sidebarTab === 'comments' ? null : 'comments')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              sidebarTab === 'comments'
                ? 'bg-accent-50 text-accent-700 border border-accent-200'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 border border-transparent'
            }`}
          >
            <MessageSquare size={13} />
            Comments
            {commentCount > 0 && (
              <span className="bg-accent-100 text-accent-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {commentCount}
              </span>
            )}
          </button>

        </div>
      </div>
    </div>
  );
}
