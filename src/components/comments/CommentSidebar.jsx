import React, { useEffect, useRef } from 'react';
import { MessageSquare, X } from 'lucide-react';
import CommentThread from './CommentThread.jsx';
import CommentInput from './CommentInput.jsx';

export default function CommentSidebar({
  comments, activeCommentId, onSetActive,
  onReply, onResolve, onDelete, currentUser,
  draftMode, draftSelection, onSubmitDraft, onCancelDraft,
  onSubmitGeneral, onClose,
}) {
  const sidebarRef = useRef(null);

  // Auto-scroll to active comment
  useEffect(() => {
    if (activeCommentId && sidebarRef.current) {
      const el = sidebarRef.current.querySelector(`#comment-${activeCommentId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [activeCommentId]);

  const inlineComments = comments.filter(c => c.comment_type !== 'general');
  const generalComments = comments.filter(c => c.comment_type === 'general');
  const openCount = comments.filter(c => c.status === 'open').length;

  return (
    <div className="h-full bg-white border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <MessageSquare size={14} className="text-gray-500" />
        <span className="text-sm font-medium text-gray-900">Comments</span>
        {openCount > 0 && (
          <span className="bg-accent-100 text-accent-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
            {openCount}
          </span>
        )}
        <button
          onClick={onClose}
          className="ml-auto p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
          title="Close comments"
        >
          <X size={14} />
        </button>
      </div>

      {/* Content */}
      <div ref={sidebarRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {/* New inline comment draft */}
        {draftMode && draftSelection && (
          <div className="rounded-xl border-2 border-accent-300 bg-accent-50/30 p-3">
            <div className="text-[10px] font-medium text-accent-600 uppercase tracking-wider mb-2">
              {draftMode === 'suggestion' ? 'New Suggestion' : 'New Comment'}
            </div>
            <CommentInput
              mode={draftMode}
              selectionText={draftSelection.text}
              onSubmit={onSubmitDraft}
              onCancel={onCancelDraft}
            />
          </div>
        )}

        {/* Inline comments */}
        {inlineComments.length > 0 && (
          <div>
            <h4 className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2 px-1">
              Inline ({inlineComments.length})
            </h4>
            <div className="space-y-2">
              {inlineComments.map(comment => (
                <CommentThread
                  key={comment.id}
                  comment={comment}
                  isActive={activeCommentId === comment.id}
                  onSetActive={onSetActive}
                  onReply={onReply}
                  onResolve={onResolve}
                  onDelete={onDelete}
                  currentUser={currentUser}
                />
              ))}
            </div>
          </div>
        )}

        {/* General comments */}
        <div>
          <h4 className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2 px-1">
            General {generalComments.length > 0 && `(${generalComments.length})`}
          </h4>
          {generalComments.length > 0 && (
            <div className="space-y-2 mb-3">
              {generalComments.map(comment => (
                <CommentThread
                  key={comment.id}
                  comment={comment}
                  isActive={activeCommentId === comment.id}
                  onSetActive={onSetActive}
                  onReply={onReply}
                  onResolve={onResolve}
                  onDelete={onDelete}
                  currentUser={currentUser}
                />
              ))}
            </div>
          )}
          <CommentInput
            mode="general"
            onSubmit={(content) => onSubmitGeneral(content)}
            placeholder="Add a general comment..."
            autoFocus={false}
          />
        </div>

        {/* Empty state */}
        {comments.length === 0 && !draftMode && (
          <div className="text-center py-8">
            <MessageSquare size={24} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">No comments yet</p>
            <p className="text-xs text-gray-400 mt-1">Select text in the document to leave an inline comment</p>
          </div>
        )}
      </div>
    </div>
  );
}
