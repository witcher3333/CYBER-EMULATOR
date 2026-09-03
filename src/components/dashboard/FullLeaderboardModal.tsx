import React from 'react';
import { Trophy } from 'lucide-react';
import { LeaderboardPlayer, FloatingEmoji, FloatingStat } from '@/types/dashboard';
import { LeaderboardItem } from './LeaderboardItem';

export const FullLeaderboardModal = ({
  isOpen,
  onClose,
  leaderboard,
  floatingEmojis,
  floatingStats,
  selectedTarget,
  setSelectedTarget
}: {
  isOpen: boolean;
  onClose: () => void;
  leaderboard: LeaderboardPlayer[];
  floatingEmojis: FloatingEmoji[];
  floatingStats?: FloatingStat[];
  selectedTarget: LeaderboardPlayer | null;
  setSelectedTarget: (p: LeaderboardPlayer) => void;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[82vh] bg-[#0a030d] border border-[#ff0055]/40 rounded-3xl p-6 flex flex-col shadow-[0_0_50px_rgba(255,0,85,0.2)]">
        <div className="flex items-center justify-between mb-5 pb-4 border-b border-[#ff0055]/30">
          <h2 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#ff0055]" />
            FULL LEADERBOARD
            <span className="text-xs font-mono text-zinc-400 font-normal">({leaderboard.length} operants)</span>
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#1e0720] border border-[#ff0055]/30 text-[#ff0055] hover:bg-[#ff0055] hover:text-white transition-all cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 2L14 14M14 2L2 14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#ff0055 #1e0720' }}>
          {leaderboard.map((player) => (
            <LeaderboardItem 
              key={player.empId}
              player={player}
              floatingEmojis={floatingEmojis}
              floatingStats={floatingStats}
              mini={false}
              selectedTarget={selectedTarget}
              setSelectedTarget={setSelectedTarget}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
