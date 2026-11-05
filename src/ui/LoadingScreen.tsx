import React, { useState, useEffect } from 'react';
import { useGameStore } from '../core/gameState';
import { Play, RotateCcw, Sliders, Info, Volume2, ShieldCheck, Gamepad2 } from 'lucide-react';
import { audioManager } from '../core/AudioManager';

interface LoadingScreenProps {
  onStartGame: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onStartGame }) => {
  const loadingProgress = useGameStore((s) => s.loadingProgress);
  const loadingMessage = useGameStore((s) => s.loadingMessage);
  const setScreen = useGameStore((s) => s.setScreen);
  const weather = useGameStore((s) => s.weather);
  const setWeather = useGameStore((s) => s.setWeather);

  const [activeModal, setActiveModal] = useState<'none' | 'settings' | 'credits'>('none');
  const [tipIndex, setTipIndex] = useState(0);

  const gameTips = [
    'Downtown skyscrapers feature illuminated night facades and rooftop antenna beacons.',
    'Visit the Legendary Motorsport showroom on 2nd Ave or use your smartphone browser to buy exotic supercars.',
    'Drive into Pay \'n\' Spray to repair your vehicle, respray custom neon colors, and wipe police wanted heat.',
    'Press P or Arrow Up at any time to open your in-game smartphone with live GPS navigation, SMS, and Maze Banking.',
    'Handbrake drifting around sharp turns generates tire smoke and charges your cornering momentum.'
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % gameTips.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [gameTips.length]);

  const handleStart = () => {
    audioManager.init();
    audioManager.resumeContext();
    audioManager.playDoorSlam();
    onStartGame();
  };

  const isLoaded = loadingProgress >= 100;

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-between p-6 sm:p-12 select-none overflow-hidden bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent">
      {/* Top Header / Branding */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-ping" />
          <span className="text-xs font-bold uppercase tracking-widest text-slate-300 font-game">
            VICE BAY OPEN WORLD ENGINE
          </span>
        </div>

        <div className="text-[11px] font-mono text-slate-400 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-800">
          THREE.JS PBR · RAPIER DYNAMICS · PROCEDURAL AUDIO
        </div>
      </div>

      {/* Center: Bespoke Stylized GTA Title Lockup */}
      <div className="my-auto max-w-2xl space-y-4">
        <div className="space-y-1">
          <div className="inline-block px-3 py-1 bg-red-600 text-white font-game font-extrabold text-xs tracking-widest uppercase rounded">
            Next-Gen Browser Edition
          </div>
          <h1 className="text-5xl sm:text-7xl font-black font-game tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400 drop-shadow-2xl uppercase">
            BlockGTA
          </h1>
          <div className="text-xl sm:text-2xl font-bold font-game tracking-widest text-red-500 uppercase flex items-center gap-3">
            <span>VICE CITY 3D</span>
            <span className="w-12 h-0.5 bg-red-500 inline-block" />
            <span className="text-slate-400 text-sm font-mono normal-case tracking-normal">v1.4.0 High-Fidelity</span>
          </div>
        </div>

        <p className="text-sm text-slate-300 max-w-lg leading-relaxed">
          Explore a bustling 3D coastal metropolis featuring responsive vehicle physics, interactive city traffic,
          pedestrian crowds, wanted police pursuits, live smartphone GPS, and high-stakes syndicate contracts.
        </p>

        {/* Start / Menu Actions */}
        {isLoaded ? (
          <div className="pt-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleStart}
                className="px-8 py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl font-game font-black text-lg tracking-wider uppercase shadow-2xl shadow-red-600/40 transition active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>Enter Vice Bay</span>
              </button>

              <button
                onClick={() => setActiveModal('settings')}
                className="px-5 py-3.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl font-game font-bold text-sm tracking-wider uppercase transition active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <Sliders className="w-4 h-4 text-slate-400" />
                <span>Settings</span>
              </button>

              <button
                onClick={() => setActiveModal('credits')}
                className="px-5 py-3.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl font-game font-bold text-sm tracking-wider uppercase transition active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <Info className="w-4 h-4 text-slate-400" />
                <span>Controls & Info</span>
              </button>
            </div>

            <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-slate-500" />
              <span>WASD Move/Drive · Space Jump/Drift · E Enter Car · P Smartphone · Esc Pause</span>
            </div>
          </div>
        ) : (
          /* Loading Bar & Rotating Status */
          <div className="pt-4 space-y-3 max-w-md">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300 font-medium">{loadingMessage}</span>
              <span className="text-amber-400 font-bold">{loadingProgress}%</span>
            </div>

            <div className="h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-red-500 to-rose-500 rounded-full transition-all duration-300"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>

            <div className="text-[11px] text-slate-400 italic">
              " {gameTips[tipIndex]} "
            </div>
          </div>
        )}
      </div>

      {/* Bottom Footer */}
      <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-900 pt-3">
        <span>© 2026 BlockGTA · Built with Three.js & TypeScript</span>
        <span>Press [P] in-game for Smartphone</span>
      </div>

      {/* Settings Modal */}
      {activeModal === 'settings' && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-game font-bold text-lg text-white">GAME SETTINGS</h3>
              <button
                onClick={() => setActiveModal('none')}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Time of Day & Atmosphere</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setWeather('sunny')}
                    className={`py-2 rounded-lg border text-center font-bold ${
                      weather === 'sunny' ? 'bg-amber-600 border-amber-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    Sunny Noon
                  </button>
                  <button
                    onClick={() => setWeather('sunset')}
                    className={`py-2 rounded-lg border text-center font-bold ${
                      weather === 'sunset' ? 'bg-orange-600 border-orange-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    Sunset Gold
                  </button>
                  <button
                    onClick={() => setWeather('night')}
                    className={`py-2 rounded-lg border text-center font-bold ${
                      weather === 'night' ? 'bg-sky-600 border-sky-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    Neon Night
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => setActiveModal('none')}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold"
            >
              Close & Apply
            </button>
          </div>
        </div>
      )}

      {/* Credits & Controls Modal */}
      {activeModal === 'credits' && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-game font-bold text-lg text-white">CONTROLS & GAMEPLAY GUIDE</h3>
              <button
                onClick={() => setActiveModal('none')}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed max-h-80 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px]">
                <div><span className="text-amber-400 font-bold">W / A / S / D</span> : Movement & Steering</div>
                <div><span className="text-amber-400 font-bold">Shift</span> : Sprint (on foot)</div>
                <div><span className="text-amber-400 font-bold">Space</span> : Jump / Handbrake Drift</div>
                <div><span className="text-amber-400 font-bold">E</span> : Enter / Exit Vehicle</div>
                <div><span className="text-amber-400 font-bold">P or ↑</span> : In-game Smartphone</div>
                <div><span className="text-amber-400 font-bold">F</span> : Contextual Interaction</div>
                <div><span className="text-amber-400 font-bold">R</span> : Cycle Radio Stations</div>
                <div><span className="text-amber-400 font-bold">Mouse Drag</span> : Camera Orbit</div>
              </div>

              <div className="space-y-1">
                <div className="font-bold text-slate-100">Key Locations:</div>
                <div>· <span className="text-sky-400 font-semibold">Downtown Plaza (X: -10, Z: -40)</span>: Starting hub & Safehouse.</div>
                <div>· <span className="text-red-400 font-semibold">Legendary Motorsport (X: 90, Z: -68)</span>: Buy and spawn supercars.</div>
                <div>· <span className="text-blue-400 font-semibold">Pay 'n' Spray Garage (X: 90, Z: 28)</span>: Repair, respray, and clear wanted heat.</div>
                <div>· <span className="text-yellow-400 font-semibold">Cluckin' Bell (X: -10, Z: 125)</span>: Fast food to restore health.</div>
              </div>
            </div>

            <button
              onClick={() => setActiveModal('none')}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
