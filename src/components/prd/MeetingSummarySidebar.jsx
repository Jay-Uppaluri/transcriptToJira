import React, { useState } from 'react';
import { Users, Sparkles, Target, MessageCircle, X } from 'lucide-react';

const MOCK_ATTENDEES = [
  { name: 'Sarah Chen', role: 'Product Manager', color: 'bg-blue-500' },
  { name: 'Mike Rodriguez', role: 'Engineering Lead', color: 'bg-emerald-500' },
  { name: 'Lisa Park', role: 'UX Designer', color: 'bg-violet-500' },
  { name: 'James Wright', role: 'Backend Engineer', color: 'bg-amber-500' },
  { name: 'Priya Sharma', role: 'QA Lead', color: 'bg-rose-500' },
  { name: 'Tom Baker', role: 'Data Analyst', color: 'bg-cyan-500' },
  { name: 'Nina Volkov', role: 'DevOps Engineer', color: 'bg-orange-500' },
  { name: 'Alex Kim', role: 'Frontend Engineer', color: 'bg-indigo-500' },
];

const MOCK_SUMMARY = {
  summary:
    'The team reviewed the current product roadmap and discussed the upcoming feature release for Q2. Key topics included user authentication improvements, dashboard redesign priorities, and the integration timeline with third-party analytics providers. The team aligned on a phased rollout approach with beta testing starting in week 3.',
  perspectives: [
    {
      name: 'Sarah Chen',
      role: 'Product Manager',
      color: 'bg-blue-500',
      perspective:
        'Emphasized the need to prioritize features based on customer feedback data. Advocated for shipping the auth improvements first as it impacts 40% of support tickets.',
    },
    {
      name: 'Mike Rodriguez',
      role: 'Engineering Lead',
      color: 'bg-emerald-500',
      perspective:
        'Raised concerns about the timeline for the analytics integration, suggesting we need an additional sprint for proper API design. Recommended starting with a read-only integration.',
    },
    {
      name: 'Lisa Park',
      role: 'UX Designer',
      color: 'bg-violet-500',
      perspective:
        'Presented updated wireframes for the dashboard redesign. Highlighted usability testing results showing users struggle with the current navigation pattern.',
    },
    {
      name: 'Priya Sharma',
      role: 'QA Lead',
      color: 'bg-rose-500',
      perspective:
        'Stressed the importance of automated regression tests before the rollout. Proposed a testing matrix covering all auth flows across supported browsers.',
    },
  ],
  direction:
    'The team agreed to structure the PRD around three core workstreams: (1) Authentication overhaul with SSO support, (2) Dashboard v2 with the new navigation model, and (3) Analytics integration as a phased rollout. Each workstream will have clear acceptance criteria, success metrics, and a dependency map. The PRD will follow a modular format allowing independent review of each section by respective stakeholders.',
};

const MAX_VISIBLE_AVATARS = 5;

function getInitials(name) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

function AttendeeList({ attendees }) {
  const [showAll, setShowAll] = useState(false);
  const visible = attendees.slice(0, MAX_VISIBLE_AVATARS);
  const remaining = attendees.length - MAX_VISIBLE_AVATARS;
  const displayed = showAll ? attendees : visible;

  return (
    <div className="space-y-2">
      {/* Avatar stack row */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center -space-x-2">
          {displayed.map((a, i) => (
            <div
              key={a.name}
              className={`${a.color} w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold ring-2 ring-white`}
              style={{ zIndex: displayed.length - i }}
              title={`${a.name} — ${a.role}`}
            >
              {getInitials(a.name)}
            </div>
          ))}
        </div>
        {!showAll && remaining > 0 && (
          <button
            onClick={() => setShowAll(true)}
            className="text-[11px] text-accent-600 hover:text-accent-700 font-medium"
          >
            +{remaining} more
          </button>
        )}
        {showAll && remaining > 0 && (
          <button
            onClick={() => setShowAll(false)}
            className="text-[11px] text-gray-400 hover:text-gray-600 font-medium"
          >
            Show less
          </button>
        )}
      </div>
      {/* Name list */}
      <div className="flex flex-wrap gap-1">
        {displayed.map((a) => (
          <span
            key={a.name}
            className="inline-flex items-center gap-1 text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${a.color}`} />
            {a.name}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function MeetingSummarySidebar({ onClose }) {
  return (
    <div className="h-full bg-white border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <Users size={14} className="text-gray-500" />
        <span className="text-sm font-medium text-gray-900">Meeting Summary</span>
        <span className="text-[10px] text-gray-400 font-medium">45 min</span>
        <button
          onClick={onClose}
          className="ml-auto p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
          title="Close summary"
        >
          <X size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Attendees */}
        <section>
          <h4 className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2 px-1">
            Attendees ({MOCK_ATTENDEES.length})
          </h4>
          <AttendeeList attendees={MOCK_ATTENDEES} />
        </section>

        {/* Summary */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={13} className="text-amber-500" />
            <h4 className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
              Summary
            </h4>
          </div>
          <p className="text-[13px] text-gray-600 leading-relaxed">{MOCK_SUMMARY.summary}</p>
        </section>

        {/* Stakeholder Perspectives */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle size={13} className="text-blue-500" />
            <h4 className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
              Stakeholder Perspectives
            </h4>
          </div>
          <div className="space-y-3">
            {MOCK_SUMMARY.perspectives.map((p) => (
              <div key={p.name} className="flex gap-2.5">
                <div
                  className={`${p.color} w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-semibold shrink-0 mt-0.5`}
                >
                  {getInitials(p.name)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="text-[13px] font-medium text-gray-800">{p.name}</span>
                    <span className="text-[10px] text-gray-400">{p.role}</span>
                  </div>
                  <p className="text-[13px] text-gray-600 leading-relaxed mt-0.5">{p.perspective}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Direction */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <Target size={13} className="text-emerald-500" />
            <h4 className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
              PRD Direction
            </h4>
          </div>
          <p className="text-[13px] text-gray-600 leading-relaxed">{MOCK_SUMMARY.direction}</p>
        </section>
      </div>
    </div>
  );
}
