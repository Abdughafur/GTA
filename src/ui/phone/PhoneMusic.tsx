import React from 'react';
import { Music, Radio, Volume2, Play, Square, SkipForward } from 'lucide-react';
import { useGameStore } from '../../core/gameState';
import { audioManager } from '../../core/AudioManager';

export const PhoneMusic: React.FC = () => {
  const radioStation = useGameStore((s) => s.radioStation);
  const radioStationNames = useGameStore((s) => s.radioStationNames);
  const nextRadioStation = useGameStore((s) => s.nextRadioStation);
  const musicVolume = useGameStore((s) => s.musicVolume);
  const setMusicVolume = useGameStore((s) => s.setMusicVolume);
  const soundVolume = useGameStore((s) => s.soundVolume);

  const stations = [
    { id: 0, name: 'Flash FM', genre: 'Synthpop & Electro', desc: '120 BPM upbeat arpeggiators & energetic chords.' },
    { id: 1, name: 'Wave 103', genre: '80s Retrowave', desc: 'Driving analog sawtooth basslines & classic drums.' },
    { id: 2, name: 'K-JAH Bay', genre: 'Dub & Reggae', desc: 'Laid back dub chords with relaxed island atmosphere.' },
    { id: 3, name: 'Radio Los Santos', genre: 'Boom Bap & Hip Hop', desc: 'Deep 808 sub bass & urban street beats.' },
    { id: 4, name: 'Station Off', genre: 'Silence', desc: 'Mute in-game music stream.' }
  ];

  const handleSelectStation = (id: number) => {
    useGameStore.setState({ radioStation: id });
    audioManager.startRadio(id);
    audioManager.playPhoneBeep();
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white select-none">
      <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Music className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-bold font-game tracking-wider text-purple-300">ABDUMUSIC PLAYER</span>
        </div>
        <Radio className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
      </div>

      {/* Currently Playing Card */}
      <div className="p-4 bg-gradient-to-br from-purple-950/60 via-slate-900 to-slate-950 border-b border-slate-800 space-y-3 text-center">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 shadow-xl flex items-center justify-center">
          <Music className="w-10 h-10 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-sm text-slate-100">{radioStationNames[radioStation]}</h3>
          <p className="text-[11px] text-purple-400 font-medium">Procedural Web Audio Live Stream</p>
        </div>

        {/* Volume Slider */}
        <div className="space-y-1 max-w-xs mx-auto text-left">
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>Music Volume</span>
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
            className="w-full accent-purple-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
        </div>
      </div>

      {/* Station List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 phone-scroll">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">Radio Stations</div>

        {stations.map((st) => {
          const isCurrent = radioStation === st.id;
          return (
            <div
              key={st.id}
              onClick={() => handleSelectStation(st.id)}
              className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                isCurrent
                  ? 'bg-purple-600/20 border-purple-500 text-white'
                  : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                  {st.name}
                  {isCurrent && <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping inline-block" />}
                </div>
                <div className="text-[10px] text-slate-400">{st.genre}</div>
              </div>

              <div className="p-1.5 rounded-lg bg-slate-800 text-purple-300">
                {isCurrent && st.id !== 4 ? <Play className="w-3.5 h-3.5 fill-purple-300" /> : <Play className="w-3.5 h-3.5" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
