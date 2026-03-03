import React from 'react';

export default function SuggestionDiff({ originalText, suggestedText }) {
  if (!originalText && !suggestedText) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-sm font-mono leading-relaxed">
      {originalText && (
        <span className="bg-red-100 text-red-800 line-through decoration-red-400 px-0.5 rounded-sm">
          {originalText}
        </span>
      )}
      {originalText && suggestedText && ' '}
      {suggestedText && (
        <span className="bg-green-100 text-green-800 px-0.5 rounded-sm">
          {suggestedText}
        </span>
      )}
    </div>
  );
}
