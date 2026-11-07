import React from 'react';
import { useGameStore } from '../core/gameState';

export const Minimap: React.FC = () => {
  const playerPos = useGameStore((s) => s.playerPos);
  const playerHeading = useGameStore((s) => s.playerHeading);
  const customWaypoint = useGameStore((s) => s.customWaypoint);
  const activeMission = useGameStore((s) => s.activeMission);
  const wantedLevel = useGameStore((s) => s.wantedLevel);

  // Radar radius in world meters
  const radarRange = 90;
  const radiusPx = 64; // 128x128 circle

  // Convert world delta to radar pixels relative to center
  const toRadar = (worldX: number, worldZ: number) => {
    const dx = worldX - playerPos[0];
    const dz = worldZ - playerPos[2];

    // Rotate by negative camera heading so forward is always UP
    const cos = Math.cos(-playerHeading);
    const sin = Math.sin(-playerHeading);

    const rotX = dx * cos - dz * sin;
    const rotZ = dx * sin + dz * cos;

    const scale = radiusPx / radarRange;
    const px = 64 + rotX * scale;
    const py = 64 + rotZ * scale;

    return { x: px, y: py };
  };

  const nearbyRoads = (coordinate: number) => {
    const nearestRoad = 60 + Math.round((coordinate - 60) / 100) * 100;
    return [-2, -1, 0, 1, 2].map((offset) => nearestRoad + offset * 100);
  };

  const wpRadar = customWaypoint ? toRadar(customWaypoint[0], customWaypoint[2]) : null;
  const missionRadar = activeMission ? toRadar(activeMission.targetPos[0], activeMission.targetPos[2]) : null;

  return (
    <div className="relative w-32 h-32 rounded-full border-2 border-slate-700 bg-slate-950/90 shadow-2xl shadow-black overflow-hidden select-none">
      <svg viewBox="0 0 128 128" className="w-full h-full">
        {/* Ocean boundary if close */}
        {playerPos[2] > 350 && playerPos[2] < 550 && Math.abs(playerPos[0]) < 450 && (
          <rect x="-50" y="90" width="220" height="60" fill="#0284c7" opacity="0.4" />
        )}

        {/* Road Grid Lines rotated with player camera */}
        {nearbyRoads(playerPos[2]).map((rz) => {
          const p1 = toRadar(playerPos[0] - 200, rz);
          const p2 = toRadar(playerPos[0] + 200, rz);
          return (
            <line
              key={`rz_${rz}`}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke="#475569"
              strokeWidth="5"
              strokeLinecap="round"
            />
          );
        })}

        {nearbyRoads(playerPos[0]).map((rx) => {
          const p1 = toRadar(rx, playerPos[2] - 200);
          const p2 = toRadar(rx, playerPos[2] + 200);
          return (
            <line
              key={`rx_${rx}`}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke="#475569"
              strokeWidth="5"
              strokeLinecap="round"
            />
          );
        })}

        {/* Radar concentric rings */}
        <circle cx="64" cy="64" r="32" fill="none" stroke="#334155" strokeWidth="0.8" strokeDasharray="3,3" />
        <circle cx="64" cy="64" r="63" fill="none" stroke="#475569" strokeWidth="1.5" />

        {/* Police Search Radius pulse when wanted */}
        {wantedLevel > 0 && (
          <circle
            cx="64"
            cy="64"
            r="42"
            fill="none"
            stroke="#ef4444"
            strokeWidth="1.5"
            className="animate-ping"
            opacity="0.6"
          />
        )}

        {/* Custom Waypoint Pin */}
        {wpRadar && (
          <circle cx={wpRadar.x} cy={wpRadar.y} r="3.5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1" />
        )}

        {/* Mission Pin */}
        {missionRadar && (
          <circle cx={missionRadar.x} cy={missionRadar.y} r="4.5" fill="#facc15" stroke="#000000" strokeWidth="1" />
        )}

        {/* Player Heading Arrow at Center */}
        <polygon points="64,57 60,70 64,67 68,70" fill="#3b82f6" stroke="#ffffff" strokeWidth="1" />
      </svg>

      {/* North Indicator */}
      <div
        className="absolute w-4 h-4 text-[9px] font-bold text-red-500 font-mono flex items-center justify-center pointer-events-none"
        style={{
          top: `${64 - Math.cos(-playerHeading) * 52 - 8}px`,
          left: `${64 + Math.sin(-playerHeading) * 52 - 8}px`
        }}
      >
        N
      </div>
    </div>
  );
};
