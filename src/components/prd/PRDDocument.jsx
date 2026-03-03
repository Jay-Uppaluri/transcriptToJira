import React, { useState, useRef, useCallback, useMemo } from 'react';
import PRDToolbar from './PRDToolbar.jsx';
import PRDEditor from './PRDEditor.jsx';
import PRDMarkdownRenderer from './PRDMarkdownRenderer.jsx';
import CommentSidebar from '../comments/CommentSidebar.jsx';
import MeetingSummarySidebar from './MeetingSummarySidebar.jsx';
import SelectionPopover from '../comments/SelectionPopover.jsx';
import useTextSelection from '../../hooks/useTextSelection.js';
import { resolveAnchors } from '../../utils/textAnchor.js';
import { Eye, Pencil, Copy } from 'lucide-react';

export default function PRDDocument({
  prd, setPrd, prdId, savePRDEdits,
  comments, onAddComment, onAddReply, onResolveComment, onDeleteComment,
  currentUser, token, loading, onGenerateTickets, onBack,
}) {
  const [editMode, setEditMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sidebarTab, setSidebarTab] = useState(null); // 'comments' | 'summary' | null
  const [activeCommentId, setActiveCommentId] = useState(null);
  const [draftMode, setDraftMode] = useState(null); // null | 'comment' | 'suggestion'
  const [draftSelection, setDraftSelection] = useState(null);
  const [showDocActions, setShowDocActions] = useState(false);
  const containerRef = useRef(null);

  const { selection, popoverPos, clearSelection } = useTextSelection(containerRef, !editMode);

  // Resolve comment anchors for highlighting (memoized to avoid PRDMarkdownRenderer re-renders)
  const resolvedAnchors = useMemo(() => resolveAnchors(comments, prd), [comments, prd]);

  const commentCount = comments.filter(c => c.status === 'open').length;

  // Extract PRD title from first markdown heading
  const prdTitle = useMemo(() => {
    const match = prd.match(/^#\s+(.+)$/m);
    return match ? match[1] : 'Untitled PRD';
  }, [prd]);

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
    setDraftSelection(selection);
    setDraftMode(mode);
    setSidebarTab('comments');
  }, [selection]);

  function handleSubmitComment(content, suggestedText) {
    if (!draftSelection) return;
    onAddComment({
      content,
      selection_text: draftSelection.text,
      selection_prefix: draftSelection.prefix,
      selection_suffix: draftSelection.suffix,
      selection_start: draftSelection.start,
      selection_end: draftSelection.end,
      comment_type: draftMode || 'comment',
      suggested_text: suggestedText || null,
    });
    setDraftMode(null);
    setDraftSelection(null);
    clearSelection();
  }

  function handleSubmitGeneralComment(content) {
    onAddComment({ content, comment_type: 'general' });
  }

  function handleCancelDraft() {
    setDraftMode(null);
    setDraftSelection(null);
    clearSelection();
  }

  const sidebarOpen = sidebarTab !== null;

  return (
    <div className="min-h-screen bg-white">
      <PRDToolbar
        sidebarTab={sidebarTab}
        onSetSidebarTab={setSidebarTab}
        commentCount={commentCount}
        onBack={onBack}
        prdTitle={prdTitle}
        onGenerateTickets={onGenerateTickets}
        loading={loading}
      />

      <div className="flex">
        {/* Document area */}
        <div className="flex-1 min-w-0 transition-all duration-300">
          <div
            className="relative max-w-[800px] mx-auto px-8 py-10"
            onMouseEnter={() => setShowDocActions(true)}
            onMouseLeave={() => setShowDocActions(false)}
          >
            {/* Floating Edit/Copy actions on hover */}
            <div
              className={`absolute top-4 right-4 flex items-center gap-1 bg-white border border-[#e9e8e4] rounded-[3px] shadow-sm p-1 z-10 transition-opacity duration-150 ${
                showDocActions ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <button
                onClick={handleToggleEdit}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-[2px] ${
                  editMode
                    ? 'bg-[rgba(55,53,47,0.08)] text-[#37352f]'
                    : 'text-[#787774] hover:bg-[rgba(55,53,47,0.08)]'
                }`}
              >
                {editMode ? <><Eye size={12} /> Preview</> : <><Pencil size={12} /> Edit</>}
              </button>
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-[2px] ${
                  copied ? 'text-[#2383e2]' : 'text-[#787774] hover:bg-[rgba(55,53,47,0.08)]'
                }`}
              >
                <Copy size={12} />
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

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
                  draftSelection={draftSelection}
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

    </div>
  );
}
