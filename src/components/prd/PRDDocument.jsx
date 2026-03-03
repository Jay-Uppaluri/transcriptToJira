import React, { useState, useRef, useCallback, useMemo } from 'react';
import PRDToolbar from './PRDToolbar.jsx';
import PRDEditor from './PRDEditor.jsx';
import PRDMarkdownRenderer from './PRDMarkdownRenderer.jsx';
import CommentSidebar from '../comments/CommentSidebar.jsx';
import MeetingSummarySidebar from './MeetingSummarySidebar.jsx';
import SelectionPopover from '../comments/SelectionPopover.jsx';
import useTextSelection from '../../hooks/useTextSelection.js';
import { resolveAnchors } from '../../utils/textAnchor.js';
import { Ticket, Loader2 } from 'lucide-react';

export default function PRDDocument({
  prd, setPrd, prdId, savePRDEdits,
  comments, onAddComment, onAddReply, onResolveComment, onDeleteComment,
  currentUser, token, loading, onGenerateTickets, onBack,
}) {
  const [editMode, setEditMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('comments'); // 'comments' | 'summary' | null
  const [activeCommentId, setActiveCommentId] = useState(null);
  const [draftMode, setDraftMode] = useState(null); // null | 'comment' | 'suggestion'
  const containerRef = useRef(null);

  const { selection, popoverPos, clearSelection } = useTextSelection(containerRef, !editMode);

  // Resolve comment anchors for highlighting (memoized to avoid PRDMarkdownRenderer re-renders)
  const resolvedAnchors = useMemo(() => resolveAnchors(comments, prd), [comments, prd]);

  const commentCount = comments.filter(c => c.status === 'open').length;

  function handleToggleEdit() {
    if (editMode) savePRDEdits();
    setEditMode(!editMode);
  }

  function handleCopy() {
    navigator.clipboard.writeText(prd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const handleHighlightClick = useCallback((commentId) => {
    setActiveCommentId(commentId);
    setSidebarTab('comments');
  }, []);

  const handleStartComment = useCallback((mode) => {
    setDraftMode(mode);
    setSidebarTab('comments');
  }, []);

  function handleSubmitComment(content, suggestedText) {
    if (!selection) return;
    onAddComment({
      content,
      selection_text: selection.text,
      selection_prefix: selection.prefix,
      selection_suffix: selection.suffix,
      selection_start: selection.start,
      selection_end: selection.end,
      comment_type: draftMode || 'comment',
      suggested_text: suggestedText || null,
    });
    setDraftMode(null);
    clearSelection();
  }

  function handleSubmitGeneralComment(content) {
    onAddComment({ content, comment_type: 'general' });
  }

  function handleCancelDraft() {
    setDraftMode(null);
    clearSelection();
  }

  const sidebarOpen = sidebarTab !== null;

  return (
    <div className="min-h-screen bg-[#fafbfc]">
      <PRDToolbar
        editMode={editMode}
        onToggleEdit={handleToggleEdit}
        onCopy={handleCopy}
        copied={copied}
        sidebarTab={sidebarTab}
        onSetSidebarTab={setSidebarTab}
        commentCount={commentCount}
        onBack={onBack}
      />

      <div className="flex">
        {/* Document area */}
        <div className="flex-1 min-w-0 transition-all duration-300">
          <div className="max-w-[800px] mx-auto px-8 py-10">
            {editMode ? (
              <PRDEditor value={prd} onChange={setPrd} />
            ) : (
              <PRDMarkdownRenderer
                content={prd}
                resolvedAnchors={resolvedAnchors}
                onHighlightClick={handleHighlightClick}
                containerRef={containerRef}
              />
            )}
          </div>
        </div>

        {/* Sidebar */}
        {sidebarOpen && (
          <aside className="w-[340px] shrink-0">
            <div className="sticky top-[49px] h-[calc(100vh-49px)]">
              {sidebarTab === 'comments' && (
                <CommentSidebar
                  comments={comments}
                  activeCommentId={activeCommentId}
                  onSetActive={setActiveCommentId}
                  onReply={onAddReply}
                  onResolve={onResolveComment}
                  onDelete={onDeleteComment}
                  currentUser={currentUser}
                  draftMode={draftMode}
                  draftSelection={selection}
                  onSubmitDraft={handleSubmitComment}
                  onCancelDraft={handleCancelDraft}
                  onSubmitGeneral={handleSubmitGeneralComment}
                  onClose={() => setSidebarTab(null)}
                />
              )}
              {sidebarTab === 'summary' && (
                <MeetingSummarySidebar onClose={() => setSidebarTab(null)} />
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Selection popover */}
      {!editMode && selection && !draftMode && (
        <SelectionPopover
          position={popoverPos}
          onComment={() => handleStartComment('comment')}
          onSuggest={() => handleStartComment('suggestion')}
        />
      )}

      {/* Bottom spacer for fixed toolbar */}
      <div className="h-20" />

      {/* Fixed bottom toolbar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 shadow-elevated">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-end">
          <button
            onClick={onGenerateTickets}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-accent-600 text-white rounded-xl hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm transition-all duration-150 shadow-soft"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Ticket size={15} />}
            Generate Tickets
          </button>
        </div>
      </div>
    </div>
  );
}
