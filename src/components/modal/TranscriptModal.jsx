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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,15,15,0.6)]"
    >
      <div className="bg-white rounded-[6px] shadow-notion-popup w-full max-w-[640px] mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e9e8e4]">
          <div>
            <h2 className="text-lg font-medium text-[#37352f]">New PRD</h2>
            <p className="text-sm text-[#787774]">Paste a meeting transcript to generate a PRD</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#9b9a97] hover:bg-[rgba(55,53,47,0.08)] rounded-[3px]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <label className="block text-sm font-medium text-[#37352f] mb-2">
            Meeting Transcript
          </label>
          <textarea
            ref={textareaRef}
            className="w-full h-64 bg-white border border-[#e9e8e4] rounded-[3px] p-4 text-sm text-[#37352f] placeholder-[#9b9a97] focus:outline-none focus:border-[#2383e2] focus:ring-1 focus:ring-[#2383e2] resize-none"
            placeholder={"Paste your Microsoft Teams transcript here...\n\nExample:\n0:00:01 — John Smith\nAlright, let's kick off the sprint planning...\n\n0:01:15 — Jane Doe\nI think we need to prioritize the checkout flow..."}
            value={transcript}
            onChange={e => setTranscript(e.target.value)}
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-[#9b9a97]">{transcript.length.toLocaleString()} characters</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#e9e8e4] flex items-center justify-end">
          <button
            onClick={onGenerate}
            disabled={(!transcript.trim() && !testMode) || loading}
            className="flex items-center gap-2 bg-[#2383e2] hover:bg-[#1b6abf] disabled:bg-[rgba(55,53,47,0.06)] disabled:text-[#9b9a97] text-white px-6 py-2.5 rounded-[3px] font-medium text-sm"
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
