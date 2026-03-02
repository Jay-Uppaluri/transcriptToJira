import React, { useState } from 'react';
import { Keyboard, Volume2, Zap, Star, ChevronDown, ChevronUp, Monitor, Cpu } from 'lucide-react';

const switches = [
  { name: 'Cherry MX Red', type: 'Linear', force: '45g', color: 'bg-red-500', desc: 'Smooth and light — the go-to for gaming. No bump, no click, just speed.' },
  { name: 'Cherry MX Blue', type: 'Clicky', force: '50g', color: 'bg-blue-500', desc: 'The iconic clicky switch. Satisfying tactile bump with an audible click on every keystroke.' },
  { name: 'Cherry MX Brown', type: 'Tactile', force: '45g', color: 'bg-amber-700', desc: 'A gentle bump without the noise. Great all-rounder for typing and gaming.' },
  { name: 'Gateron Yellow', type: 'Linear', force: '50g', color: 'bg-yellow-400', desc: 'Budget-friendly linear with a slightly heavier spring. Buttery smooth when lubed.' },
  { name: 'Holy Panda', type: 'Tactile', force: '67g', color: 'bg-purple-500', desc: 'The legendary tactile switch. Massive rounded bump with a satisfying thock.' },
  { name: 'Kailh Box Jade', type: 'Clicky', force: '50g', color: 'bg-emerald-500', desc: 'Thick click bar mechanism produces a sharp, crisp click. Loud and proud.' },
];

const layouts = [
  { name: 'Full Size (100%)', keys: '104', icon: '⌨️', desc: 'Everything including the numpad. Classic office layout.' },
  { name: 'Tenkeyless (TKL / 80%)', keys: '87', icon: '🔲', desc: 'Drops the numpad for more mouse space. Most popular enthusiast size.' },
  { name: '75%', keys: '~84', icon: '📐', desc: 'Compact with function row. All the keys you need, tightly packed.' },
  { name: '65%', keys: '~68', icon: '🧩', desc: 'No function row, keeps arrow keys and a few nav keys.' },
  { name: '60%', keys: '~61', icon: '🎯', desc: 'Minimal. No arrows, no function row. Everything on layers.' },
  { name: '40%', keys: '~47', icon: '🔬', desc: 'For the brave. Almost everything is on layers. Pure efficiency.' },
];

function SwitchCard({ sw }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 hover:border-gray-500 transition-all">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-3">
          <div className={`w-4 h-4 rounded-full ${sw.color}`} />
          <div>
            <h3 className="font-semibold text-white">{sw.name}</h3>
            <p className="text-sm text-gray-400">{sw.type} · {sw.force}</p>
          </div>
        </div>
        {open ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
      </div>
      {open && <p className="mt-3 text-sm text-gray-300 leading-relaxed">{sw.desc}</p>}
    </div>
  );
}

function LayoutCard({ layout }) {
  return (
    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 hover:border-gray-500 transition-all">
      <div className="text-3xl mb-2">{layout.icon}</div>
      <h3 className="font-semibold text-white">{layout.name}</h3>
      <p className="text-xs text-indigo-400 mb-2">{layout.keys} keys</p>
      <p className="text-sm text-gray-400">{layout.desc}</p>
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-gray-900 to-purple-900/30" />
        <div className="relative max-w-5xl mx-auto px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 rounded-full px-4 py-1.5 mb-6">
            <Keyboard size={16} className="text-indigo-400" />
            <span className="text-sm text-indigo-300 font-medium">The Rabbit Hole Starts Here</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-white via-indigo-200 to-purple-300 bg-clip-text text-transparent">
            Mechanical Keyboards
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            More than just typing tools — they're instruments of expression, precision, and deeply satisfying <em>thock</em>.
          </p>
        </div>
      </header>

      {/* Why Mechanical */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold mb-8 text-center">Why Go Mechanical?</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: <Zap size={28} />, title: 'Responsiveness', text: 'Individual switches under each key mean precise actuation. Every keypress registers exactly when you want it to.' },
            { icon: <Volume2 size={28} />, title: 'Sound & Feel', text: 'From silent linears to loud clickies, you choose your sound profile. The tactile feedback is addictive.' },
            { icon: <Star size={28} />, title: 'Customization', text: 'Swap keycaps, lube switches, add foam — mechanical keyboards are endlessly moddable and uniquely yours.' },
          ].map((item, i) => (
            <div key={i} className="bg-gray-800/60 rounded-xl p-6 border border-gray-700/50">
              <div className="text-indigo-400 mb-3">{item.icon}</div>
              <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Switches */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <Cpu size={24} className="text-indigo-400" />
          <h2 className="text-3xl font-bold">Popular Switches</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {switches.map((sw) => <SwitchCard key={sw.name} sw={sw} />)}
        </div>
      </section>

      {/* Layouts */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <Monitor size={24} className="text-indigo-400" />
          <h2 className="text-3xl font-bold">Keyboard Layouts</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {layouts.map((l) => <LayoutCard key={l.name} layout={l} />)}
        </div>
      </section>

      {/* Glossary */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold mb-8 text-center">Quick Glossary</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            ['Thock', 'The deep, satisfying sound of a well-built keyboard.'],
            ['Clack', 'A higher-pitched, sharper keystroke sound.'],
            ['Lubing', 'Applying lubricant to switches for a smoother feel and quieter sound.'],
            ['Hot-swap', 'Sockets that let you change switches without soldering.'],
            ['PBT Keycaps', 'Durable plastic keycaps that resist shine and feel textured.'],
            ['Gasket Mount', 'A mounting style using gaskets for a softer, bouncier typing feel.'],
          ].map(([term, def], i) => (
            <div key={i} className="bg-gray-800/40 rounded-lg p-4 border border-gray-700/40">
              <span className="font-semibold text-indigo-300">{term}</span>
              <span className="text-gray-400"> — {def}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-12">
        <div className="max-w-5xl mx-auto px-6 py-8 text-center text-sm text-gray-500">
          Built with ⌨️ and love · {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
