import React, { useState } from 'react';
import { Check, X, Reply, Trash2, CheckCircle2 } from 'lucide-react';
import SuggestionDiff from './SuggestionDiff.jsx';
import CommentInput from './CommentInput.jsx';

const AVATAR_COLORS = [
  'bg-purple-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-rose-500',
];

function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function CommentThread({ comment, isActive, onSetActive, onReply, onResolve, onDelete, currentUser }) {
  const [showReply, setShowReply] = useState(false);
  const isResolved = comment.status !== 'open';
  const isSuggestion = comment.comment_type === 'suggestion';

  function handleReplySubmit(content) {
    onReply(comment.id, content);
    setShowReply(false);
  }

  return (
    <div
      id={`comment-${comment.id}`}
      onClick={() => onSetActive(comment.id)}
      className={`rounded-[3px] border p-3 cursor-pointer ${
        isActive
          ? 'border-[#2383e2] bg-[rgba(45,170,219,0.06)]'
          : 'border-[#e9e8e4] bg-white hover:bg-[rgba(55,53,47,0.04)]'
      } ${isResolved ? 'opacity-60' : ''}`}
    >
      {/* Selection quote */}
      {comment.selection_text && (
        <div className="mb-2 text-xs text-[#787774] bg-[rgba(55,53,47,0.04)] rounded-[3px] px-2.5 py-1.5 border-l-2 border-[#e9e8e4] italic">
          "{comment.selection_text.length > 100 ? comment.selection_text.slice(0, 100) + '...' : comment.selection_text}"
        </div>
      )}

      {/* Author line */}
      <div className="flex items-start gap-2 mb-1.5">
        <div className={`w-5 h-5 rounded-full ${getAvatarColor(comment.user_name)} flex items-center justify-center text-white text-[9px] font-semibold shrink-0 mt-0.5`}>
          {comment.user_name.charAt(0).toUpperCase()}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-medium text-[#37352f] leading-tight">{comment.user_name}</span>
          <span className="text-[10px] text-[#9b9a97] leading-tight">{comment.user_job_title}</span>
        </div>
        <span className="text-[10px] text-[#9b9a97] ml-auto mt-0.5">{formatTime(comment.created_at)}</span>
      </div>

      {/* Comment content */}
      <p className="text-sm text-[#37352f] whitespace-pre-wrap mb-2">{comment.content}</p>

      {/* Suggestion diff */}
      {isSuggestion && comment.suggested_text && (
        <div className="mb-2">
          <SuggestionDiff originalText={comment.selection_text} suggestedText={comment.suggested_text} />
        </div>
      )}

      {/* Status badge */}
      {isResolved && (
        <div className="flex items-center gap-1 mb-2">
          <CheckCircle2 size={11} className="text-[#0f7b6c]" />
          <span className="text-[10px] text-[#0f7b6c] font-medium capitalize">{comment.status}</span>
        </div>
      )}

      {/* Actions */}
      {!isResolved && (
        <div className="flex items-center gap-1.5 pt-1.5 border-t border-[#e9e8e4]">
          {isSuggestion ? (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onResolve(comment.id, 'accept'); }}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#0f7b6c] hover:bg-[rgba(15,123,108,0.08)] rounded-[3px]"
              >
                <Check size={14} /> Accept
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onResolve(comment.id, 'reject'); }}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#e03e3e] hover:bg-[rgba(224,62,62,0.08)] rounded-[3px]"
              >
                <X size={14} /> Reject
              </button>
            </>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onResolve(comment.id, 'resolve'); }}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#787774] hover:bg-[rgba(55,53,47,0.08)] rounded-[3px]"
            >
              <Check size={14} /> Resolve
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setShowReply(!showReply); }}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#787774] hover:bg-[rgba(55,53,47,0.08)] rounded-[3px]"
          >
            <Reply size={14} /> Reply
          </button>
          {currentUser && comment.user_id === currentUser.id && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(comment.id); }}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#9b9a97] hover:text-[#e03e3e] hover:bg-[rgba(224,62,62,0.08)] rounded-[3px] ml-auto"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )}

      {/* Replies */}
      {comment.replies?.length > 0 && (
        <div className="mt-2 pt-2 border-t border-[#e9e8e4] space-y-2">
          {comment.replies.map(reply => (
            <div key={reply.id} className="flex items-start gap-2 pl-2">
              <div className={`w-4 h-4 rounded-full ${getAvatarColor(reply.user_name)} flex items-center justify-center text-white text-[8px] font-semibold shrink-0 mt-0.5`}>
                {reply.user_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-medium text-[#37352f]">{reply.user_name}</span>
                  <span className="text-[9px] text-[#9b9a97]">{formatTime(reply.created_at)}</span>
                  {currentUser && reply.user_id === currentUser.id && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(reply.id); }}
                      className="text-[#9b9a97] hover:text-[#e03e3e] ml-auto"
                    >
                      <Trash2 size={9} />
                    </button>
                  )}
                </div>
                <p className="text-xs text-[#787774] whitespace-pre-wrap">{reply.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reply form */}
      {showReply && (
        <div className="mt-2 pt-2 border-t border-[#e9e8e4]" onClick={e => e.stopPropagation()}>
          <CommentInput
            mode="reply"
            onSubmit={handleReplySubmit}
            onCancel={() => setShowReply(false)}
            placeholder="Write a reply..."
          />
        </div>
      )}
    </div>
  );
}
