import React from 'react';
import {
  Settings as SettingsIcon,
  Sun,
  CloudRain,
  Moon,
  Volume2,
  Sparkles,
  Sliders,
  BatteryCharging,
  Image,
  Bell,
  Lock
} from 'lucide-react';
import { useGameStore, WeatherType } from '../../core/gameState';
import { audioManager } from '../../core/AudioManager';

export const PhoneSettings: React.FC = () => {
  const weather = useGameStore((s) => s.weather);
  const setWeather = useGameStore((s) => s.setWeather);
  const timeOfDay = useGameStore((s) => s.timeOfDay);
  const setTimeOfDay = useGameStore((s) => s.setTimeOfDay);
  const soundVolume = useGameStore((s) => s.soundVolume);
  const setSoundVolume = useGameStore((s) => s.setSoundVolume);
  const musicVolume = useGameStore((s) => s.musicVolume);
  const setMusicVolume = useGameStore((s) => s.setMusicVolume);
  const graphicsQuality = useGameStore((s) => s.graphicsQuality);
  const setGraphicsQuality = useGameStore((s) => s.setGraphicsQuality);

  const phoneBattery = useGameStore((s) => s.phoneBattery);
  const isBatterySaver = useGameStore((s) => s.isBatterySaver);
  const toggleBatterySaver = useGameStore((s) => s.toggleBatterySaver);
  const wallpaper = useGameStore((s) => s.wallpaper);
  const setWallpaper = useGameStore((s) => s.setWallpaper);
  const ringtone = useGameStore((s) => s.ringtone);
  const setRingtone = useGameStore((s) => s.setRingtone);
  const isSilentMode = useGameStore((s) => s.isSilentMode);
  const toggleSilentMode = useGameStore((s) => s.toggleSilentMode);
  const isPhoneLocked = useGameStore((s) => s.isPhoneLocked);
  const setPhoneLocked = useGameStore((s) => s.setPhoneLocked);

  const weatherOptions: { id: WeatherType; label: string; icon: React.ReactNode }[] = [
    { id: 'sunny', label: 'Sunny', icon: <Sun className="w-3.5 h-3.5 text-amber-400" /> },
    { id: 'sunset', label: 'Sunset', icon: <Sparkles className="w-3.5 h-3.5 text-orange-400" /> },
    { id: 'night', label: 'Night', icon: <Moon className="w-3.5 h-3.5 text-sky-400" /> },
    { id: 'rain', label: 'Rain', icon: <CloudRain className="w-3.5 h-3.5 text-blue-400" /> }
  ];

  const wallpapers: ('sunset' | 'neon' | 'cyber' | 'downtown')[] = ['sunset', 'neon', 'cyber', 'downtown'];
  const ringtones: ('classic' | 'chime' | 'vibes' | 'synth')[] = ['classic', 'chime', 'vibes', 'synth'];

  const handleWeatherChange = (w: WeatherType) => {
    setWeather(w);
    if (w === 'night') setTimeOfDay(23);
    else if (w === 'sunset') setTimeOfDay(18.5);
    else if (w === 'sunny') setTimeOfDay(14.5);
    audioManager.playPhoneBeep();
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white select-none">
      <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SettingsIcon className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold font-game tracking-wider text-slate-300">ABDUPHONE SETTINGS</span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">v16.4</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4 phone-scroll text-xs">
        {/* Battery & Power Saver */}
        <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BatteryCharging className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="font-bold text-slate-100">Battery Level: {Math.round(phoneBattery)}%</div>
                <div className="text-[10px] text-slate-400">Fast charge available in Apartment</div>
              </div>
            </div>
            <button
              onClick={toggleBatterySaver}
              className={`px-2.5 py-1 rounded text-[10px] font-bold transition ${
                isBatterySaver ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {isBatterySaver ? 'Saver: ON' : 'Saver: OFF'}
            </button>
          </div>
        </div>

        {/* Wallpaper Picker */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Image className="w-3 h-3 text-purple-400" /> Homescreen Wallpaper
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {wallpapers.map((wp) => (
              <button
                key={wp}
                onClick={() => {
                  setWallpaper(wp);
                  audioManager.playPhoneBeep();
                }}
                className={`p-2 rounded-lg border text-center font-bold capitalize transition text-[10px] ${
                  wallpaper === wp ? 'bg-purple-600 border-purple-400 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                {wp}
              </button>
            ))}
          </div>
        </div>

        {/* Ringtone Selector */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Bell className="w-3 h-3 text-sky-400" /> Ringtones & Alerts
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {ringtones.map((rt) => (
              <button
                key={rt}
                onClick={() => {
                  setRingtone(rt);
                  audioManager.playPhoneBeep();
                }}
                className={`p-2 rounded-lg border text-center font-bold capitalize transition text-[10px] ${
                  ringtone === rt ? 'bg-sky-600 border-sky-400 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                {rt}
              </button>
            ))}
          </div>
        </div>

        {/* Atmosphere & Weather */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sun className="w-3 h-3 text-amber-400" /> World Weather & Lighting
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {weatherOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleWeatherChange(opt.id)}
                className={`p-2 rounded-lg border flex items-center gap-2 font-semibold transition ${
                  weather === opt.id
                    ? 'bg-blue-600/30 border-blue-500 text-white'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                {opt.icon}
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Audio Volume */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Volume2 className="w-3 h-3 text-blue-400" /> Audio Volume
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Sound Effects</span>
              <span className="font-mono">{Math.round(soundVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={soundVolume}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setSoundVolume(val);
                audioManager.setVolumes(val, musicVolume);
              }}
              className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Radio Music</span>
              <span className="font-mono">{Math.round(musicVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={musicVolume}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setMusicVolume(val);
                audioManager.setVolumes(soundVolume, val);
              }}
              className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>
        </div>

        {/* Graphics Quality */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-3 h-3 text-emerald-400" /> Graphics Preset
          </div>
          <div className="grid grid-cols-4 gap-1">
            {(['low', 'medium', 'high', 'ultra'] as const).map((q) => (
              <button
                key={q}
                onClick={() => {
                  setGraphicsQuality(q);
                  audioManager.playPhoneBeep();
                }}
                className={`py-1.5 rounded-lg border text-center font-bold capitalize transition ${
                  graphicsQuality === q
                    ? 'bg-emerald-600 border-emerald-500 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
