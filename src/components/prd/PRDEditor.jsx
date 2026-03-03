import React from 'react';

export default function PRDEditor({ value, onChange }) {
  return (
    <textarea
      className="w-full min-h-[calc(100vh-140px)] bg-white border-0 p-0 text-base text-[#37352f] focus:outline-none resize-none font-mono leading-relaxed"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="Write your PRD in markdown..."
    />
  );
}
