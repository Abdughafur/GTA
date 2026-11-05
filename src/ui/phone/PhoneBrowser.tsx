import React, { useState } from 'react';
import { Globe, ShoppingBag, Home, Newspaper, CheckCircle, Car } from 'lucide-react';
import { useGameStore } from '../../core/gameState';
import { audioManager } from '../../core/AudioManager';

interface PhoneBrowserProps {
  onSpawnCar: (type: 'sports' | 'suv' | 'sedan', colorHex: number) => void;
}

export const PhoneBrowser: React.FC<PhoneBrowserProps> = ({ onSpawnCar }) => {
  const [activeTab, setActiveTab] = useState<'motors' | 'realestate' | 'news'>('motors');
  const [purchaseMsg, setPurchaseMsg] = useState<string | null>(null);
  const cash = useGameStore((s) => s.cash);
  const spendCash = useGameStore((s) => s.spendCash);
  const ownedProperties = useGameStore((s) => s.ownedProperties);
  const purchaseProperty = useGameStore((s) => s.purchaseProperty);
  const sleep = useGameStore((s) => s.sleep);
  const wantedLevel = useGameStore((s) => s.wantedLevel);

  const cars = [
    {
      id: 'sports',
      name: 'Infernus Spyder GT',
      type: 'sports' as const,
      price: 3500,
      colorHex: 0xef4444,
      colorName: 'Apex Crimson',
      topSpeed: '142 MPH',
      accel: '3.1s'
    },
    {
      id: 'suv',
      name: 'Mammoth Patriot AWD',
      type: 'suv' as const,
      price: 2800,
      colorHex: 0x10b981,
      colorName: 'Emerald Olive',
      topSpeed: '115 MPH',
      accel: '4.8s'
    },
    {
      id: 'sedan',
      name: 'V-Bay Executive Limousine',
      type: 'sedan' as const,
      price: 1800,
      colorHex: 0x3b82f6,
      colorName: 'Marina Blue',
      topSpeed: '120 MPH',
      accel: '4.2s'
    }
  ];

  const handleBuyCar = (car: typeof cars[0]) => {
    if (cash >= car.price) {
      if (spendCash(car.price)) {
        onSpawnCar(car.type, car.colorHex);
        setPurchaseMsg(`Purchased ${car.name}! Spawning outside.`);
        audioManager.playCashRegister();
        setTimeout(() => setPurchaseMsg(null), 3000);
      }
    } else {
      setPurchaseMsg('Insufficient funds in Maze Bank account!');
      setTimeout(() => setPurchaseMsg(null), 2500);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white select-none">
      {/* Browser Bar */}
      <div className="p-2 bg-slate-900 border-b border-slate-800 space-y-1.5">
        <div className="flex items-center gap-2 bg-slate-950 px-2.5 py-1 rounded-md text-[11px] text-slate-400">
          <Globe className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span className="truncate">www.eyefind.info/{activeTab}</span>
        </div>

        {/* Tab Buttons */}
        <div className="grid grid-cols-3 gap-1 text-[11px]">
          <button
            onClick={() => setActiveTab('motors')}
            className={`py-1 rounded flex items-center justify-center gap-1 font-semibold transition ${
              activeTab === 'motors' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-300'
            }`}
          >
            <Car className="w-3 h-3" /> Motors
          </button>
          <button
            onClick={() => setActiveTab('realestate')}
            className={`py-1 rounded flex items-center justify-center gap-1 font-semibold transition ${
              activeTab === 'realestate' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300'
            }`}
          >
            <Home className="w-3 h-3" /> Realty
          </button>
          <button
            onClick={() => setActiveTab('news')}
            className={`py-1 rounded flex items-center justify-center gap-1 font-semibold transition ${
              activeTab === 'news' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300'
            }`}
          >
            <Newspaper className="w-3 h-3" /> News
          </button>
        </div>
      </div>

      {purchaseMsg && (
        <div className="m-2 p-2 bg-amber-500/20 border border-amber-500/50 rounded text-center text-xs font-semibold text-amber-300 animate-fade-in">
          {purchaseMsg}
        </div>
      )}

      {/* Website Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 phone-scroll">
        {activeTab === 'motors' && (
          <div className="space-y-3">
            <div className="bg-gradient-to-r from-red-950 to-slate-900 p-2.5 rounded-xl border border-red-900/60 text-center">
              <span className="font-game font-bold text-sm tracking-wider text-red-400">LEGENDARY MOTORSPORT</span>
              <p className="text-[10px] text-slate-400">Direct courier delivery anywhere in Vice Bay.</p>
            </div>

            {cars.map((car) => (
              <div key={car.id} className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-100">{car.name}</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">${car.price.toLocaleString()}</span>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  <span>Top: {car.topSpeed}</span>
                  <span>·</span>
                  <span>0-60: {car.accel}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: car.colorName.includes('Crimson') ? '#ef4444' : car.colorName.includes('Olive') ? '#10b981' : '#3b82f6' }} />
                    {car.colorName}
                  </span>
                </div>

                <button
                  onClick={() => handleBuyCar(car)}
                  className="w-full py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition active:scale-95 flex items-center justify-center gap-1"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  Order & Deliver
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'realestate' && (
          <div className="space-y-3">
            <div className="bg-gradient-to-r from-amber-950 to-slate-900 p-2.5 rounded-xl border border-amber-900/60 text-center">
              <span className="font-game font-bold text-sm tracking-wider text-amber-400">DYNASTY 8 REAL ESTATE</span>
              <p className="text-[10px] text-slate-400">Luxury high-rise penthouses & estates.</p>
            </div>

            <div className="p-3 bg-slate-900/80 rounded-xl border border-emerald-800/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-100">Little Havana Studio</span>
                <span className="text-xs font-mono font-bold text-emerald-400">$12,000</span>
              </div>
              <p className="text-[11px] text-slate-400">A modest first home with a safe bed and a place to plan your next move.</p>
              {ownedProperties.includes('little-havana-studio') ? (
                <button
                  onClick={() => {
                    sleep();
                    setPurchaseMsg('You rested at home. Energy restored and the clock moved forward.');
                    setTimeout(() => setPurchaseMsg(null), 3000);
                  }}
                  className="w-full rounded-lg bg-emerald-700 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-600"
                >
                  Rest at home
                </button>
              ) : (
                <button
                  disabled={cash < 12000}
                  onClick={() => {
                    if (purchaseProperty('little-havana-studio', 12000)) {
                      setPurchaseMsg('Keys collected. Your studio is now a place to rest.');
                    } else {
                      setPurchaseMsg('You need $12,000 for the studio.');
                    }
                    setTimeout(() => setPurchaseMsg(null), 3000);
                  }}
                  className="w-full rounded-lg bg-emerald-700 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
                >
                  Buy first home
                </button>
              )}
            </div>

            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-100">Maze Tower Penthouse</span>
                <span className="text-xs font-mono font-bold text-amber-400">$2,500,000</span>
              </div>
              <p className="text-[11px] text-slate-400">Rooftop helipad, 360-degree glass ocean panorama, 10-car underground garage.</p>
              <div className="text-[10px] text-slate-500 italic">Reserved for VIP Syndicate members</div>
            </div>

            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-100">Vice Marina Villa</span>
                <span className="text-xs font-mono font-bold text-amber-400">$1,200,000</span>
              </div>
              <p className="text-[11px] text-slate-400">Private dock berth, infinity pool, palm garden terrace.</p>
              <div className="text-[10px] text-slate-500 italic">Under contract</div>
            </div>
          </div>
        )}

        {activeTab === 'news' && (
          <div className="space-y-3">
            <div className="bg-gradient-to-r from-sky-950 to-slate-900 p-2.5 rounded-xl border border-sky-900/60 text-center">
              <span className="font-game font-bold text-sm tracking-wider text-sky-400">WEAZEL NEWS LIVE</span>
              <p className="text-[10px] text-slate-400">The pulse of Vice Bay, 24/7.</p>
            </div>

            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1.5">
              <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider">
                {wantedLevel > 0 ? 'BREAKING: ACTIVE POLICE PURSUIT' : 'LOCAL HEADLINE'}
              </div>
              <div className="text-xs font-bold text-slate-100">
                {wantedLevel > 0
                  ? `Police cruisers deployed across downtown chasing suspect with ${wantedLevel}-star wanted rating!`
                  : 'Neon Sprint street racing tournament draws elite drivers across the metropolis.'}
              </div>
              <p className="text-[11px] text-slate-400">
                Citizens are advised to obey traffic signals, yield to emergency sirens, and report suspicious supercars.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
