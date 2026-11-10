import React, { useEffect, useRef, useState } from 'react';
import { Game } from './core/Game';
import { useGameStore } from './core/gameState';
import { HUD } from './ui/HUD';
import { Smartphone } from './ui/Smartphone';
import { LoadingScreen } from './ui/LoadingScreen';
import { PauseMenu } from './ui/PauseMenu';
import { Supermarket } from './ui/Supermarket';
import * as THREE from 'three';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  const activeTouchControlsRef = useRef(new Set<string>());

  const screen = useGameStore((s) => s.screen);
  const setScreen = useGameStore((s) => s.setScreen);
  const pendingStoryChoice = useGameStore((s) => s.pendingStoryChoice);
  const chooseStoryPath = useGameStore((s) => s.chooseStoryPath);
  const [isPaused, setIsPaused] = useState(false);

  // Initialize Three.js Game Engine once
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const game = new Game(canvasMountRef.current);
    gameRef.current = game;
    game.start();

    // After loading completes, switch screen to title
    setScreen('title');

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        const store = useGameStore.getState();
        if (store.isPhoneOpen) {
          store.closePhone();
        } else if (store.screen === 'playing') {
          setIsPaused((p) => !p);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      game.destroy();
      gameRef.current = null;
    };
  }, [setScreen]);

  // Handle vehicle toggle from UI button
  const handleToggleVehicle = () => {
    if (gameRef.current) {
      gameRef.current.toggleVehicle();
    }
  };

  // Handle touch inputs for mobile
  const handleTouchInput = (key: string, value: number | boolean) => {
    if (!gameRef.current) return;
    const active = value === true || value === 1;
    if (key === 'forward' || key === 'backward' || key === 'left' || key === 'right') {
      if (active) activeTouchControlsRef.current.add(key);
      else activeTouchControlsRef.current.delete(key);
      gameRef.current.touchInput.forward =
        Number(activeTouchControlsRef.current.has('forward')) -
        Number(activeTouchControlsRef.current.has('backward'));
      gameRef.current.touchInput.strafe =
        Number(activeTouchControlsRef.current.has('right')) -
        Number(activeTouchControlsRef.current.has('left'));
      return;
    }
    if (key === 'sprint') gameRef.current.touchInput.sprint = active;
    if (key === 'jump') gameRef.current.touchInput.jump = active;
    if (key === 'handbrake') gameRef.current.touchInput.handbrake = active;
  };

  const clearTouchInputs = () => {
    activeTouchControlsRef.current.clear();
    if (!gameRef.current) return;
    gameRef.current.touchInput.forward = 0;
    gameRef.current.touchInput.strafe = 0;
    gameRef.current.touchInput.sprint = false;
    gameRef.current.touchInput.jump = false;
    gameRef.current.touchInput.handbrake = false;
  };

  useEffect(() => {
    if (screen !== 'playing' || isPaused) clearTouchInputs();
  }, [screen, isPaused]);

  // Start game from title screen
  const handleStartGame = () => {
    setScreen('playing');
    setIsPaused(false);
  };

  // Accept mission from Smartphone SMS
  const handleAcceptMission = (missionId: string) => {
    if (gameRef.current) {
      gameRef.current.missionManager.startMissionById(missionId);
    }
  };

  // Spawn purchased vehicle from Dealership or Valet
  const handleSpawnCar = (type: 'sports' | 'suv' | 'sedan' | 'taxi' | 'ambulance', colorHex: number) => {
    if (gameRef.current) {
      gameRef.current.spawnPurchasedCar(type, colorHex);
    }
  };

  // Respawn player at safehouse
  const handleRespawn = () => {
    if (gameRef.current) {
      gameRef.current.player.respawn(new THREE.Vector3(-10, 0, 25));
      if (gameRef.current.currentVehicle) {
        gameRef.current.toggleVehicle();
      }
      useGameStore.getState().healPlayer(100);
      useGameStore.getState().clearWantedLevel();
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none">
      {/* 1. Isolated WebGL 3D Canvas Container */}
      <div
        ref={canvasMountRef}
        className="absolute inset-0 w-full h-full cursor-crosshair"
      />

      {/* 2. Cinematic Startup & Title Screen */}
      {(screen === 'loading' || screen === 'title') && (
        <LoadingScreen onStartGame={handleStartGame} />
      )}

      {/* 3. In-Game HUD (playing) */}
      {screen === 'playing' && (
        <HUD
          onToggleVehicle={handleToggleVehicle}
          onTouchInput={handleTouchInput}
          onContextAction={() => gameRef.current?.triggerContextAction()}
          onPause={() => setIsPaused(true)}
          onShoot={() => gameRef.current?.shootWeapon()}
          onAimToggle={() => gameRef.current?.toggleAim()}
          onReload={() => gameRef.current?.reload()}
        />
      )}

      {/* 4. Interactive Smartphone Overlay */}
      {screen === 'playing' && (
        <Smartphone
          onAcceptMission={handleAcceptMission}
          onSpawnCar={handleSpawnCar}
        />
      )}

      {screen === 'playing' && <Supermarket />}

      {screen === 'playing' && pendingStoryChoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-amber-400/40 bg-slate-950 p-6 text-white shadow-2xl">
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-amber-400">A choice with consequences</div>
            <h2 className="mt-2 text-2xl font-black font-game">Who gets the ledger?</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">{pendingStoryChoice.prompt}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => chooseStoryPath('harbor')}
                className="rounded-xl border border-cyan-500/40 bg-cyan-950/60 p-4 text-left transition hover:bg-cyan-900/70"
              >
                <span className="block font-bold text-cyan-300">Back the Harbor Crew</span>
                <span className="mt-1 block text-xs text-slate-300">Protect Mika’s people and earn the docks’ trust.</span>
              </button>
              <button
                onClick={() => chooseStoryPath('civic')}
                className="rounded-xl border border-amber-500/40 bg-amber-950/50 p-4 text-left transition hover:bg-amber-900/70"
              >
                <span className="block font-bold text-amber-300">Back the Civic Office</span>
                <span className="mt-1 block text-xs text-slate-300">Give Nora’s evidence to the city and seek official protection.</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Pause Menu */}
      {isPaused && (
        <PauseMenu
          onResume={() => setIsPaused(false)}
          onRespawn={handleRespawn}
        />
      )}
    </div>
  );
}
