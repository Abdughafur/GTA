import React from 'react';
import { Briefcase, Car, Package, HeartPulse, Wrench, CheckCircle, Clock } from 'lucide-react';
import { useGameStore, JobType } from '../../core/gameState';
import { audioManager } from '../../core/AudioManager';

interface PhoneJobsProps {
  onDispatchJob: (job: JobType) => void;
}

export const PhoneJobs: React.FC<PhoneJobsProps> = ({ onDispatchJob }) => {
  const activeJob = useGameStore((s) => s.activeJob);
  const startJob = useGameStore((s) => s.startJob);
  const stopJob = useGameStore((s) => s.stopJob);
  const jobScore = useGameStore((s) => s.jobScore);
  const activePassenger = useGameStore((s) => s.activePassenger);

  const jobsList = [
    {
      id: 'taxi' as JobType,
      title: 'Downtown Taxi Driver',
      icon: <Car className="w-5 h-5 text-amber-400" />,
      color: 'border-amber-500/40 bg-amber-950/20',
      description: 'Pick up stranded citizens across Vice Bay and deliver them before the fare timer expires.',
      pay: '$450 - $950 / fare',
      vehicleReq: 'Yellow Taxi or Sedan'
    },
    {
      id: 'delivery' as JobType,
      title: 'Fast Courier Logistics',
      icon: <Package className="w-5 h-5 text-emerald-400" />,
      color: 'border-emerald-500/40 bg-emerald-950/20',
      description: 'Rush urgent documents and tech parcels to corporate skyscrapers and dock warehouses.',
      pay: '$600 - $1,200 / drop',
      vehicleReq: 'Any Vehicle'
    },
    {
      id: 'paramedic' as JobType,
      title: 'Emergency Paramedic',
      icon: <HeartPulse className="w-5 h-5 text-rose-400" />,
      color: 'border-rose-500/40 bg-rose-950/20',
      description: 'Respond to 911 trauma calls with the ambulance, stabilize patients, and transport to hospital.',
      pay: '$1,000 / rescue',
      vehicleReq: 'Hospital Ambulance'
    },
    {
      id: 'mechanic' as JobType,
      title: 'Mobile Roadside Mechanic',
      icon: <Wrench className="w-5 h-5 text-blue-400" />,
      color: 'border-blue-500/40 bg-blue-950/20',
      description: 'Provide emergency tire replacements and engine jumpstarts to broken civilian cars.',
      pay: '$550 / service',
      vehicleReq: 'Tow Truck / Utility'
    }
  ];

  const handleSelectJob = (job: JobType) => {
    if (activeJob === job) {
      stopJob();
      audioManager.playPhoneBeep();
    } else {
      startJob(job);
      onDispatchJob(job);
      audioManager.playCashRegister();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white select-none">
      {/* Header */}
      <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold font-game tracking-wider text-amber-300">ABDUJOBS CAREERS</span>
        </div>
        <div className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded">
          {jobScore} Fares Done
        </div>
      </div>

      {/* Active Job Status */}
      {activeJob !== 'none' && (
        <div className="p-3 bg-amber-500/10 border-b border-amber-500/30 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">CURRENT SHIFT: ON DUTY</div>
            <div className="text-xs font-bold text-slate-100 capitalize">{activeJob} Driver</div>
            {activePassenger && (
              <div className="text-[10px] text-slate-300 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>Passenger: {activePassenger.name} (${activePassenger.fare})</span>
              </div>
            )}
          </div>
          <button
            onClick={() => handleSelectJob(activeJob)}
            className="px-2.5 py-1 bg-red-600/80 hover:bg-red-500 text-white rounded text-[11px] font-bold transition active:scale-95"
          >
            Clock Out
          </button>
        </div>
      )}

      {/* Jobs Listing */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 phone-scroll">
        {jobsList.map((j) => {
          const isActive = activeJob === j.id;
          return (
            <div
              key={j.id}
              className={`p-3 rounded-xl border ${j.color} space-y-2 transition hover:brightness-110`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-slate-900/80">{j.icon}</div>
                  <div>
                    <div className="text-xs font-bold text-slate-100">{j.title}</div>
                    <div className="text-[10px] text-emerald-400 font-mono font-semibold">{j.pay}</div>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed">{j.description}</p>

              <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                <span className="text-[10px] text-slate-400">{j.vehicleReq}</span>
                <button
                  onClick={() => handleSelectJob(j.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition active:scale-95 flex items-center gap-1 ${
                    isActive
                      ? 'bg-red-600 text-white hover:bg-red-500'
                      : 'bg-amber-600 text-white hover:bg-amber-500'
                  }`}
                >
                  {isActive ? 'Clock Out' : 'Start Shift'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
