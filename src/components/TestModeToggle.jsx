import React from 'react';
import { FlaskConical } from 'lucide-react';

export default function TestModeToggle({ testMode, onToggle }) {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl shadow-lg border transition-all duration-200 ${
        testMode
          ? 'bg-amber-50 border-amber-300 shadow-amber-100'
          : 'bg-white border-gray-200'
      }`}>
        <FlaskConical size={16} className={testMode ? 'text-amber-600' : 'text-gray-400'} />
        <span className={`text-xs font-semibold tracking-wide ${testMode ? 'text-amber-700' : 'text-gray-500'}`}>
          TEST MODE
        </span>
        <button
          role="switch"
          aria-checked={testMode}
          onClick={onToggle}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            testMode
              ? 'bg-amber-500 focus:ring-amber-400'
              : 'bg-gray-300 focus:ring-gray-400'
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transform transition-transform duration-200 ${
              testMode ? 'translate-x-4.5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>
    </div>
  );
}
