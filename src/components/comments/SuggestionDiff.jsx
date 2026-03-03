import React from 'react';

export default function SuggestionDiff({ originalText, suggestedText }) {
  if (!originalText && !suggestedText) return null;

  return (
    <div className="rounded-[3px] border border-[#e9e8e4] bg-[rgba(55,53,47,0.04)] p-2.5 text-sm font-mono leading-relaxed">
      {originalText && (
        <span className="bg-[rgba(224,62,62,0.15)] text-[#e03e3e] line-through decoration-[#e03e3e] px-0.5 rounded-sm">
          {originalText}
        </span>
      )}
      {originalText && suggestedText && ' '}
      {suggestedText && (
        <span className="bg-[rgba(15,123,108,0.15)] text-[#0f7b6c] px-0.5 rounded-sm">
          {suggestedText}
        </span>
      )}
    </div>
  );
}
