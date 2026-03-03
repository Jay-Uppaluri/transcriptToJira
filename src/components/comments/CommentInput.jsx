import React, { useState, useRef, useEffect } from 'react';
import { Send, X } from 'lucide-react';

export default function CommentInput({
  mode = 'comment', // 'comment' | 'suggestion' | 'reply' | 'general'
  selectionText,
  onSubmit,
  onCancel,
  placeholder,
  autoFocus = true,
}) {
  const [content, setContent] = useState('');
  const [suggestedText, setSuggestedText] = useState(selectionText || '');
  const inputRef = useRef(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!content.trim() && mode !== 'suggestion') return;
    if (mode === 'suggestion' && !suggestedText.trim()) return;
    onSubmit(content.trim(), mode === 'suggestion' ? suggestedText.trim() : null);
    setContent('');
    setSuggestedText('');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {/* Selection preview */}
      {selectionText && mode !== 'reply' && mode !== 'general' && (
        <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
          <span className="font-medium text-gray-600">Selected: </span>
          <span className="italic">"{selectionText.length > 80 ? selectionText.slice(0, 80) + '...' : selectionText}"</span>
        </div>
      )}

      {/* Suggestion replacement text */}
      {mode === 'suggestion' && (
        <div>
          <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">
            Replace with
          </label>
          <textarea
            value={suggestedText}
            onChange={e => setSuggestedText(e.target.value)}
            className="w-full bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 resize-none"
            rows={2}
          />
        </div>
      )}

      {/* Comment text */}
      <div className="flex gap-2">
        <textarea
          ref={inputRef}
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder={placeholder || (mode === 'suggestion' ? 'Add a note (optional)...' : 'Write a comment...')}
          className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-100 resize-none"
          rows={2}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e);
            if (e.key === 'Escape') onCancel?.();
          }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-400">{navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Enter to submit</span>
        <div className="flex gap-1.5">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex items-center gap-1 px-2.5 py-1 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg transition-colors"
            >
              <X size={11} /> Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={mode === 'suggestion' ? !suggestedText.trim() : !content.trim()}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-white bg-accent-600 hover:bg-accent-700 disabled:opacity-50 rounded-lg transition-colors"
          >
            <Send size={11} />
            {mode === 'suggestion' ? 'Suggest' : 'Comment'}
          </button>
        </div>
      </div>
    </form>
  );
}
