import { useState, useCallback } from 'react';
import { apiFetch } from '../utils/api.js';
import { createAnchorFromSelection } from '../utils/textAnchor.js';

/**
 * Comment CRUD hook for a PRD.
 * Manages threaded comments state and API interactions.
 */
export default function useComments(prdId, token, markdown) {
  const [comments, setComments] = useState([]);

  const loadComments = useCallback((commentData) => {
    setComments(commentData || []);
  }, []);

  const addComment = useCallback(async ({
    content, selection_text, selection_prefix, selection_suffix,
    selection_start, selection_end, comment_type, suggested_text,
  }) => {
    // If inline comment, create anchor from the selection
    let anchor = {};
    if (selection_text && markdown) {
      anchor = createAnchorFromSelection(selection_text, markdown);
    }

    const body = {
      content,
      comment_type: comment_type || 'general',
      selection_text: selection_text || anchor.text || null,
      selection_prefix: selection_prefix || anchor.prefix || null,
      selection_suffix: selection_suffix || anchor.suffix || null,
      selection_start: selection_start ?? anchor.start ?? null,
      selection_end: selection_end ?? anchor.end ?? null,
      suggested_text: suggested_text || null,
    };

    const comment = await apiFetch(`/prds/${prdId}/comments`, token, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    setComments(prev => [...prev, { ...comment, replies: [] }]);
    return comment;
  }, [prdId, token, markdown]);

  const addReply = useCallback(async (parentCommentId, content) => {
    const comment = await apiFetch(`/prds/${prdId}/comments`, token, {
      method: 'POST',
      body: JSON.stringify({
        content,
        parent_comment_id: parentCommentId,
        comment_type: 'comment',
      }),
    });

    setComments(prev => prev.map(c =>
      c.id === parentCommentId
        ? { ...c, replies: [...(c.replies || []), comment] }
        : c
    ));
    return comment;
  }, [prdId, token]);

  const resolveComment = useCallback(async (commentId, action) => {
    const data = await apiFetch(`/comments/${commentId}/resolve`, token, {
      method: 'PATCH',
      body: JSON.stringify({ action }),
    });

    setComments(prev => prev.map(c =>
      c.id === commentId ? { ...c, ...data.comment } : c
    ));

    return data;
  }, [token]);

  const deleteComment = useCallback(async (commentId) => {
    await apiFetch(`/comments/${commentId}`, token, {
      method: 'DELETE',
    });

    setComments(prev => {
      // Remove if top-level comment
      const filtered = prev.filter(c => c.id !== commentId);
      // Also remove from replies
      return filtered.map(c => ({
        ...c,
        replies: (c.replies || []).filter(r => r.id !== commentId),
      }));
    });
  }, [token]);

  return {
    comments,
    loadComments,
    addComment,
    addReply,
    resolveComment,
    deleteComment,
  };
}
