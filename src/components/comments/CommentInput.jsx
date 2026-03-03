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
        <div className="text-xs text-[#787774] bg-[rgba(55,53,47,0.04)] rounded-[3px] px-3 py-2 border border-[#e9e8e4]">
          <span className="font-medium text-[#37352f]">Selected: </span>
          <span className="italic">"{selectionText.length > 80 ? selectionText.slice(0, 80) + '...' : selectionText}"</span>
        </div>
      )}

      {/* Suggestion replacement text */}
      {mode === 'suggestion' && (
        <div>
          <label className="block text-[10px] font-medium text-[#787774] uppercase tracking-wider mb-1">
            Replace with
          </label>
          <textarea
            value={suggestedText}
            onChange={e => setSuggestedText(e.target.value)}
            className="w-full bg-[rgba(15,123,108,0.06)] border border-[rgba(15,123,108,0.3)] rounded-[3px] px-3 py-2 text-sm text-[#37352f] focus:outline-none focus:border-[#0f7b6c] focus:ring-1 focus:ring-[#0f7b6c] resize-none"
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
          className="flex-1 bg-white border border-[#e9e8e4] rounded-[3px] px-3 py-2 text-sm text-[#37352f] focus:outline-none focus:border-[#2383e2] focus:ring-1 focus:ring-[#2383e2] resize-none"
          rows={2}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e);
            if (e.key === 'Escape') onCancel?.();
          }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#9b9a97]">{navigator.platform.includes('Mac') ? '\u2318' : 'Ctrl'}+Enter to submit</span>
        <div className="flex gap-1.5">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex items-center gap-1 px-2.5 py-1 text-xs text-[#787774] hover:bg-[rgba(55,53,47,0.08)] rounded-[3px]"
            >
              <X size={11} /> Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={mode === 'suggestion' ? !suggestedText.trim() : !content.trim()}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-white bg-[#2383e2] hover:bg-[#1b6abf] disabled:opacity-50 rounded-[3px]"
          >
            <Send size={11} />
            {mode === 'suggestion' ? 'Suggest' : 'Comment'}
          </button>
        </div>
      </div>
    </form>
  );
}
