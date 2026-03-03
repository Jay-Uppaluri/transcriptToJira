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

const JOB_TITLE_COLORS = {
  Product: 'bg-purple-50 text-purple-600',
  Engineering: 'bg-blue-50 text-blue-600',
  'UX Designer': 'bg-pink-50 text-pink-600',
  QA: 'bg-orange-50 text-orange-600',
  Admin: 'bg-red-50 text-red-600',
};

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
      className={`rounded-xl border p-3 transition-all cursor-pointer ${
        isActive
          ? 'border-accent-300 bg-accent-50/30 shadow-sm'
          : 'border-gray-200 bg-white hover:border-gray-300'
      } ${isResolved ? 'opacity-60' : ''}`}
    >
      {/* Selection quote */}
      {comment.selection_text && (
        <div className="mb-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-2.5 py-1.5 border-l-2 border-gray-300 italic">
          "{comment.selection_text.length > 100 ? comment.selection_text.slice(0, 100) + '...' : comment.selection_text}"
        </div>
      )}

      {/* Author line */}
      <div className="flex items-start gap-2 mb-1.5">
        <div className={`w-5 h-5 rounded-full ${getAvatarColor(comment.user_name)} flex items-center justify-center text-white text-[9px] font-semibold shrink-0 mt-0.5`}>
          {comment.user_name.charAt(0).toUpperCase()}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-medium text-gray-900 leading-tight">{comment.user_name}</span>
          <span className="text-[10px] text-gray-400 leading-tight">{comment.user_job_title}</span>
        </div>
        <span className="text-[10px] text-gray-400 ml-auto mt-0.5">{formatTime(comment.created_at)}</span>
      </div>

      {/* Comment content */}
      <p className="text-sm text-gray-700 whitespace-pre-wrap mb-2">{comment.content}</p>

      {/* Suggestion diff */}
      {isSuggestion && comment.suggested_text && (
        <div className="mb-2">
          <SuggestionDiff originalText={comment.selection_text} suggestedText={comment.suggested_text} />
        </div>
      )}

      {/* Status badge */}
      {isResolved && (
        <div className="flex items-center gap-1 mb-2">
          <CheckCircle2 size={11} className="text-green-500" />
          <span className="text-[10px] text-green-600 font-medium capitalize">{comment.status}</span>
        </div>
      )}

      {/* Actions */}
      {!isResolved && (
        <div className="flex items-center gap-1.5 pt-1.5 border-t border-gray-100">
          {isSuggestion ? (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onResolve(comment.id, 'accept'); }}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-green-600 border border-green-200 hover:bg-green-50 rounded-md transition-colors"
              >
                <Check size={14} /> Accept
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onResolve(comment.id, 'reject'); }}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-500 border border-red-200 hover:bg-red-50 rounded-md transition-colors"
              >
                <X size={14} /> Reject
              </button>
            </>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onResolve(comment.id, 'resolve'); }}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 rounded-md transition-colors"
            >
              <Check size={14} /> Resolve
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setShowReply(!showReply); }}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 rounded-md transition-colors"
          >
            <Reply size={14} /> Reply
          </button>
          {currentUser && comment.user_id === currentUser.id && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(comment.id); }}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-400 border border-gray-200 hover:text-red-500 hover:border-red-200 hover:bg-red-50 rounded-md transition-colors ml-auto"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )}

      {/* Replies */}
      {comment.replies?.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-100 space-y-2">
          {comment.replies.map(reply => (
            <div key={reply.id} className="flex items-start gap-2 pl-2">
              <div className={`w-4 h-4 rounded-full ${getAvatarColor(reply.user_name)} flex items-center justify-center text-white text-[8px] font-semibold shrink-0 mt-0.5`}>
                {reply.user_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-medium text-gray-800">{reply.user_name}</span>
                  <span className="text-[9px] text-gray-400">{formatTime(reply.created_at)}</span>
                  {currentUser && reply.user_id === currentUser.id && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(reply.id); }}
                      className="text-gray-300 hover:text-red-500 transition-all ml-auto"
                    >
                      <Trash2 size={9} />
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-600 whitespace-pre-wrap">{reply.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reply form */}
      {showReply && (
        <div className="mt-2 pt-2 border-t border-gray-100" onClick={e => e.stopPropagation()}>
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
