import React from 'react';
import { useGameStore } from '../core/gameState';
import { Play, RotateCcw, Home, Volume2, LogOut } from 'lucide-react';
import { audioManager } from '../core/AudioManager';

interface PauseMenuProps {
  onResume: () => void;
  onRespawn: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({ onResume, onRespawn }) => {
  const setScreen = useGameStore((s) => s.setScreen);
  const isMuted = useGameStore((s) => s.isMuted);
  const setMuted = useGameStore((s) => s.setMuted);

  const handleReturnToTitle = () => {
    audioManager.stopEngine();
    audioManager.stopRadio();
    setScreen('title');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 text-center">
        <div>
          <h2 className="text-2xl font-black font-game text-white tracking-wider uppercase">GAME PAUSED</h2>
          <p className="text-xs text-slate-400">Vice Bay Metropolitan Area</p>
        </div>

        <div className="space-y-2.5">
          <button
            onClick={onResume}
            className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-game font-bold text-sm tracking-wider uppercase transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-red-600/30"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Resume Game</span>
          </button>

          <button
            onClick={() => {
              onRespawn();
              onResume();
            }}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-game font-bold text-xs tracking-wider uppercase transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
            <span>Respawn at Safehouse</span>
          </button>

          <button
            onClick={() => {
              const next = !isMuted;
              setMuted(next);
              audioManager.setMuted(next);
            }}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-game font-bold text-xs tracking-wider uppercase transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Volume2 className="w-4 h-4 text-emerald-400" />
            <span>{isMuted ? 'Unmute Audio' : 'Mute Audio'}</span>
          </button>

          <button
            onClick={handleReturnToTitle}
            className="w-full py-2.5 bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl font-game font-bold text-xs tracking-wider uppercase transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-slate-500" />
            <span>Quit to Main Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
