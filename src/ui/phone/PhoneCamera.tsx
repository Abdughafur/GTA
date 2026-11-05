import React, { useState } from 'react';
import { Camera, RefreshCw, Sparkles, Circle } from 'lucide-react';
import { audioManager } from '../../core/AudioManager';
import { useGameStore } from '../../core/gameState';

export const PhoneCamera: React.FC = () => {
  const [filter, setFilter] = useState<'normal' | 'noir' | 'cyber' | 'golden'>('normal');
  const [snapFlash, setSnapFlash] = useState(false);
  const showNotification = useGameStore((s) => s.showNotification);

  const takePhoto = () => {
    audioManager.playCameraShutter();
    setSnapFlash(true);
    setTimeout(() => setSnapFlash(false), 200);
    showNotification('Photo captured and saved to AbduGallery!');
  };

  return (
    <div className="flex flex-col h-full bg-black text-white select-none relative overflow-hidden">
      {/* Top Controls */}
      <div className="px-4 py-2.5 bg-black/60 backdrop-blur-xs flex items-center justify-between text-xs z-10">
        <span className="font-mono text-slate-300">1x Wide (24mm)</span>
        <div className="flex items-center gap-2">
          {(['normal', 'noir', 'cyber', 'golden'] as const).map((f) => (
            <button
              key={f}
              onClick={() => {
                setFilter(f);
                audioManager.playPhoneBeep();
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize transition ${
                filter === f ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Viewfinder Window with rule of thirds grid */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {/* Flash overlay */}
        {snapFlash && <div className="absolute inset-0 bg-white z-30 animate-ping" />}

        {/* Filter Tint */}
        {filter === 'noir' && <div className="absolute inset-0 bg-slate-500/20 mix-blend-color pointer-events-none" />}
        {filter === 'cyber' && <div className="absolute inset-0 bg-fuchsia-500/15 mix-blend-color-dodge pointer-events-none" />}
        {filter === 'golden' && <div className="absolute inset-0 bg-amber-500/20 mix-blend-color pointer-events-none" />}

        {/* Viewfinder Grid */}
        <div className="absolute inset-4 border border-white/20 grid grid-cols-3 grid-rows-3 pointer-events-none">
          <div className="border-r border-b border-white/20" />
          <div className="border-r border-b border-white/20" />
          <div className="border-b border-white/20" />
          <div className="border-r border-b border-white/20" />
          <div className="border-r border-b border-white/20" />
          <div className="border-b border-white/20" />
          <div className="border-r border-white/20" />
          <div className="border-r border-white/20" />
          <div />
        </div>

        {/* Target Reticle */}
        <div className="w-12 h-12 border-2 border-amber-400/80 rounded-lg flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
        </div>
      </div>

      {/* Bottom Shutter Controls */}
      <div className="h-20 bg-black/80 flex items-center justify-center px-6 relative z-10">
        <button
          onClick={takePhoto}
          className="w-14 h-14 rounded-full border-4 border-white flex items-center justify-center active:scale-90 transition cursor-pointer"
        >
          <div className="w-11 h-11 bg-white rounded-full hover:bg-slate-200" />
        </button>
      </div>
    </div>
  );
};
