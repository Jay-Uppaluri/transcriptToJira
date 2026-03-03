import React from 'react';
import { MessageSquare, PenLine } from 'lucide-react';

export default function SelectionPopover({ position, onComment, onSuggest }) {
  if (!position) return null;

  return (
    <div
      className="fixed z-40 flex items-center gap-0.5 bg-gray-900 text-white rounded-lg shadow-lg px-1 py-0.5 select-none no-transition"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateX(-50%)',
      }}
    >
      <button
        onMouseDown={(e) => { e.preventDefault(); onComment(); }}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium hover:bg-gray-700 rounded-md transition-colors"
      >
        <MessageSquare size={12} />
        Comment
      </button>
      <div className="w-px h-4 bg-gray-700" />
      <button
        onMouseDown={(e) => { e.preventDefault(); onSuggest(); }}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium hover:bg-gray-700 rounded-md transition-colors"
      >
        <PenLine size={12} />
        Suggest Edit
      </button>
    </div>
  );
}
