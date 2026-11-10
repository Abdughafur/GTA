import React, { useState, useEffect } from 'react';
import { useGameStore } from '../core/gameState';
import { ArrowRight, Gamepad2, Info, Play, Sliders } from 'lucide-react';
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
  const touchMode = useGameStore((s) => s.touchMode);
  const setTouchMode = useGameStore((s) => s.setTouchMode);

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
    <div className="fixed inset-0 z-40 flex select-none flex-col overflow-y-auto bg-[linear-gradient(90deg,rgba(4,7,11,0.94)_0%,rgba(4,7,11,0.78)_36%,rgba(4,7,11,0.18)_76%,rgba(4,7,11,0.08)_100%),linear-gradient(0deg,rgba(4,7,11,0.82)_0%,transparent_32%)] px-6 py-7 sm:px-12 sm:py-10 lg:px-20 lg:py-12">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="h-7 w-px bg-rose-500" />
          <div>
            <div className="font-game text-[11px] font-bold uppercase tracking-[0.3em] text-white">BlockGTA</div>
            <div className="mt-0.5 text-[9px] uppercase tracking-[0.24em] text-white/50">Vice Bay</div>
          </div>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 items-center py-6 sm:py-4">
        <div className="w-full max-w-xl">
          <div className="mb-4 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/60">
            <span className="h-px w-8 bg-rose-500" />
            Welcome to Vice Bay
          </div>
          <h1 className="font-game text-6xl font-black uppercase leading-[0.9] tracking-[-0.07em] text-white drop-shadow-2xl sm:text-8xl lg:text-9xl">
            BlockGTA
          </h1>
          <div className="mt-5 text-xs font-medium uppercase tracking-[0.3em] text-rose-300 sm:text-sm">
            The city is yours
          </div>

          <p className="mt-6 max-w-md text-sm leading-7 text-slate-200/75 sm:text-base">
            A coastal city with its own rhythm. Find your way through the streets, take the wheel, and make a name for yourself.
          </p>

          {isLoaded ? (
            <div className="mt-9 flex max-w-md flex-col items-start gap-5">
              <button
                onClick={handleStart}
                className="group flex min-h-14 w-full items-center justify-between border border-white bg-white px-5 py-4 text-left font-game text-sm font-bold uppercase tracking-[0.16em] text-slate-950 transition hover:border-rose-300 hover:bg-rose-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:w-80"
              >
                <span className="flex items-center gap-3">
                  <Play className="h-4 w-4 fill-current" />
                  Enter Vice Bay
                </span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>

              <nav className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
                <button
                  onClick={() => setActiveModal('settings')}
                  className="flex items-center gap-2 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                >
                  <Sliders className="h-3.5 w-3.5" />
                  Settings
                </button>
                <span className="h-3 w-px bg-white/25" />
                <button
                  onClick={() => setActiveModal('credits')}
                  className="flex items-center gap-2 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                >
                  <Info className="h-3.5 w-3.5" />
                  Controls & Info
                </button>
              </nav>

              <div className="flex max-w-lg items-start gap-2 text-[10px] leading-5 text-white/45 sm:text-[11px]">
                <Gamepad2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>WASD Move / Drive&nbsp; · &nbsp;Space Jump / Drift&nbsp; · &nbsp;E Enter Vehicle&nbsp; · &nbsp;Esc Pause</span>
              </div>
            </div>
          ) : (
            <div className="mt-9 max-w-md space-y-3">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white/75">{loadingMessage}</span>
                <span className="font-mono tabular-nums text-rose-300">{loadingProgress}%</span>
              </div>
              <div className="h-px overflow-hidden bg-white/20">
                <div
                  className="h-full bg-rose-400 transition-all duration-300"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
              <p className="text-[11px] leading-5 text-white/50">{gameTips[tipIndex]}</p>
            </div>
          )}
        </div>
      </main>

      <footer className="flex items-end justify-between border-t border-white/15 pt-4 text-[9px] uppercase tracking-[0.18em] text-white/40">
        <span>Vice Bay</span>
        <span className="text-right">Press P in-game to open your phone</span>
      </footer>

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
              <button
                type="button"
                role="switch"
                aria-checked={touchMode}
                onClick={() => setTouchMode(!touchMode)}
                className="flex min-h-14 w-full items-center justify-between rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-left transition hover:border-sky-400/60"
              >
                <span>
                  <span className="block font-semibold text-slate-100">Touch mode</span>
                  <span className="mt-1 block text-[11px] text-slate-400">
                    On-screen controls and touch camera for phones and touch displays
                  </span>
                </span>
                <span className={`ml-4 rounded-full px-3 py-1 text-[10px] font-bold ${touchMode ? 'bg-sky-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                  {touchMode ? 'ON' : 'OFF'}
                </span>
              </button>

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
