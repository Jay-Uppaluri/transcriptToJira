import React, { useState } from 'react';
import { Send, Trash2, Loader2, MessageSquare } from 'lucide-react';

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
  Other: 'bg-gray-100 text-gray-500',
};

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

export default function CommentSection({ prdId, comments, token, currentUser, onCommentAdded, onCommentDeleted }) {
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/prds/${prdId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newComment.trim() }),
      });
      if (res.ok) {
        const comment = await res.json();
        onCommentAdded(comment);
        setNewComment('');
      }
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(commentId) {
    const res = await fetch(`/api/comments/${commentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      onCommentDeleted(commentId);
    }
  }

  return (
    <div className="mt-6 border-t border-gray-200 pt-5">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare size={16} className="text-gray-400" />
        <h3 className="text-sm font-medium text-gray-700">
          Comments {comments.length > 0 && <span className="text-gray-400">({comments.length})</span>}
        </h3>
      </div>

      {comments.length > 0 && (
        <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
          {comments.map(c => (
            <div key={c.id} className="bg-gray-50 rounded-lg p-3 group">
              <div className="flex items-start gap-2.5">
                <div className={`w-6 h-6 rounded-full ${getAvatarColor(c.user_name)} flex items-center justify-center text-white text-[10px] font-semibold shrink-0 mt-0.5`}>
                  {c.user_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-900">{c.user_name}</span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${JOB_TITLE_COLORS[c.user_job_title] || JOB_TITLE_COLORS.Other}`}>
                        {c.user_job_title}
                      </span>
                      <span className="text-[10px] text-gray-400">{formatTime(c.created_at)}</span>
                    </div>
                    {currentUser && c.user_id === currentUser.id && (
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"
                        title="Delete comment"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-100"
        />
        <button
          type="submit"
          disabled={!newComment.trim() || submitting}
          className="flex items-center gap-1 bg-accent-600 hover:bg-accent-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150"
        >
          {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </form>
    </div>
  );
}
