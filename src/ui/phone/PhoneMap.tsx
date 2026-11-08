import React, { useState } from 'react';
import { useGameStore } from '../../core/gameState';
import { Navigation, MapPin, Building, Compass, Layers } from 'lucide-react';
import { audioManager } from '../../core/AudioManager';
import { WORLD_RADIUS } from '../../world/CityGenerator';

export const PhoneMap: React.FC = () => {
  const [viewMode, setViewMode] = useState<'city' | 'blueprint'>('city');
  const [blueprintFloor, setBlueprintFloor] = useState<number>(2); // Default to Penthouse

  const playerPos = useGameStore((s) => s.playerPos);
  const customWaypoint = useGameStore((s) => s.customWaypoint);
  const setCustomWaypoint = useGameStore((s) => s.setCustomWaypoint);
  const activeMission = useGameStore((s) => s.activeMission);
  const distanceToObjective = useGameStore((s) => s.distanceToObjective);
  const currentFloor = useGameStore((s) => s.currentFloor);

  // Map coordinate conversion: World (-50,000..50,000) to SVG viewbox (0..400)
  const worldToMap = (x: number, z: number) => {
    const mapX = ((x + WORLD_RADIUS) / (WORLD_RADIUS * 2)) * 400;
    const mapY = ((z + WORLD_RADIUS) / (WORLD_RADIUS * 2)) * 400;
    return { x: mapX, y: mapY };
  };

  const mapToWorld = (mapX: number, mapY: number): [number, number, number] => {
    const x = Math.max(-WORLD_RADIUS + 20, Math.min(WORLD_RADIUS - 20, (mapX / 400) * (WORLD_RADIUS * 2) - WORLD_RADIUS));
    const z = Math.max(-WORLD_RADIUS + 20, Math.min(WORLD_RADIUS - 20, (mapY / 400) * (WORLD_RADIUS * 2) - WORLD_RADIUS));
    return [Math.round(x), 0, Math.round(z)];
  };

  const handleMapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (viewMode === 'blueprint') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 400;
    const clickY = ((e.clientY - rect.top) / rect.height) * 400;
    const worldCoords = mapToWorld(clickX, clickY);
    setCustomWaypoint(worldCoords);
    audioManager.playPhoneBeep();
  };

  const playerMap = worldToMap(playerPos[0], playerPos[2]);
  const waypointMap = customWaypoint ? worldToMap(customWaypoint[0], customWaypoint[2]) : null;
  const missionMap = activeMission ? worldToMap(activeMission.targetPos[0], activeMission.targetPos[2]) : null;

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white select-none">
      {/* App Header */}
      <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-bold font-game tracking-wider text-sky-400">ABDU MAPS & GPS</span>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
          <button
            onClick={() => {
              setViewMode('city');
              audioManager.playPhoneBeep();
            }}
            className={`px-2 py-0.5 text-[10px] font-bold rounded ${
              viewMode === 'city' ? 'bg-sky-600 text-white' : 'text-slate-400'
            }`}
          >
            Metropolis
          </button>
          <button
            onClick={() => {
              setViewMode('blueprint');
              audioManager.playPhoneBeep();
            }}
            className={`px-2 py-0.5 text-[10px] font-bold rounded flex items-center gap-1 ${
              viewMode === 'blueprint' ? 'bg-amber-600 text-white' : 'text-slate-400'
            }`}
          >
            <Building className="w-2.5 h-2.5" /> Floorplan
          </button>
        </div>
      </div>

      {/* Mode 1: Metropolis Outdoor GPS Map */}
      {viewMode === 'city' ? (
        <div className="relative flex-1 bg-slate-900 overflow-hidden cursor-crosshair">
          <svg viewBox="0 0 400 400" className="w-full h-full" onClick={handleMapClick}>
            {/* Coastline and ocean */}
            <rect
              x={worldToMap(-550, 360).x}
              y={worldToMap(-550, 360).y}
              width={worldToMap(550, 0).x - worldToMap(-550, 0).x}
              height={worldToMap(0, 540).y - worldToMap(0, 360).y}
              fill="#0369a1"
              opacity="0.72"
            />
            <text x="200" y="207" fill="#38bdf8" fontSize="3" textAnchor="middle" fontWeight="bold" opacity="0.8">
              VICE BAY
            </text>

            {Array.from({ length: 21 }, (_, index) => -WORLD_RADIUS + index * 5000).map((road) => {
              const vertical = worldToMap(road, 0).x;
              const horizontal = worldToMap(0, road).y;
              return (
                <g key={`outer-road-${road}`} stroke="#334155" strokeWidth="0.65" opacity="0.65">
                  <line x1={vertical} y1="0" x2={vertical} y2="400" />
                  <line x1="0" y1={horizontal} x2="400" y2={horizontal} />
                </g>
              );
            })}

            {/* Legacy downtown map art, scaled to its true place in the expanded world. */}
            <g transform="translate(197.6 197.6) scale(0.008)">
              {/* Road Network Lines */}
              <line x1="30" y1="60" x2="370" y2="60" stroke="#334155" strokeWidth="18" strokeLinecap="round" />
              <line x1="30" y1="160" x2="370" y2="160" stroke="#334155" strokeWidth="18" strokeLinecap="round" />
              <line x1="30" y1="260" x2="370" y2="260" stroke="#334155" strokeWidth="18" strokeLinecap="round" />

              <line x1="40" y1="40" x2="40" y2="280" stroke="#334155" strokeWidth="18" strokeLinecap="round" />
              <line x1="140" y1="40" x2="140" y2="280" stroke="#334155" strokeWidth="18" strokeLinecap="round" />
              <line x1="240" y1="40" x2="240" y2="280" stroke="#334155" strokeWidth="18" strokeLinecap="round" />
              <line x1="340" y1="40" x2="340" y2="280" stroke="#334155" strokeWidth="18" strokeLinecap="round" />

              {/* District Highlights */}
              {/* Safehouse Grand Tower */}
              <rect x="180" y="140" width="30" height="30" fill="#065f46" rx="4" stroke="#10b981" strokeWidth="1.5" />
              <text x="195" y="158" fill="#34d399" fontSize="7" textAnchor="middle" fontWeight="bold">TOWER</text>

              {/* Downtown Financial */}
              <rect x="155" y="75" width="70" height="60" fill="#1e293b" rx="4" stroke="#475569" strokeWidth="1" />
              <text x="190" y="105" fill="#94a3b8" fontSize="8" textAnchor="middle" fontWeight="bold">DOWNTOWN</text>

              {/* Legendary Dealership */}
              <rect x="255" y="75" width="70" height="70" fill="#450a0a" rx="4" stroke="#dc2626" strokeWidth="1" />
              <text x="290" y="115" fill="#f87171" fontSize="8" textAnchor="middle" fontWeight="bold">DEALERSHIP</text>

              {/* Pay 'n' Spray Garage */}
              <rect x="255" y="175" width="70" height="70" fill="#172554" rx="4" stroke="#2563eb" strokeWidth="1" />
              <text x="290" y="215" fill="#60a5fa" fontSize="8" textAnchor="middle" fontWeight="bold">GARAGE</text>

              {/* Hospital Ward */}
              <rect x="75" y="75" width="50" height="50" fill="#881337" rx="4" stroke="#f43f5e" strokeWidth="1" />
              <text x="100" y="105" fill="#fb7185" fontSize="7" textAnchor="middle" fontWeight="bold">HOSPITAL</text>
            </g>

            {[
              { x: -20, z: -90, label: 'FINANCIAL DISTRICT' },
              { x: -110, z: 120, label: 'PORT VICE' },
              { x: 100, z: 140, label: 'MARINA' },
              { x: 180, z: -300, label: 'FRESH MARKET' },
              { x: 0, z: 315, label: 'SUNSET BEACH' },
              { x: 325, z: -170, label: 'AIRPORT' },
              { x: 325, z: 120, label: 'FARMS' },
              { x: -1200, z: -900, label: 'STADIUM' },
              { x: -900, z: -900, label: 'UNIVERSITY' },
              { x: 0, z: -1000, label: 'CASTLE' },
              { x: 900, z: -600, label: 'AIR BASE' },
              { x: -900, z: 0, label: 'OLD MARKET' },
              { x: -900, z: 900, label: 'SOUTHSIDE' },
              { x: 0, z: 900, label: 'GRAND PARK' },
              { x: 900, z: 700, label: 'VILLAS' }
            ].map((district) => {
              const point = worldToMap(district.x, district.z);
              return (
                <g key={district.label}>
                  <circle cx={point.x} cy={point.y} r="2.5" fill="#f59e0b" stroke="#fef3c7" strokeWidth="0.8" />
                  <text x={point.x} y={point.y - 4} fill="#fcd34d" fontSize="7" textAnchor="middle" fontWeight="bold">
                    {district.label}
                  </text>
                </g>
              );
            })}

            {/* GPS Route Line if active */}
            {(waypointMap || missionMap) && (
              <line
                x1={playerMap.x}
                y1={playerMap.y}
                x2={(missionMap || waypointMap)!.x}
                y2={(missionMap || waypointMap)!.y}
                stroke={missionMap ? '#facc15' : '#38bdf8'}
                strokeWidth="3"
                strokeDasharray="6,4"
              />
            )}

            {/* Target Waypoint Pin */}
            {waypointMap && (
              <g transform={`translate(${waypointMap.x}, ${waypointMap.y})`}>
                <circle r="8" fill="#0284c7" opacity="0.3" className="animate-ping" />
                <circle r="5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
              </g>
            )}

            {/* Active Mission Pin */}
            {missionMap && (
              <g transform={`translate(${missionMap.x}, ${missionMap.y})`}>
                <circle r="9" fill="#eab308" opacity="0.4" className="animate-ping" />
                <polygon points="0,-8 6,4 -6,4" fill="#facc15" stroke="#000" strokeWidth="1" />
              </g>
            )}

            {/* Player Location Marker */}
            <g transform={`translate(${playerMap.x}, ${playerMap.y})`}>
              <circle r="7" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
              <circle r="2.5" fill="#ffffff" />
            </g>
          </svg>

          {/* Legend Overlay */}
          <div className="absolute bottom-2 left-2 right-2 bg-slate-900/90 backdrop-blur-xs border border-slate-800 p-2 rounded text-[10px] flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> You</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Safehouse</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-400 inline-block" /> GPS Waypoint</span>
            <span className="text-[9px] text-slate-400">Tap to set GPS</span>
          </div>
        </div>
      ) : (
        /* Mode 2: Multi-Floor Building Blueprint */
        <div className="relative flex-1 bg-slate-950 flex flex-col p-3 overflow-hidden">
          {/* Floor Level Selector */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="text-xs font-bold text-amber-300">GRAND TOWER RESIDENCES</div>
            <div className="flex items-center gap-1">
              {[1, 2, 3].map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    setBlueprintFloor(f);
                    audioManager.playPhoneBeep();
                  }}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition ${
                    blueprintFloor === f
                      ? 'bg-amber-500 text-black'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Floor {f}
                </button>
              ))}
            </div>
          </div>

          {/* Architectural Blueprint Schematic */}
          <div className="flex-1 relative flex items-center justify-center p-2">
            <svg viewBox="0 0 320 280" className="w-full h-full border border-sky-900/60 rounded-xl bg-slate-900/80">
              {/* Grid Background */}
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.8" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* FLOOR 1: LOBBY & RECEPTION */}
              {blueprintFloor === 1 && (
                <g>
                  {/* Outer Wall */}
                  <rect x="30" y="20" width="260" height="240" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.5" rx="4" />
                  {/* Reception Area */}
                  <rect x="110" y="50" width="100" height="30" fill="#1e293b" stroke="#38bdf8" strokeWidth="1" />
                  <text x="160" y="70" fill="#94a3b8" fontSize="9" textAnchor="middle" fontWeight="bold">RECEPTION CONCIERGE</text>

                  {/* Lounge Area */}
                  <rect x="50" y="110" width="90" height="70" fill="#1e293b" stroke="#38bdf8" strokeWidth="1" />
                  <text x="95" y="145" fill="#38bdf8" fontSize="8" textAnchor="middle">GUEST LOUNGE</text>
                  <text x="95" y="160" fill="#64748b" fontSize="7" textAnchor="middle">Sofa & Coffee Table</text>

                  {/* Elevator Shaft */}
                  <rect x="50" y="40" width="45" height="45" fill="#312e81" stroke="#818cf8" strokeWidth="1.5" />
                  <text x="72" y="66" fill="#a5b4fc" fontSize="8" textAnchor="middle" fontWeight="bold">ELEVATOR</text>

                  {/* Stairwell */}
                  <rect x="220" y="40" width="55" height="70" fill="#1e1b4b" stroke="#818cf8" strokeWidth="1" />
                  <text x="247" y="80" fill="#a5b4fc" fontSize="8" textAnchor="middle">STAIRS</text>

                  {/* Double Entrance Doors */}
                  <line x1="130" y1="260" x2="190" y2="260" stroke="#22c55e" strokeWidth="3" />
                  <text x="160" y="250" fill="#4ade80" fontSize="8" textAnchor="middle" fontWeight="bold">MAIN ENTRANCE</text>
                </g>
              )}

              {/* FLOOR 2: LUXURY PENTHOUSE */}
              {blueprintFloor === 2 && (
                <g>
                  {/* Outer Wall */}
                  <rect x="30" y="20" width="260" height="240" fill="#0f172a" stroke="#f59e0b" strokeWidth="2.5" rx="4" />

                  {/* Master Bedroom & Bed */}
                  <rect x="40" y="30" width="100" height="90" fill="#1e293b" stroke="#f59e0b" strokeWidth="1" />
                  <rect x="60" y="45" width="60" height="45" fill="#451a03" stroke="#f59e0b" strokeWidth="1" />
                  <text x="90" y="72" fill="#fcd34d" fontSize="8" textAnchor="middle" fontWeight="bold">KING BED (REST)</text>
                  <text x="90" y="110" fill="#94a3b8" fontSize="8" textAnchor="middle">MASTER SUITE</text>

                  {/* Walk-in Wardrobe */}
                  <rect x="150" y="30" width="60" height="90" fill="#1e293b" stroke="#f59e0b" strokeWidth="1" />
                  <text x="180" y="70" fill="#a855f7" fontSize="8" textAnchor="middle" fontWeight="bold">WARDROBE</text>
                  <text x="180" y="85" fill="#64748b" fontSize="7" textAnchor="middle">Customizer</text>

                  {/* Bathroom Spa & Shower */}
                  <rect x="220" y="30" width="60" height="90" fill="#1e293b" stroke="#06b6d4" strokeWidth="1" />
                  <text x="250" y="70" fill="#67e8f9" fontSize="8" textAnchor="middle" fontWeight="bold">SPA BATH</text>
                  <text x="250" y="85" fill="#64748b" fontSize="7" textAnchor="middle">Shower [F]</text>

                  {/* Living Room & 65" TV */}
                  <rect x="40" y="130" width="130" height="120" fill="#1e293b" stroke="#f59e0b" strokeWidth="1" />
                  <text x="105" y="175" fill="#fcd34d" fontSize="9" textAnchor="middle" fontWeight="bold">LIVING ROOM</text>
                  <text x="105" y="195" fill="#94a3b8" fontSize="8" textAnchor="middle">65" OLED TV & Lounge</text>

                  {/* Kitchen & Island Fridge */}
                  <rect x="180" y="130" width="100" height="120" fill="#1e293b" stroke="#10b981" strokeWidth="1" />
                  <text x="230" y="175" fill="#6ee7b7" fontSize="9" textAnchor="middle" fontWeight="bold">CHEF KITCHEN</text>
                  <text x="230" y="195" fill="#94a3b8" fontSize="8" textAnchor="middle">Fridge & Island [F]</text>
                </g>
              )}

              {/* FLOOR 3: ROOFTOP HELIPAD */}
              {blueprintFloor === 3 && (
                <g>
                  {/* Outer Wall */}
                  <rect x="30" y="20" width="260" height="240" fill="#0f172a" stroke="#ec4899" strokeWidth="2.5" rx="4" />
                  {/* Helipad Circle & H */}
                  <circle cx="160" cy="140" r="70" fill="#1e293b" stroke="#ec4899" strokeWidth="3" />
                  <circle cx="160" cy="140" r="50" fill="none" stroke="#ec4899" strokeWidth="1.5" strokeDasharray="6,4" />
                  <text x="160" y="155" fill="#f472b6" fontSize="42" textAnchor="middle" fontWeight="black" fontFamily="sans-serif">H</text>
                  <text x="160" y="235" fill="#f472b6" fontSize="9" textAnchor="middle" fontWeight="bold">ROOFTOP HELIPAD & LOUNGE</text>
                </g>
              )}
            </svg>
          </div>

          {/* Blueprint Details */}
          <div className="p-2 bg-slate-900/90 rounded-xl border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
            <span>You are currently on: <strong className="text-amber-400">Floor {currentFloor}</strong></span>
            <span className="text-[10px] text-slate-400">Elevator access on west wall</span>
          </div>
        </div>
      )}
    </div>
  );
};
