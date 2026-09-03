import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MiniAvatar, AvatarSVG } from '@/components/Avatar';
import { LeaderboardPlayer, FloatingEmoji, FloatingStat } from '@/types/dashboard';

export const BADGE_COLORS = ['#ff0055', '#f59e0b', '#10b981', '#a855f7', '#3b82f6', '#14b8a6', '#ef4444'];

export const RANK_BADGE_STYLES: Record<number, string> = {
  1: 'bg-gradient-to-br from-yellow-400 to-amber-500 text-black shadow-[0_0_12px_rgba(251,191,36,0.6)]',
  2: 'bg-gradient-to-br from-zinc-300 to-zinc-400 text-black shadow-[0_0_8px_rgba(200,200,200,0.4)]',
  3: 'bg-gradient-to-br from-amber-700 to-amber-800 text-white shadow-[0_0_8px_rgba(180,100,40,0.4)]',
};

export const LeaderboardItem = ({ 
  player, 
  floatingEmojis, 
  floatingStats = [],
  mini = true,
  selectedTarget,
  setSelectedTarget
}: { 
  player: LeaderboardPlayer; 
  floatingEmojis: FloatingEmoji[]; 
  floatingStats?: FloatingStat[];
  mini?: boolean;
  selectedTarget?: LeaderboardPlayer | null;
  setSelectedTarget?: (p: LeaderboardPlayer) => void;
}) => {
  const rowEmojis = floatingEmojis.filter((e) => e.empId === player.empId);
  const rowStats = floatingStats.filter((s) => s.empId === player.empId);
  const badgeStyle = RANK_BADGE_STYLES[player.rank] || '';

  return (
    <div
      key={player.empId} 
      onClick={() => setSelectedTarget && setSelectedTarget(player)}
      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${selectedTarget?.empId === player.empId ? 'bg-red-900/40 border border-red-500' : 'bg-[#0a0a0a] border border-white/5 hover:bg-[#111]'} relative`}
    >
      <AnimatePresence>
        {rowEmojis.map((e) => (
          <motion.div
            key={e.id}
            initial={{ y: 0, opacity: 1, scale: 1 }}
            animate={{ y: -50, opacity: 0, scale: 1.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.6, ease: 'easeOut' }}
            className="absolute right-8 top-0 flex items-center gap-1.5 z-50 pointer-events-none drop-shadow-[0_0_10px_#ff0055]"
          >
            <span className="text-2xl">{e.emoji}</span>
            {e.senderName && (
              <span className="text-[10px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded border border-[#ff0055]/50 whitespace-nowrap">
                Boosted by {e.senderName}
              </span>
            )}
          </motion.div>
        ))}

        {rowStats.map((s) => (
          <motion.div
            key={s.id}
            initial={{ y: 0, opacity: 1, scale: 1 }}
            animate={{ y: s.type === 'xp_up' ? -40 : 40, opacity: 0, scale: 1.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: 'easeOut' }}
            className={`absolute right-12 top-2 flex items-center gap-1 z-50 pointer-events-none font-black font-mono text-lg drop-shadow-[0_0_10px_currentColor] ${s.type === 'xp_up' ? 'text-[#ff0055]' : 'text-yellow-500'}`}
          >
            {s.type === 'xp_up' ? '↑' : '↓'} 
            {s.type === 'xp_up' ? `+${s.amount} XP` : `-${s.amount} COINS`}
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="flex items-center gap-3 w-full">
        {/* Rank Badge */}
        <div
          className={`w-8 h-8 rounded-lg font-mono text-xs font-black flex items-center justify-center shrink-0 ${
            badgeStyle || 'text-white'
          }`}
          style={!badgeStyle ? { backgroundColor: player.badgeColor } : undefined}
        >
          #{player.rank}
        </div>

        {/* Avatar */}
        <div className={`${
          mini ? 'w-10 h-10 rounded-full' : 'w-[48px] h-[76px] rounded-xl'
        } overflow-hidden bg-black/60 border border-white/10 shrink-0 flex items-center justify-center`}>
          {mini ? (
            <MiniAvatar avatar={player.avatar} />
          ) : (
            <AvatarSVG avatar={player.avatar} size={48} mini={false} />
          )}
        </div>

        {/* Name + Username */}
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-sm font-bold text-white leading-tight truncate">
            {player.name}
          </span>
          <span className="text-[10px] font-mono text-zinc-500 truncate">
            @{player.username}
          </span>
        </div>

        {/* XP */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          <div className="flex flex-col items-end">
            <span className="text-sm font-mono font-bold text-[#ff0055] tabular-nums">
              {(player.xp || 0).toLocaleString()} XP
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
