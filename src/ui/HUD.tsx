import React from 'react';
import { useGameStore, JobType, WeaponType } from '../core/gameState';
import { Minimap } from './Minimap';
import {
  Volume2,
  VolumeX,
  Smartphone as PhoneIcon,
  Radio,
  Gauge,
  Heart,
  Shield,
  Star,
  Car,
  Compass,
  Zap,
  Droplets,
  Utensils,
  Fuel,
  Thermometer,
  ShieldCheck,
  ShieldAlert,
  Moon,
  Pause,
  Clock,
  Sparkles,
  X,
  Camera,
  Crosshair,
  Target,
  RefreshCw,
  Eye,
  Plane,
  Train,
  AlertTriangle,
  Skull,
  Wallet,
  UserRound,
  KeyRound
} from 'lucide-react';
import { audioManager } from '../core/AudioManager';
import { getDistrictName } from '../world/CityGenerator';

interface HUDProps {
  onToggleVehicle: () => void;
  onTouchInput: (key: string, value: number | boolean) => void;
  onContextAction: () => void;
  onPause: () => void;
  onShoot?: () => void;
  onAimToggle?: () => void;
  onReload?: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  onToggleVehicle,
  onTouchInput,
  onContextAction,
  onPause,
  onShoot,
  onAimToggle,
  onReload
}) => {
  const cash = useGameStore((s) => s.cash);
  const reputation = useGameStore((s) => s.reputation);
  const drivingSkill = useGameStore((s) => s.drivingSkill);
  const storyChapter = useGameStore((s) => s.storyChapter);
  const health = useGameStore((s) => s.health);
  const armor = useGameStore((s) => s.armor);
  const energy = useGameStore((s) => s.energy);
  const hunger = useGameStore((s) => s.hunger);
  const thirst = useGameStore((s) => s.thirst);
  const isSleeping = useGameStore((s) => s.isSleeping);

  const wantedLevel = useGameStore((s) => s.wantedLevel);
  const isEscapingHeat = useGameStore((s) => s.isEscapingHeat);
  const heatCooldown = useGameStore((s) => s.heatCooldown);

  const isInVehicle = useGameStore((s) => s.isInVehicle);
  const currentVehicleName = useGameStore((s) => s.currentVehicleName);
  const vehicleSpeed = useGameStore((s) => s.vehicleSpeed);
  const vehicleHealth = useGameStore((s) => s.vehicleHealth);
  const vehicleGear = useGameStore((s) => s.vehicleGear);
  const vehicleRpm = useGameStore((s) => s.vehicleRpm);
  const vehicleFuel = useGameStore((s) => s.vehicleFuel);
  const vehicleOdometer = useGameStore((s) => s.vehicleOdometer);
  const vehicleEngineTemp = useGameStore((s) => s.vehicleEngineTemp);
  const seatbeltFastened = useGameStore((s) => s.seatbeltFastened);
  const toggleSeatbelt = useGameStore((s) => s.toggleSeatbelt);

  // Weapons & Combat
  const currentWeapon = useGameStore((s) => s.currentWeapon);
  const weapons = useGameStore((s) => s.weapons);
  const selectWeapon = useGameStore((s) => s.selectWeapon);
  const isAiming = useGameStore((s) => s.isAiming);
  const setAiming = useGameStore((s) => s.setAiming);
  const damageVignette = useGameStore((s) => s.damageVignette);

  // Camera & Flight & Transit & Death
  const cameraViewMode = useGameStore((s) => s.cameraViewMode);
  const cycleCameraMode = useGameStore((s) => s.cycleCameraMode);
  const helicopterInFlight = useGameStore((s) => s.helicopterInFlight);
  const isInPlane = useGameStore((s) => s.isInPlane);
  const isInTrain = useGameStore((s) => s.isInTrain);
  const isCarjacking = useGameStore((s) => s.isCarjacking);
  const isWasted = useGameStore((s) => s.isWasted);
  const touchMode = useGameStore((s) => s.touchMode);

  const activeMission = useGameStore((s) => s.activeMission);
  const missionTimer = useGameStore((s) => s.missionTimer);
  const distanceToObjective = useGameStore((s) => s.distanceToObjective);

  const activeJob = useGameStore((s) => s.activeJob);
  const activePassenger = useGameStore((s) => s.activePassenger);
  const stopJob = useGameStore((s) => s.stopJob);

  const radioStation = useGameStore((s) => s.radioStation);
  const radioStationNames = useGameStore((s) => s.radioStationNames);
  const nextRadioStation = useGameStore((s) => s.nextRadioStation);

  const isMuted = useGameStore((s) => s.isMuted);
  const setMuted = useGameStore((s) => s.setMuted);

  const openPhone = useGameStore((s) => s.openPhone);
  const isPhoneOpen = useGameStore((s) => s.isPhoneOpen);
  const interactionPrompt = useGameStore((s) => s.interactionPrompt);
  const notificationToast = useGameStore((s) => s.notificationToast);
  const isInventoryOpen = useGameStore((s) => s.isInventoryOpen);
  const setInventoryOpen = useGameStore((s) => s.setInventoryOpen);
  const belongings = useGameStore((s) => s.belongings);

  const appearance = useGameStore((s) => s.appearance);
  const setAppearance = useGameStore((s) => s.setAppearance);
  const isWardrobeOpen = useGameStore((s) => s.isWardrobeOpen);
  const setWardrobeOpen = useGameStore((s) => s.setWardrobeOpen);

  const playerPos = useGameStore((s) => s.playerPos);
  const isUnderwater =
    playerPos[2] >= 358 &&
    playerPos[2] <= 535 &&
    Math.abs(playerPos[0]) < 550 &&
    playerPos[1] < -1.2;

  const districtName = getDistrictName(playerPos[0], playerPos[2]).toUpperCase();

  const toggleMute = () => {
    const next = !isMuted;
    setMuted(next);
    audioManager.setMuted(next);
  };

  const handleSeatbeltClick = () => {
    toggleSeatbelt();
    audioManager.playDoorSlam();
  };

  const activeWep = weapons[currentWeapon];
  const isSniperScoped = currentWeapon === 'sniper' &&
    isAiming &&
    !isInVehicle &&
    !isInPlane &&
    !isInTrain &&
    !isWasted;
  const holdControl = (key: string, activeValue: number | boolean, inactiveValue: number | boolean) => ({
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      onTouchInput(key, activeValue);
    },
    onPointerUp: (event: React.PointerEvent<HTMLButtonElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      onTouchInput(key, inactiveValue);
    },
    onPointerCancel: () => onTouchInput(key, inactiveValue),
    onLostPointerCapture: () => onTouchInput(key, inactiveValue)
  });

  return (
    <div className="fixed inset-0 pointer-events-none z-30 select-none flex flex-col justify-between p-3 sm:p-5 overflow-hidden">
      {/* 0. GTA WASTED DEATH OVERLAY */}
      {isWasted && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center pointer-events-auto backdrop-blur-xs animate-fade-in">
          <div className="absolute inset-0 bg-radial from-red-950/40 via-red-900/20 to-black/90 pointer-events-none" />
          <div className="relative text-center space-y-3 z-10">
            <div className="flex items-center justify-center gap-3">
              <Skull className="w-10 h-10 text-red-500 animate-pulse" />
            </div>
            <h1 className="text-6xl sm:text-8xl font-black font-game tracking-widest text-red-600 drop-shadow-[0_10px_20px_rgba(220,38,38,0.7)] animate-bounce">
              WASTED
            </h1>
            <p className="text-sm sm:text-base font-bold text-slate-300 font-game tracking-wider">
              YOU WERE INCAPACITATED
            </p>
            <div className="inline-block bg-slate-950/90 border border-red-500/50 px-4 py-2 rounded-xl text-xs font-mono text-red-300 shadow-xl">
              Admitted to Vice Bay General Hospital · Fee: <span className="font-bold text-red-400">-$200</span>
            </div>
          </div>
        </div>
      )}

      {/* 1. RED DAMAGE VIGNETTE FLASH WHEN SHOT */}
      {damageVignette > 0 && !isWasted && (
        <div className="fixed inset-0 pointer-events-none z-40 bg-red-600/35 ring-[32px] ring-red-600/60 ring-inset animate-pulse transition-opacity duration-150" />
      )}

      {/* 1B. CARJACKING IN PROGRESS BANNER */}
      {isCarjacking && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-red-950/95 border-2 border-red-500 px-6 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 text-red-200 font-game font-black tracking-wider animate-pulse">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <span>CARJACKING IN PROGRESS — YANKING CIVILLIAN DRIVER</span>
        </div>
      )}

      {/* 2. CENTERED TARGETING CROSSHAIR */}
      {!isSniperScoped && !isInVehicle && !isInPlane && !isInTrain && !isWasted && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-20">
          <div
            className={`relative flex items-center justify-center transition-transform duration-75 ${
              isAiming ? 'scale-125' : 'scale-100 opacity-70'
            }`}
          >
            {/* Center dot */}
            <div className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_4px_rgba(0,0,0,0.8)]" />
            {/* Hair lines */}
            <div className="absolute -top-3 w-0.5 h-2 bg-white/80 shadow-[0_0_3px_black]" />
            <div className="absolute -bottom-3 w-0.5 h-2 bg-white/80 shadow-[0_0_3px_black]" />
            <div className="absolute -left-3 h-0.5 w-2 bg-white/80 shadow-[0_0_3px_black]" />
            <div className="absolute -right-3 h-0.5 w-2 bg-white/80 shadow-[0_0_3px_black]" />
          </div>
        </div>
      )}
      {isSniperScoped && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-20">
          <div className="relative h-[min(90vw,90vh)] w-[min(90vw,90vh)] overflow-hidden rounded-full border border-emerald-100/75 shadow-[0_0_0_9999px_rgba(0,0,0,0.82)]">
            <div className="absolute left-1/2 top-0 h-full w-px bg-emerald-100/65" />
            <div className="absolute left-0 top-1/2 h-px w-full bg-emerald-100/65" />
            <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-100/80" />
          </div>
        </div>
      )}

      {/* 3. NOTIFICATION TOAST */}
      {notificationToast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto bg-slate-950/95 border border-amber-500/80 px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold text-amber-300 animate-slide-up backdrop-blur-md">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{notificationToast}</span>
        </div>
      )}

      {/* 4. SLEEPING OVERLAY */}
      {isSleeping && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center space-y-4 text-white pointer-events-auto animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center animate-pulse">
            <Moon className="w-8 h-8 text-indigo-400" />
          </div>
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold font-game tracking-wider text-indigo-300">RESTING AT SAFEHOUSE...</h2>
            <p className="text-xs text-slate-400">Clock advanced by 8 hours. Fatigue, hunger, and thirst restored.</p>
          </div>
        </div>
      )}

      {isInventoryOpen && (
        <div className="fixed inset-0 z-50 pointer-events-auto flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <section className="w-full max-w-md rounded-2xl border border-sky-500/50 bg-slate-950/95 p-5 text-white shadow-2xl">
            <header className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-game text-xl font-black tracking-wider text-sky-300">PERSONAL BELONGINGS</h2>
                <p className="mt-1 text-[10px] uppercase tracking-widest text-slate-500">Inventory · [I] to close</p>
              </div>
              <button
                onClick={() => setInventoryOpen(false)}
                className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-800"
                aria-label="Close inventory"
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-slate-900 p-3">
                <span className="flex items-center gap-2 text-sm text-slate-300"><Wallet className="h-4 w-4 text-emerald-400" /> Wallet</span>
                <span className="font-mono font-bold text-emerald-300">${cash.toLocaleString()}</span>
              </div>
              <div className="rounded-xl bg-slate-900 p-3">
                <div className="mb-1 flex items-center gap-2 text-sm text-slate-300"><UserRound className="h-4 w-4 text-sky-400" /> City identity card</div>
                <div className="pl-6 font-mono text-xs text-slate-400">{belongings.identityNumber}</div>
              </div>
              <div className="rounded-xl bg-slate-900 p-3">
                <div className="mb-2 flex items-center gap-2 text-sm text-slate-300"><PhoneIcon className="h-4 w-4 text-violet-400" /> Phones</div>
                <div className="space-y-1 pl-6 text-xs text-slate-400">
                  {belongings.phoneModels.map((model) => (
                    <div key={model} className={model === belongings.activePhoneModel ? 'font-bold text-violet-300' : ''}>
                      {model}{model === belongings.activePhoneModel ? ' · active' : ''}
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl bg-slate-900 p-3">
                <div className="mb-1 flex items-center gap-2 text-sm text-slate-300"><KeyRound className="h-4 w-4 text-amber-400" /> Keys</div>
                <div className="pl-6 text-xs text-slate-400">{belongings.keys.join(' · ')}</div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {belongings.carriedItems.map((item) => (
                  <span key={item} className="rounded-full border border-slate-700 px-2.5 py-1 text-[10px] text-slate-400">{item}</span>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      {isUnderwater && (
        <div className="fixed inset-0 z-10 pointer-events-none bg-sky-900/35 shadow-[inset_0_0_120px_rgba(2,132,199,0.65)]">
          <div className="absolute left-1/2 top-20 -translate-x-1/2 rounded-full border border-sky-300/40 bg-sky-950/50 px-3 py-1 text-[10px] font-bold tracking-widest text-sky-100">
            UNDERWATER
          </div>
        </div>
      )}

      {/* 5A. AIRPLANE FLIGHT HUD */}
      {isInPlane && (
        <div className="self-center pointer-events-auto bg-slate-950/95 border-2 border-sky-500/80 p-3 sm:p-4 rounded-2xl shadow-2xl flex flex-col items-center gap-2 backdrop-blur-md text-white">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Plane className="w-6 h-6 text-sky-400 animate-pulse" />
              <div>
                <div className="text-xs font-bold text-sky-300 font-game">LUXOR JET AIRLINER</div>
                <div className="text-[10px] text-slate-400">Vice Bay International Airport [VBX]</div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="bg-slate-900/90 px-2.5 py-1 rounded border border-slate-800">
                ALT: <span className="text-amber-400 font-bold">{Math.round(playerPos[1])}m ({Math.round(playerPos[1] * 3.28)} FT)</span>
              </div>
              <div className="bg-slate-900/90 px-2.5 py-1 rounded border border-slate-800">
                SPD: <span className="text-emerald-400 font-bold">{vehicleSpeed} KTS</span>
              </div>
            </div>
          </div>
          <div className="text-[11px] text-sky-200 bg-sky-950/60 px-3 py-1 rounded-lg border border-sky-800/80 font-mono">
            [W/S] Pitch Down/Up · [A/D] Roll & Turn · [Space] Takeoff / Jet Throttle · [Shift] Airbrake · [E] Exit
          </div>
        </div>
      )}

      {/* 5B. TRAIN PASSENGER HUD */}
      {isInTrain && (
        <div className="self-center pointer-events-auto bg-slate-950/95 border-2 border-amber-500/80 p-3 sm:p-4 rounded-2xl shadow-2xl flex items-center gap-6 backdrop-blur-md text-white">
          <div className="flex items-center gap-3">
            <Train className="w-6 h-6 text-amber-400 animate-bounce" />
            <div>
              <div className="text-xs font-bold text-amber-300 font-game">VICE BAY METRO RAILWAY</div>
              <div className="text-[10px] text-slate-400">Line 1 · Scenic Loop Service</div>
            </div>
          </div>
          <div className="text-xs font-mono text-slate-200 bg-slate-900/90 px-3 py-1 rounded border border-slate-800">
            Next Stop: <span className="text-emerald-400 font-bold">Central Station</span>
          </div>
          <button
            onClick={onToggleVehicle}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition active:scale-95 shadow"
          >
            Disembark [E]
          </button>
        </div>
      )}

      {/* 5C. HELICOPTER FLIGHT STATUS HUD */}
      {helicopterInFlight && !isInPlane && (
        <div className="self-center pointer-events-auto bg-slate-950/90 border border-sky-500/60 p-3 rounded-2xl shadow-2xl flex items-center gap-6 backdrop-blur-md text-white">
          <div className="flex items-center gap-2">
            <Plane className="w-5 h-5 text-sky-400 animate-pulse" />
            <div>
              <div className="text-xs font-bold text-sky-300 font-game">V-BAY MAVERICK CHOPPER</div>
              <div className="text-[10px] text-slate-400">Flight Mode Active</div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <div>ALT: <span className="text-amber-400 font-bold">{Math.round(playerPos[1])}m</span></div>
            <div>SPD: <span className="text-emerald-400 font-bold">{vehicleSpeed} KTS</span></div>
          </div>
          <div className="text-[10px] text-slate-300 bg-slate-900 px-2 py-1 rounded border border-slate-800">
            [W/S] Pitch · [A/D] Turn · [Space] Ascend · [Shift] Descend
          </div>
        </div>
      )}

      {/* 6. WARDROBE CUSTOMIZER MODAL */}
      {isWardrobeOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 pointer-events-auto">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden p-5 space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold font-game text-sm tracking-wider text-purple-300">WARDROBE & CHARACTER STYLING</h3>
              </div>
              <button
                onClick={() => setWardrobeOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs max-h-[60vh] overflow-y-auto pr-1 phone-scroll">
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5">Jacket Color</label>
                <div className="flex gap-2">
                  {[
                    { hex: 0xd97706, label: 'Amber' },
                    { hex: 0xdc2626, label: 'Crimson' },
                    { hex: 0x2563eb, label: 'Cobalt' },
                    { hex: 0x059669, label: 'Emerald' },
                    { hex: 0x1e293b, label: 'Midnight' },
                    { hex: 0xf8fafc, label: 'White' }
                  ].map((c) => (
                    <button
                      key={c.hex}
                      onClick={() => setAppearance({ jacketColor: c.hex })}
                      className={`w-8 h-8 rounded-full border-2 transition active:scale-90 ${
                        appearance.jacketColor === c.hex ? 'border-white scale-110 shadow-lg' : 'border-slate-700'
                      }`}
                      style={{ backgroundColor: `#${c.hex.toString(16).padStart(6, '0')}` }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1.5">Pants Color</label>
                <div className="flex gap-2">
                  {[
                    { hex: 0x1e3a8a, label: 'Blue Jeans' },
                    { hex: 0x0f172a, label: 'Black' },
                    { hex: 0x78716c, label: 'Khaki' },
                    { hex: 0x475569, label: 'Slate' }
                  ].map((c) => (
                    <button
                      key={c.hex}
                      onClick={() => setAppearance({ pantsColor: c.hex })}
                      className={`w-8 h-8 rounded-full border-2 transition active:scale-90 ${
                        appearance.pantsColor === c.hex ? 'border-white scale-110 shadow-lg' : 'border-slate-700'
                      }`}
                      style={{ backgroundColor: `#${c.hex.toString(16).padStart(6, '0')}` }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1.5">Hair Style</label>
                <div className="grid grid-cols-4 gap-2">
                  {['Crew Cut', 'Fade', 'Slick Back', 'Dreads'].map((style, idx) => (
                    <button
                      key={style}
                      onClick={() => setAppearance({ hairStyle: idx })}
                      className={`py-1.5 px-2 rounded-lg text-center font-bold transition ${
                        appearance.hairStyle === idx
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  onClick={() => setAppearance({ glasses: !appearance.glasses })}
                  className={`py-2 rounded-lg font-bold border transition ${
                    appearance.glasses
                      ? 'bg-purple-950/80 border-purple-500 text-purple-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  Glasses: {appearance.glasses ? 'ON' : 'OFF'}
                </button>
                <button
                  onClick={() => setAppearance({ hat: !appearance.hat })}
                  className={`py-2 rounded-lg font-bold border transition ${
                    appearance.hat
                      ? 'bg-purple-950/80 border-purple-500 text-purple-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  Cap: {appearance.hat ? 'ON' : 'OFF'}
                </button>
                <button
                  onClick={() => setAppearance({ watch: !appearance.watch })}
                  className={`py-2 rounded-lg font-bold border transition ${
                    appearance.watch
                      ? 'bg-purple-950/80 border-purple-500 text-purple-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  Watch: {appearance.watch ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                setWardrobeOpen(false);
                audioManager.playCashRegister();
              }}
              className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition active:scale-95 shadow-lg"
            >
              Apply Appearance
            </button>
          </div>
        </div>
      )}

      {/* TOP BAR */}
      <div className="flex items-start justify-between w-full">
        {/* Top-Left: Active Mission Card & Job Shift Bar & Radio Banner */}
        <div className="space-y-2 pointer-events-auto max-w-sm">
          {activeJob !== 'none' && (
            <div className="bg-slate-950/90 border-l-4 border-amber-500 p-3 rounded-r-xl shadow-xl space-y-1.5 backdrop-blur-xs">
              <div className="flex items-center justify-between text-xs font-bold text-amber-400 uppercase tracking-wider font-game">
                <span className="flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-amber-400" />
                  <span>ON DUTY: {activeJob} SHIFT</span>
                </span>
                <button
                  onClick={stopJob}
                  className="px-2 py-0.5 bg-red-600/80 hover:bg-red-500 text-white rounded text-[10px] font-bold"
                >
                  Clock Out
                </button>
              </div>

              {activePassenger ? (
                <div className="space-y-0.5 text-xs text-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">Passenger: {activePassenger.name}</span>
                    <span className="font-mono text-emerald-400 font-bold">${activePassenger.fare} Fare</span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>
                      {activePassenger.isPickedUp
                        ? 'Transport passenger to destination'
                        : 'Navigate to pickup location'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-slate-400">
                  Cruising for fares... Next call will appear shortly.
                </div>
              )}
            </div>
          )}

          {activeMission && (
            <div className="bg-slate-950/90 border-l-4 border-sky-500 p-3 rounded-r-xl shadow-xl space-y-1 backdrop-blur-xs">
              <div className="flex items-center justify-between text-xs font-bold text-sky-400 uppercase tracking-wider font-game">
                <span>{activeMission.title}</span>
                {activeMission.timeLimit && (
                  <span className="font-mono text-red-400 bg-red-950/80 px-2 py-0.5 rounded">
                    ⏱ {Math.ceil(missionTimer)}s
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-200">{activeMission.description}</p>
              {activeMission.type === 'delivery' && activeMission.pickupPos && (
                <p className="text-[11px] font-semibold text-amber-300">
                  {activeMission.isPackagePickedUp ? 'Package secured · reach the drop-off' : 'Collect the package at the marked pickup'}
                </p>
              )}
              {distanceToObjective > 0 && (
                <div className="text-[11px] text-sky-400 font-mono flex items-center gap-1 font-semibold">
                  <Compass className="w-3.5 h-3.5" />
                  <span>Objective: {distanceToObjective}m</span>
                </div>
              )}
            </div>
          )}

          {isInVehicle && (
            <div
              onClick={() => {
                nextRadioStation();
                audioManager.startRadio(useGameStore.getState().radioStation);
              }}
              className="inline-flex items-center gap-2 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full text-xs text-slate-300 cursor-pointer shadow transition"
            >
              <Radio className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold">{radioStationNames[radioStation]}</span>
              <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">[R]</span>
            </div>
          )}
        </div>

        {/* Top-Right: Weapon Selector & Ammo Readout, Camera Mode Switcher, Cash, Wanted Stars, and Life Needs */}
        <div className="flex w-64 max-w-[calc(100vw-1.5rem)] flex-col items-end gap-2 pointer-events-auto">
          {/* Quick Utility Buttons: Camera Switcher, Mute, Phone, Pause */}
          <div className="flex items-center gap-1">
            {/* Camera View Mode Switcher Button */}
            <button
              onClick={cycleCameraMode}
              className={`flex h-8 items-center gap-1.5 rounded-md border px-2 text-[10px] font-semibold transition active:scale-95 ${
                cameraViewMode === 'first_person'
                ? 'bg-rose-400/15 border-rose-300/50 text-rose-200'
                  : cameraViewMode === 'third_close'
                ? 'bg-white/10 border-white/25 text-white'
                : 'bg-black/45 hover:bg-black/65 border-white/15 text-white/75'
              }`}
              title="Switch Camera View [C]"
              aria-label="Switch camera view"
            >
              <Camera className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
              {cameraViewMode === 'first_person' ? 'Cockpit 1st [C]' : cameraViewMode === 'third_close' ? 'Aim Close [C]' : 'Chase 3rd [C]'}
              </span>
            </button>

            <button
              onClick={() => {
                if (isPhoneOpen) useGameStore.getState().closePhone();
                else openPhone();
              }}
              className="flex h-8 items-center gap-1.5 rounded-md border border-white/15 bg-black/45 px-2 text-[10px] font-semibold text-white/75 transition hover:bg-black/65 active:scale-95"
              aria-label={isPhoneOpen ? 'Close phone' : 'Open phone'}
            >
              <PhoneIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Phone [P]</span>
            </button>

            <button
              onClick={toggleMute}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-white/15 bg-black/45 text-white/75 transition hover:bg-black/65 active:scale-95"
              aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
            >
              {isMuted ? <VolumeX className="h-3.5 w-3.5 text-rose-300" /> : <Volume2 className="h-3.5 w-3.5" />}
            </button>

            <button
              onClick={onPause}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-white/15 bg-black/45 text-white/75 transition hover:bg-black/65 active:scale-95"
              aria-label="Pause game"
            >
              <Pause className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* GTA-STYLE WEAPON SELECTOR & AMMO READOUT */}
          <div className="w-full rounded-md border border-white/15 bg-black/55 p-2.5 shadow-lg backdrop-blur-md">
            <div className="mb-2 flex items-center justify-between border-b border-white/10 pb-2">
              <div className="min-w-0">
                <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/45">Equipped</div>
                <div className="truncate text-xs font-semibold uppercase tracking-wider text-white">{activeWep.name}</div>
              </div>
              <div className="ml-3 text-right font-mono tabular-nums">
                {currentWeapon === 'fists' || currentWeapon === 'knife' ? (
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-200">Melee</span>
                ) : (
                  <span className="text-sm font-semibold text-white">
                    <span className={activeWep.clip <= 3 ? 'text-rose-300' : 'text-white'}>{activeWep.clip}</span>
                    <span className="text-white/35"> / </span>
                    <span className="text-white/55">{activeWep.reserve}</span>
                  </span>
                )}
              </div>
            </div>
            {/* Weapon Selector Icons */}
            <div className="grid grid-cols-6 gap-1">
              {(['fists', 'knife', 'pistol', 'smg', 'rifle', 'sniper'] as WeaponType[]).map((w, idx) => (
                <button
                  key={w}
                  onClick={() => selectWeapon(w)}
                  className={`min-w-0 rounded-sm px-1 py-1.5 text-[9px] font-semibold uppercase transition active:scale-95 ${
                    currentWeapon === w
                      ? 'bg-white text-slate-950'
                      : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/90'
                  }`}
                  title={`[${idx + 1}] Select ${weapons[w].name}`}
                  aria-label={`Select ${weapons[w].name}`}
                  aria-pressed={currentWeapon === w}
                >
                  {w === 'fists' ? 'Fist' : w === 'sniper' ? 'Scope' : w}
                </button>
              ))}
            </div>
          </div>

          <div className="flex w-full items-center justify-between rounded-md border border-white/15 bg-black/55 px-3 py-2 shadow-lg backdrop-blur-md">
            <div>
              <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/45">
                <Wallet className="h-3 w-3" />
                Cash
              </div>
              <div className="mt-0.5 font-mono text-lg font-semibold leading-none tracking-tight text-white tabular-nums">
                ${cash.toLocaleString()}
              </div>
              <div className="mt-1 whitespace-nowrap text-[8px] font-medium uppercase tracking-wider text-white/40">
                CH {Math.min(storyChapter, 8)}/8 · REP {reputation} · DRV {drivingSkill}
              </div>
            </div>

            {/* Wanted Stars (5 Stars) */}
            <div className="flex flex-col items-end gap-1">
              <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/45">Wanted</span>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((starIdx) => {
                  const active = starIdx <= wantedLevel;
                  return (
                    <Star
                      key={starIdx}
                      className={`h-3 w-3 ${
                        active
                          ? isEscapingHeat
                            ? 'fill-amber-300 text-amber-300'
                            : 'fill-rose-300 text-rose-300'
                          : 'text-white/15'
                      }`}
                    />
                  );
                })}
              </div>
              {isEscapingHeat && (
                <span className="font-mono text-[9px] tabular-nums text-amber-200">
                  CLEARING {Math.ceil(heatCooldown)}s
                </span>
              )}
            </div>
          </div>

          {/* Comprehensive Life Simulation Status */}
          <div className="w-full space-y-1.5 rounded-md border border-white/15 bg-black/55 p-2.5 shadow-lg backdrop-blur-md">
            {/* Health Bar */}
            <div className="flex items-center gap-1.5">
              <Heart className="w-3 h-3 text-emerald-500 fill-emerald-500 shrink-0" />
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-emerald-300 transition-all duration-200"
                  style={{ width: `${Math.min(100, Math.max(0, health))}%` }}
                />
              </div>
              <span className="w-5 text-right font-mono text-[9px] tabular-nums text-white/65">{health}</span>
            </div>

            {/* Armor Bar */}
            <div className="flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-blue-500 fill-blue-500 shrink-0" />
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-sky-300 transition-all duration-200"
                  style={{ width: `${Math.min(100, Math.max(0, (armor / 50) * 100))}%` }}
                />
              </div>
              <span className="w-5 text-right font-mono text-[9px] tabular-nums text-white/65">{armor}</span>
            </div>

            {/* Energy Bar */}
            <div className="flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-amber-200 transition-all duration-200"
                  style={{ width: `${Math.min(100, Math.max(0, energy))}%` }}
                />
              </div>
              <span className="w-5 text-right font-mono text-[9px] tabular-nums text-white/65">{Math.round(energy)}</span>
            </div>

            {/* Hunger Bar */}
            <div className="flex items-center gap-1.5">
              <Utensils className="w-3 h-3 text-orange-400 shrink-0" />
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-orange-300 transition-all duration-200"
                  style={{ width: `${Math.min(100, Math.max(0, hunger))}%` }}
                />
              </div>
              <span className="w-5 text-right font-mono text-[9px] tabular-nums text-white/65">{Math.round(hunger)}</span>
            </div>

            {/* Thirst Bar */}
            <div className="flex items-center gap-1.5">
              <Droplets className="w-3 h-3 text-cyan-400 shrink-0" />
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-cyan-200 transition-all duration-200"
                  style={{ width: `${Math.min(100, Math.max(0, thirst))}%` }}
                />
              </div>
              <span className="w-5 text-right font-mono text-[9px] tabular-nums text-white/65">{Math.round(thirst)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* CENTER: Contextual Interaction Prompt */}
      {interactionPrompt && (
        <div className="self-center pointer-events-auto rounded-md border border-white/25 border-l-2 border-l-rose-300 bg-black/70 px-4 py-2 text-center font-game text-xs font-semibold tracking-wide text-white shadow-lg backdrop-blur-md sm:text-sm">
          {interactionPrompt}
        </div>
      )}

      {/* BOTTOM BAR */}
      <div className="flex items-end justify-between w-full">
        {/* Bottom-Left: Minimap & District Name */}
        <div className="flex flex-col items-start gap-1 pointer-events-auto">
          <Minimap />
          <div className="rounded-sm border border-white/15 bg-black/50 px-2.5 py-1 font-game text-[9px] font-semibold tracking-[0.16em] text-white/75 backdrop-blur-sm">
            {districtName}
          </div>
        </div>

        {/* Bottom-Center / Right: Shoot / Aim Touch Controls & Vehicle Dashboard */}
        <div className={`flex items-end gap-3 pointer-events-auto ${touchMode ? 'max-sm:hidden' : ''}`}>
          {/* Quick On-Screen Shoot & Aim Buttons (works with mouse click or touch on mobile) */}
          <div className="flex items-center gap-1.5 rounded-md border border-white/15 bg-black/55 p-1.5 backdrop-blur-md">
            <button
              onClick={() => {
                if (onAimToggle) onAimToggle();
                else setAiming(!isAiming);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition active:scale-95 flex items-center gap-1.5 border shadow ${
                isAiming
                  ? 'bg-amber-500 border-amber-400 text-slate-950'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/75'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>{isAiming ? 'Aiming [R-Click]' : 'Aim'}</span>
            </button>

            <button
              onClick={() => {
                if (onShoot) onShoot();
              }}
              className="flex items-center gap-1.5 rounded-sm border border-rose-200 bg-rose-100 px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-white active:scale-95"
            >
              <Target className="w-4 h-4" />
              <span>FIRE [L-Click]</span>
            </button>

            <button
              onClick={() => {
                if (onReload) onReload();
                else useGameStore.getState().reloadWeapon();
                audioManager.playGunReload();
              }}
              className="rounded-sm border border-white/10 bg-white/5 p-2 text-white/75 transition hover:bg-white/10 active:scale-95"
              title="Reload [R]"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Cockpit Speedometer Gauge when Driving */}
          {isInVehicle && (
            <div className="bg-slate-950/95 border border-slate-800 p-3 rounded-2xl shadow-2xl flex items-center gap-4 backdrop-blur-md">
              <div className="flex flex-col items-center">
                <div className="text-3xl font-black font-mono tracking-tight text-white tabular-nums">
                  {vehicleSpeed}
                </div>
                <div className="text-[9px] font-bold tracking-widest text-slate-400 font-game">MPH</div>
                <div className="text-[10px] font-mono font-bold text-amber-400 mt-0.5">
                  {vehicleSpeed === 0 ? 'N' : `D${vehicleGear}`}
                </div>

                {touchMode && !isPhoneOpen && !isInventoryOpen && !isWasted && (
                  <div className="fixed inset-x-0 bottom-4 z-40 flex items-end justify-between px-3 pointer-events-none sm:bottom-5 sm:px-5">
                    <div className="pointer-events-auto mb-40 flex flex-col items-center gap-1">
                      <div className="grid grid-cols-3 grid-rows-3 gap-1">
                        <span />
                        <button {...holdControl('forward', 1, 0)} aria-label="Move forward" className="h-12 w-12 rounded-xl border border-white/25 bg-slate-950/75 text-xl font-black text-white shadow-lg active:bg-sky-500/80 touch-none">▲</button>
                        <span />
                        <button {...holdControl('left', 1, 0)} aria-label="Move left" className="h-12 w-12 rounded-xl border border-white/25 bg-slate-950/75 text-xl font-black text-white shadow-lg active:bg-sky-500/80 touch-none">◀</button>
                        <span className="h-12 w-12 rounded-xl border border-white/10 bg-black/35" />
                        <button {...holdControl('right', 1, 0)} aria-label="Move right" className="h-12 w-12 rounded-xl border border-white/25 bg-slate-950/75 text-xl font-black text-white shadow-lg active:bg-sky-500/80 touch-none">▶</button>
                        <span />
                        <button {...holdControl('backward', 1, 0)} aria-label="Move backward" className="h-12 w-12 rounded-xl border border-white/25 bg-slate-950/75 text-xl font-black text-white shadow-lg active:bg-sky-500/80 touch-none">▼</button>
                        <span />
                      </div>
                      <button {...holdControl('sprint', true, false)} aria-label="Sprint" className="h-10 rounded-xl border border-amber-300/50 bg-amber-950/80 px-5 text-xs font-bold uppercase tracking-wider text-amber-100 shadow-lg active:bg-amber-500 active:text-slate-950 touch-none">Sprint</button>
                    </div>

                    <div className="pointer-events-auto grid w-[116px] grid-cols-2 gap-1.5">
                      <button onClick={onContextAction} className="col-span-2 min-h-11 rounded-xl border border-cyan-300/50 bg-cyan-950/85 px-2 text-[10px] font-bold uppercase text-cyan-100 shadow-lg active:bg-cyan-500 active:text-slate-950">
                        Interact
                      </button>
                      <button onClick={onToggleVehicle} className="col-span-2 min-h-11 rounded-xl border border-white/30 bg-slate-950/85 px-2 text-[10px] font-bold uppercase text-white shadow-lg active:bg-white active:text-slate-950">
                        {isInVehicle || isInTrain || isInPlane || helicopterInFlight ? 'Exit / Board' : 'Enter / Board'}
                      </button>
                      <button {...holdControl('jump', true, false)} aria-label="Jump / take off" className="min-h-12 rounded-xl border border-sky-300/50 bg-sky-950/85 px-1 text-[10px] font-bold uppercase text-sky-100 shadow-lg active:bg-sky-500 active:text-slate-950 touch-none">Jump</button>
                      <button {...holdControl('handbrake', true, false)} aria-label="Handbrake" className="min-h-12 rounded-xl border border-amber-300/50 bg-amber-950/85 px-1 text-[10px] font-bold uppercase text-amber-100 shadow-lg active:bg-amber-500 active:text-slate-950 touch-none">Brake</button>
                      <button onClick={() => onAimToggle ? onAimToggle() : setAiming(!isAiming)} aria-label="Aim" className={`min-h-12 rounded-xl border px-1 text-[10px] font-bold uppercase shadow-lg active:scale-95 ${isAiming ? 'border-amber-300 bg-amber-400 text-slate-950' : 'border-white/25 bg-slate-950/85 text-white'}`}>Aim</button>
                      <button onClick={onShoot} aria-label="Fire weapon" className="min-h-12 rounded-xl border border-rose-300/60 bg-rose-700/90 px-1 text-[10px] font-bold uppercase text-white shadow-lg active:bg-rose-400 active:text-slate-950">Fire</button>
                      <button onClick={() => { if (onReload) onReload(); else useGameStore.getState().reloadWeapon(); audioManager.playGunReload(); }} aria-label="Reload weapon" className="col-span-2 min-h-10 rounded-xl border border-white/25 bg-slate-950/85 px-2 text-[10px] font-bold uppercase text-white shadow-lg active:bg-white active:text-slate-950">Reload</button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1.5 w-28">
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500 transition-all duration-75"
                    style={{ width: `${Math.min(100, ((vehicleRpm - 1000) / 6500) * 100)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>Armor</span>
                  <span className="font-bold text-slate-200">{vehicleHealth}%</span>
                </div>

                <div className="flex items-center justify-between text-[10px] pt-0.5 border-t border-slate-800">
                  <div className="flex items-center gap-1 text-amber-400 font-mono">
                    <Fuel className="w-3 h-3" />
                    <span>{Math.round(vehicleFuel)}%</span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-300 font-mono">
                    <Thermometer className="w-3 h-3 text-red-400" />
                    <span>{vehicleEngineTemp}°F</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center gap-1.5 pl-2 border-l border-slate-800">
                <div className="text-[9px] font-mono text-slate-400 text-center">
                  <div>ODO</div>
                  <div className="font-bold text-slate-200">{vehicleOdometer} mi</div>
                </div>

                <button
                  onClick={handleSeatbeltClick}
                  className={`p-1.5 rounded-lg border transition active:scale-95 flex items-center justify-center ${
                    seatbeltFastened
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-400'
                      : 'bg-red-950/80 border-red-500 text-red-400 animate-pulse'
                  }`}
                  title={seatbeltFastened ? 'Seatbelt Fastened [B]' : 'Fasten Seatbelt [B]'}
                >
                  {seatbeltFastened ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Quick Vehicle Entry/Exit Button */}
          <div className="flex items-center gap-1.5 rounded-md border border-white/15 bg-black/55 p-1.5 backdrop-blur-md">
            <button
              onClick={onToggleVehicle}
              className="flex items-center gap-1.5 rounded-sm bg-white px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-rose-100 active:scale-95"
            >
              <Car className="w-4 h-4" />
              <span>{isInVehicle ? 'Exit [E]' : 'Enter Car [E]'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
