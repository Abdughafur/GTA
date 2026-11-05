import React from 'react';
import { CloudSun, Sun, CloudRain, Moon, Sparkles, Wind, Droplets, Thermometer } from 'lucide-react';
import { useGameStore, WeatherType } from '../../core/gameState';
import { audioManager } from '../../core/AudioManager';

export const PhoneWeather: React.FC = () => {
  const weather = useGameStore((s) => s.weather);
  const setWeather = useGameStore((s) => s.setWeather);
  const timeOfDay = useGameStore((s) => s.timeOfDay);
  const setTimeOfDay = useGameStore((s) => s.setTimeOfDay);

  const formatTime = (time: number) => {
    const hours = Math.floor(time);
    const mins = Math.floor((time - hours) * 60);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 === 0 ? 12 : hours % 12;
    return `${h12}:${mins < 10 ? '0' : ''}${mins} ${ampm}`;
  };

  const handleSetWeather = (w: WeatherType, t: number) => {
    setWeather(w);
    setTimeOfDay(t);
    audioManager.playPhoneBeep();
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white select-none">
      <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CloudSun className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-bold font-game tracking-wider text-sky-300">ABDUWEATHER FORECAST</span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">VICE BAY RADAR</span>
      </div>

      {/* Hero Weather Card */}
      <div className="p-4 bg-gradient-to-br from-sky-950/70 via-slate-900 to-slate-950 border-b border-slate-800 text-center space-y-2">
        <div className="text-xs text-sky-300 uppercase tracking-widest font-semibold">Vice Bay Metropolis</div>
        <div className="text-4xl font-extralight tracking-tight font-mono">
          {weather === 'rain' ? '68°F' : weather === 'night' ? '72°F' : '84°F'}
        </div>
        <div className="text-xs text-slate-300 capitalize font-medium">
          {weather === 'rain' ? 'Rainy Storm' : weather === 'sunset' ? 'Golden Sunset' : weather === 'night' ? 'Clear Night Sky' : 'Sunny & Clear'}
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2 text-[10px] text-slate-400">
          <div className="flex items-center justify-center gap-1 bg-slate-950/60 p-1.5 rounded-lg">
            <Droplets className="w-3 h-3 text-sky-400" />
            <span>{weather === 'rain' ? '92%' : '45%'} Hum</span>
          </div>
          <div className="flex items-center justify-center gap-1 bg-slate-950/60 p-1.5 rounded-lg">
            <Wind className="w-3 h-3 text-sky-400" />
            <span>12 mph</span>
          </div>
          <div className="flex items-center justify-center gap-1 bg-slate-950/60 p-1.5 rounded-lg">
            <Thermometer className="w-3 h-3 text-sky-400" />
            <span>{formatTime(timeOfDay)}</span>
          </div>
        </div>
      </div>

      {/* Atmospheric Presets */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 phone-scroll">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">Atmospheric Simulation</div>

        <div
          onClick={() => handleSetWeather('sunny', 14.5)}
          className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
            weather === 'sunny' ? 'bg-amber-600/20 border-amber-500' : 'bg-slate-900/60 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <Sun className="w-5 h-5 text-amber-400" />
            <div>
              <div className="text-xs font-bold text-slate-100">Daylight Sun (2:30 PM)</div>
              <div className="text-[10px] text-slate-400">Bright directional shadows, clear sky</div>
            </div>
          </div>
          <span className="text-xs font-mono text-amber-400 font-bold">84°</span>
        </div>

        <div
          onClick={() => handleSetWeather('sunset', 18.5)}
          className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
            weather === 'sunset' ? 'bg-orange-600/20 border-orange-500' : 'bg-slate-900/60 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-orange-400" />
            <div>
              <div className="text-xs font-bold text-slate-100">Golden Sunset (6:30 PM)</div>
              <div className="text-[10px] text-slate-400">Warm orange horizon, elongated shadows</div>
            </div>
          </div>
          <span className="text-xs font-mono text-orange-400 font-bold">78°</span>
        </div>

        <div
          onClick={() => handleSetWeather('night', 23.0)}
          className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
            weather === 'night' ? 'bg-sky-600/20 border-sky-500' : 'bg-slate-900/60 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <Moon className="w-5 h-5 text-sky-400" />
            <div>
              <div className="text-xs font-bold text-slate-100">Neon Night (11:00 PM)</div>
              <div className="text-[10px] text-slate-400">Glowing neon signs, streetlamps, headlights</div>
            </div>
          </div>
          <span className="text-xs font-mono text-sky-400 font-bold">72°</span>
        </div>

        <div
          onClick={() => handleSetWeather('rain', 15.0)}
          className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
            weather === 'rain' ? 'bg-blue-600/20 border-blue-500' : 'bg-slate-900/60 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <CloudRain className="w-5 h-5 text-blue-400" />
            <div>
              <div className="text-xs font-bold text-slate-100">Tropical Rainstorm</div>
              <div className="text-[10px] text-slate-400">Rain streaks, overcast fog, wet roads</div>
            </div>
          </div>
          <span className="text-xs font-mono text-blue-400 font-bold">68°</span>
        </div>
      </div>
    </div>
  );
};
