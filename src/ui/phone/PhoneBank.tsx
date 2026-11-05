import React from 'react';
import { Landmark, ArrowUpRight, ArrowDownLeft, Wallet, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useGameStore } from '../../core/gameState';
import { audioManager } from '../../core/AudioManager';

export const PhoneBank: React.FC = () => {
  const cash = useGameStore((s) => s.cash);
  const transactions = useGameStore((s) => s.transactions);
  const unpaidFines = useGameStore((s) => s.unpaidFines);
  const payFines = useGameStore((s) => s.payFines);
  const showNotification = useGameStore((s) => s.showNotification);

  const handlePayFines = () => {
    if (unpaidFines <= 0) return;
    const success = payFines();
    if (success) {
      audioManager.playCashRegister();
      showNotification('Traffic citations cleared with Vice Bay Municipal Court!');
    } else {
      showNotification('Insufficient funds to pay citations!');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white select-none">
      <div className="px-4 py-2.5 bg-red-950/80 border-b border-red-900/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Landmark className="w-4 h-4 text-red-400" />
          <span className="text-xs font-bold font-game tracking-wider text-red-300">MAZE BANK MOBILE</span>
        </div>
        <span className="text-[10px] text-red-300 font-mono">ONLINE</span>
      </div>

      {/* Account Balance Card */}
      <div className="p-4 bg-gradient-to-br from-red-900/40 to-slate-900 border-b border-slate-800 space-y-1">
        <div className="text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Wallet className="w-3 h-3 text-red-400" /> Checking Account Balance
        </div>
        <div className="text-2xl font-black font-mono tracking-tight text-emerald-400">
          ${cash.toLocaleString()}
        </div>
        <div className="text-[10px] text-slate-400 font-mono">Acc # ···· 8842 · Verified Member</div>
      </div>

      {/* Outstanding Citations Card */}
      {unpaidFines > 0 ? (
        <div className="m-3 p-3 bg-red-950/60 border border-red-500/50 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-red-400">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <span>Municipal Traffic Fines</span>
            </div>
            <span className="text-xs font-mono font-bold text-red-300">${unpaidFines.toLocaleString()}</span>
          </div>
          <p className="text-[11px] text-slate-300">
            Unpaid citations may trigger police warrant alerts. Settle online now.
          </p>
          <button
            onClick={handlePayFines}
            className="w-full py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition active:scale-95 shadow"
          >
            Pay Citations (${unpaidFines.toLocaleString()})
          </button>
        </div>
      ) : (
        <div className="mx-3 mt-3 p-2.5 bg-emerald-950/30 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-300 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>No outstanding fines. Clean municipal driving record.</span>
        </div>
      )}

      {/* Transaction History */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 phone-scroll">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">Recent Activity</div>

        {transactions.map((tx) => (
          <div
            key={tx.id}
            className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800/80 flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center ${
                  tx.type === 'credit' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                }`}
              >
                {tx.type === 'credit' ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-200">{tx.description}</div>
                <div className="text-[10px] text-slate-500">{tx.date}</div>
              </div>
            </div>

            <div
              className={`font-mono text-xs font-bold ${
                tx.type === 'credit' ? 'text-emerald-400' : 'text-slate-300'
              }`}
            >
              {tx.type === 'credit' ? '+' : ''}${Math.abs(tx.amount).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
