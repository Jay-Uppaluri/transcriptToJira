import React from 'react';

export default function Header({ onGoHome }) {
  return (
    <header className="border-b border-[#e9e8e4] bg-white">
      <div className="px-6 py-2 flex items-center">
        <div className="flex items-center gap-3 cursor-pointer" onClick={onGoHome}>
          <img src="/icons/cortex-header-logo.png" alt="Cortex" className="w-7 h-7 rounded-[3px]" />
          <h1 className="text-base font-medium text-[#37352f]">Cortex</h1>
        </div>
      </div>
    </header>
  );
}
