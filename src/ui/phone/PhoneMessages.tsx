import React from 'react';
import { useGameStore } from '../../core/gameState';
import { MessageSquare, ArrowRight, CheckCheck, Lock } from 'lucide-react';
import { audioManager } from '../../core/AudioManager';

interface PhoneMessagesProps {
  onAcceptMission: (missionId: string) => void;
}

export const PhoneMessages: React.FC<PhoneMessagesProps> = ({ onAcceptMission }) => {
  const messages = useGameStore((s) => s.messages);
  const markMessagesRead = useGameStore((s) => s.markMessagesRead);
  const activeMission = useGameStore((s) => s.activeMission);
  const storyChapter = useGameStore((s) => s.storyChapter);
  const pendingStoryChoice = useGameStore((s) => s.pendingStoryChoice);
  const completedStoryMissions = useGameStore((s) => s.completedStoryMissions);

  React.useEffect(() => {
    markMessagesRead();
  }, [markMessagesRead]);

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white select-none">
      <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold font-game tracking-wider text-emerald-400">MESSAGES</span>
        </div>
        <span className="text-[10px] text-slate-400">{messages.length} threads</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 phone-scroll">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2 hover:border-slate-700 transition"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-xs">
                  {msg.avatar}
                </div>
                <span className="text-xs font-semibold text-slate-200">{msg.sender}</span>
              </div>
              <span className="text-[10px] text-slate-500">{msg.time}</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">{msg.text}</p>

            {msg.missionId && (
              <div className="pt-1 border-t border-slate-800/80">
                {activeMission?.id === msg.missionId ? (
                  <div className="flex items-center gap-1.5 text-xs text-amber-400 font-medium">
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mission Active</span>
                  </div>
                ) : msg.storyChapter !== undefined && msg.storyChapter > storyChapter ? (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Chapter {msg.storyChapter} · Complete earlier story leads to unlock</span>
                  </div>
                ) : completedStoryMissions.includes(msg.missionId) ? (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Story mission complete</span>
                  </div>
                ) : (
                  <button
                    disabled={!!activeMission || !!pendingStoryChoice}
                    onClick={() => {
                      onAcceptMission(msg.missionId!);
                      audioManager.playPhoneBeep();
                    }}
                    className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
                  >
                    <span>{pendingStoryChoice ? 'Resolve story choice first' : activeMission ? 'Finish active mission first' : 'Accept Mission'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
