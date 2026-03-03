import React, { useState } from 'react';
import { ChevronRight, Mic, Clock, Users, Calendar, Copy, Check, FileText } from 'lucide-react';

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function Avatar({ name, color, size = 24 }) {
  const fontSize = size <= 20 ? 8 : 10;
  return (
    <span
      className="inline-flex items-center justify-center rounded-full shrink-0 text-white font-medium"
      style={{ backgroundColor: color, width: size, height: size, fontSize }}
    >
      {getInitials(name)}
    </span>
  );
}

function SpeakerBadge({ name, color }) {
  return (
    <span
      className="inline-flex items-center gap-2 text-xs font-medium px-2.5 py-1 rounded-[3px]"
      style={{ backgroundColor: color + '18', color }}
    >
      <Avatar name={name} color={color} size={20} />
      {name}
    </span>
  );
}

const SPEAKER_COLORS = ['#2563eb', '#9333ea', '#059669', '#dc2626', '#d97706', '#0891b2'];

function getSpeakerColor(name, participants) {
  const idx = participants.indexOf(name);
  return SPEAKER_COLORS[idx % SPEAKER_COLORS.length];
}

export default function TranscriptView({ transcript, onBack, onGeneratePRD }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const text = transcript.lines.map(l => `${l.speaker}: ${l.text}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#e9e8e4]">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center gap-3">
          <nav className="flex items-center gap-1.5 text-sm min-w-0">
            <button
              onClick={onBack}
              className="text-[#787774] hover:text-[#37352f] shrink-0"
            >
              Transcripts
            </button>
            <ChevronRight size={14} className="text-[#c4c4c0] shrink-0" />
            <span className="text-[#37352f] font-medium truncate max-w-[300px]">
              {transcript.title}
            </span>
          </nav>

          <div className="flex-1" />

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-sm text-[#787774] hover:text-[#37352f] px-3 py-1.5 rounded-[3px] hover:bg-[rgba(55,53,47,0.08)]"
          >
            {copied ? <Check size={14} className="text-[#0f7b6c]" /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy'}
          </button>

          {onGeneratePRD && (
            <button
              onClick={() => onGeneratePRD(transcript)}
              className="flex items-center gap-2 bg-[#2383e2] hover:bg-[#1b6abf] text-white px-4 py-1.5 rounded-[3px] font-medium text-sm"
            >
              <FileText size={14} />
              Generate PRD
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2.5 rounded-[3px] bg-[rgba(55,53,47,0.06)] text-[#787774] shrink-0">
                <Mic size={20} />
              </div>
              <div>
                <h1 className="text-xl font-medium text-[#37352f]">{transcript.title}</h1>
                <div className="flex items-center gap-4 mt-2 text-sm text-[#787774]">
                  <span className="flex items-center gap-1.5">
                    <Calendar size={14} />
                    {formatDate(transcript.date)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock size={14} />
                    {transcript.duration}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users size={14} />
                    {transcript.participants.length} participants
                  </span>
                </div>
              </div>
            </div>

            {/* Participants */}
            <div className="flex flex-wrap gap-2 mt-4">
              {transcript.participants.map(name => (
                <SpeakerBadge
                  key={name}
                  name={name}
                  color={getSpeakerColor(name, transcript.participants)}
                />
              ))}
            </div>

            {/* Summary */}
            {transcript.summary && (
              <div className="mt-6 p-4 bg-[rgba(55,53,47,0.04)] border border-[#e9e8e4] rounded-[3px]">
                <h3 className="text-xs font-medium text-[#9b9a97] uppercase tracking-wider mb-2">Summary</h3>
                <p className="text-sm text-[#37352f] leading-relaxed">{transcript.summary}</p>
              </div>
            )}
          </div>

          {/* Transcript lines */}
          <div className="space-y-1">
            {transcript.lines.map((line, i) => {
              const color = getSpeakerColor(line.speaker, transcript.participants);
              const prevSpeaker = i > 0 ? transcript.lines[i - 1].speaker : null;
              const isNewSpeaker = line.speaker !== prevSpeaker;

              return (
                <div key={i} className={isNewSpeaker ? 'pt-4 first:pt-0' : ''}>
                  {isNewSpeaker && (
                    <div className="flex items-center gap-2 mb-1">
                      <Avatar name={line.speaker} color={color} size={20} />
                      <span className="text-sm font-semibold" style={{ color }}>
                        {line.speaker}
                      </span>
                      {line.timestamp && (
                        <span className="text-[11px] text-[#9b9a97]">{line.timestamp}</span>
                      )}
                    </div>
                  )}
                  <p className="text-sm text-[#37352f] leading-relaxed pl-0">
                    {!isNewSpeaker && line.timestamp && (
                      <span className="text-[11px] text-[#9b9a97] mr-2">{line.timestamp}</span>
                    )}
                    {line.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
