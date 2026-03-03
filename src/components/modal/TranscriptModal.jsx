import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Loader2, X } from 'lucide-react';

export default function TranscriptModal({
  open, onClose, transcript, setTranscript,
  loading, testMode, onGenerate,
}) {
  const backdropRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => textareaRef.current?.focus(), 100);
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    function handleEsc(e) {
      if (e.key === 'Escape' && open) onClose();
    }
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  function handleBackdropClick(e) {
    if (e.target === backdropRef.current) onClose();
  }

  return createPortal(
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <div className="bg-white rounded-2xl shadow-elevated w-full max-w-[640px] mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">New PRD</h2>
            <p className="text-sm text-gray-500">Paste a meeting transcript to generate a PRD</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Meeting Transcript
          </label>
          <textarea
            ref={textareaRef}
            className="w-full h-64 bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-100 resize-none font-mono"
            placeholder={"Paste your Microsoft Teams transcript here...\n\nExample:\n0:00:01 — John Smith\nAlright, let's kick off the sprint planning...\n\n0:01:15 — Jane Doe\nI think we need to prioritize the checkout flow..."}
            value={transcript}
            onChange={e => setTranscript(e.target.value)}
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400">{transcript.length.toLocaleString()} characters</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end">
          <button
            onClick={onGenerate}
            disabled={(!transcript.trim() && !testMode) || loading}
            className="flex items-center gap-2 bg-accent-600 hover:bg-accent-700 disabled:bg-gray-100 disabled:text-gray-400 text-white px-6 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 shadow-soft"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
            Generate PRD
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
