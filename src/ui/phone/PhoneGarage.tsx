import React from 'react';
import { Car, Fuel, Gauge, Sparkles, Send } from 'lucide-react';
import { useGameStore } from '../../core/gameState';
import { audioManager } from '../../core/AudioManager';

interface PhoneGarageProps {
  onSpawnCar: (type: 'sports' | 'suv' | 'sedan' | 'taxi' | 'ambulance', colorHex: number) => void;
}

export const PhoneGarage: React.FC<PhoneGarageProps> = ({ onSpawnCar }) => {
  const isInVehicle = useGameStore((s) => s.isInVehicle);
  const currentVehicleName = useGameStore((s) => s.currentVehicleName);
  const vehicleFuel = useGameStore((s) => s.vehicleFuel);
  const vehicleHealth = useGameStore((s) => s.vehicleHealth);
  const vehicleOdometer = useGameStore((s) => s.vehicleOdometer);
  const vehicleCustomization = useGameStore((s) => s.vehicleCustomization);
  const customizeVehicle = useGameStore((s) => s.customizeVehicle);
  const spendCash = useGameStore((s) => s.spendCash);
  const showNotification = useGameStore((s) => s.showNotification);

  const garageFleet = [
    {
      id: 'infernus',
      name: 'Infernus GT Supercar',
      type: 'sports' as const,
      colorHex: 0xdc2626,
      topSpeed: '142 MPH',
      status: isInVehicle && currentVehicleName.includes('Infernus') ? 'In Use' : 'Ready in Garage'
    },
    {
      id: 'patriot',
      name: 'Mammoth Patriot AWD',
      type: 'suv' as const,
      colorHex: 0x10b981,
      topSpeed: '115 MPH',
      status: 'Ready in Garage'
    },
    {
      id: 'taxi_cab',
      name: 'Vice Bay Taxi Cruiser',
      type: 'taxi' as const,
      colorHex: 0xfacc15,
      topSpeed: '110 MPH',
      status: 'Commercial Fleet'
    },
    {
      id: 'ambulance_medic',
      name: 'VCPD Paramedic Ambulance',
      type: 'ambulance' as const,
      colorHex: 0xf8fafc,
      topSpeed: '105 MPH',
      status: 'Emergency Fleet'
    }
  ];

  const handleValetDelivery = (veh: typeof garageFleet[0]) => {
    onSpawnCar(veh.type, veh.colorHex);
    showNotification(`Valet dispatching ${veh.name} to your coordinates!`);
    audioManager.playPhoneBeep();
  };

  const handleTuneToggle = (setting: 'turbo' | 'underglow') => {
    if (setting === 'turbo') {
      const next = vehicleCustomization.turboLevel === 2 ? 0 : 2;
      if (next > 0 && !spendCash(4500)) {
        showNotification('Turbo stage 2 costs $4,500. Earn more cash first.');
        return;
      }
      customizeVehicle({ turboLevel: next });
      showNotification(next === 2 ? 'Stage 2 Turbo fitted · $4,500' : 'Turbo returned to stock');
    } else {
      const next = !vehicleCustomization.neonUnderglow;
      if (next && !spendCash(850)) {
        showNotification('Neon underglow installation costs $850.');
        return;
      }
      customizeVehicle({ neonUnderglow: next });
      showNotification(next ? 'Neon underglow installed · $850' : 'Neon underglow switched off');
    }
    audioManager.playCashRegister();
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white select-none">
      {/* Header */}
      <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Car className="w-4 h-4 text-rose-400" />
          <span className="text-xs font-bold font-game tracking-wider text-rose-300">ABDUGARAGE VALET</span>
        </div>
        <span className="text-[10px] text-slate-400">{garageFleet.length} Vehicles</span>
      </div>

      {/* Active Vehicle Telemetry Banner */}
      {isInVehicle && (
        <div className="p-3 bg-slate-900/80 border-b border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-100">
            <span>{currentVehicleName}</span>
            <span className="text-emerald-400 font-mono">{vehicleHealth}% HP</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="flex items-center gap-1.5 text-slate-300 bg-slate-950 px-2 py-1 rounded">
              <Fuel className="w-3.5 h-3.5 text-amber-400" />
              <span>Fuel: {Math.round(vehicleFuel)}%</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300 bg-slate-950 px-2 py-1 rounded">
              <Gauge className="w-3.5 h-3.5 text-sky-400" />
              <span>Odo: {vehicleOdometer} mi</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => handleTuneToggle('turbo')}
              className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded text-[10px] font-bold border border-slate-700"
            >
              Turbo: {vehicleCustomization.turboLevel > 0 ? 'Stage 2' : 'Stock'} · $4.5K
            </button>
            <button
              onClick={() => handleTuneToggle('underglow')}
              className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded text-[10px] font-bold border border-slate-700"
            >
              Underglow: {vehicleCustomization.neonUnderglow ? 'ON' : 'OFF'} · $850
            </button>
          </div>
        </div>
      )}

      {/* Fleet Vehicles */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 phone-scroll">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">Valet Fleet</div>

        {garageFleet.map((v) => (
          <div
            key={v.id}
            className="p-3 bg-slate-900/70 border border-slate-800 rounded-xl space-y-2 hover:border-slate-700 transition"
          >
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-100">{v.name}</div>
              <span className="text-[10px] font-mono text-slate-400">{v.topSpeed}</span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-slate-400">{v.status}</span>
              <button
                onClick={() => handleValetDelivery(v)}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition active:scale-95"
              >
                <Send className="w-3 h-3" />
                <span>Call Valet</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
