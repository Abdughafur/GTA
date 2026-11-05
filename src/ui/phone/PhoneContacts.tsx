import React, { useState } from 'react';
import { Phone, PhoneCall, PhoneOff, User } from 'lucide-react';
import { audioManager } from '../../core/AudioManager';
import { useGameStore } from '../../core/gameState';

interface Contact {
  name: string;
  role: string;
  number: string;
  avatarColor: string;
  dialogue: string;
  action?: () => void;
}

export const PhoneContacts: React.FC = () => {
  const [callingContact, setCallingContact] = useState<Contact | null>(null);
  const [callState, setCallState] = useState<'ringing' | 'connected' | 'idle'>('idle');
  const triggerCrime = useGameStore((s) => s.triggerCrime);

  const contacts: Contact[] = [
    {
      name: 'Vinnie (The Fixer)',
      role: 'Syndicate Boss',
      number: '555-0192',
      avatarColor: 'bg-purple-600',
      dialogue: 'Yo kid. Stick to the plan and check your SMS inbox. Vice Bay is ours for the taking.'
    },
    {
      name: 'T-Bone Racing',
      role: 'Underground Street Racer',
      number: '555-0841',
      avatarColor: 'bg-amber-600',
      dialogue: 'Got that engine purring? Neon Sprint race is waiting for you at the Grand Plaza.'
    },
    {
      name: 'Agent Miller',
      role: 'Undercover Contractor',
      number: '555-3310',
      avatarColor: 'bg-blue-600',
      dialogue: 'Keep it quiet. Infiltrate Legendary Motors and deliver the merchandise to the docks.'
    },
    {
      name: 'Emergency 911 Dispatch',
      role: 'City Services',
      number: '911',
      avatarColor: 'bg-red-600',
      dialogue: 'Vice City Police Department. Patrol units dispatched to your GPS location!',
      action: () => triggerCrime(1)
    },
    {
      name: 'Pay & Spray Helpline',
      role: 'Auto Repair & Tuning',
      number: '555-7729',
      avatarColor: 'bg-emerald-600',
      dialogue: 'Drive right into the garage bay on 4th Ave. $100 clears any police heat and repairs your ride.'
    }
  ];

  const handleCall = (contact: Contact) => {
    setCallingContact(contact);
    setCallState('ringing');
    audioManager.playPhoneBeep();

    setTimeout(() => {
      setCallState('connected');
      audioManager.playPhoneBeep();
      if (contact.action) contact.action();
    }, 1800);
  };

  const handleHangUp = () => {
    setCallingContact(null);
    setCallState('idle');
    audioManager.playPhoneBeep();
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white select-none">
      <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-bold font-game tracking-wider text-sky-400">CONTACTS</span>
        </div>
        <span className="text-[10px] text-slate-400">{contacts.length} entries</span>
      </div>

      {callState !== 'idle' && callingContact ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4 bg-slate-900/90">
          <div className={`w-16 h-16 rounded-full ${callingContact.avatarColor} flex items-center justify-center text-xl font-bold shadow-lg`}>
            {callingContact.name[0]}
          </div>

          <div>
            <h3 className="font-bold text-sm text-slate-100">{callingContact.name}</h3>
            <p className="text-xs text-slate-400">{callingContact.number}</p>
            <p className="text-xs text-sky-400 font-semibold mt-1">
              {callState === 'ringing' ? 'Calling...' : '00:08 Connected'}
            </p>
          </div>

          {callState === 'connected' && (
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-200 leading-relaxed italic">
              "{callingContact.dialogue}"
            </div>
          )}

          <button
            onClick={handleHangUp}
            className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center shadow-lg transition active:scale-95"
          >
            <PhoneOff className="w-5 h-5 text-white" />
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 phone-scroll">
          {contacts.map((contact, i) => (
            <div
              key={i}
              onClick={() => handleCall(contact)}
              className="p-2.5 bg-slate-900/60 hover:bg-slate-900 rounded-xl flex items-center justify-between cursor-pointer border border-transparent hover:border-slate-800 transition"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full ${contact.avatarColor} flex items-center justify-center font-bold text-xs`}>
                  {contact.name[0]}
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200">{contact.name}</div>
                  <div className="text-[10px] text-slate-400">{contact.role}</div>
                </div>
              </div>
              <div className="w-7 h-7 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition">
                <PhoneCall className="w-3.5 h-3.5" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
