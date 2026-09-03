'use client';

import React from 'react';
import { Player, ActivityLogEntry } from '@/types/admin';
import { 
  Activity, 
  LogIn, 
  Trophy, 
  AlertTriangle, 
  ShieldAlert, 
  UserCheck, 
  UserX,
  Clock,
  User,
  Building2,
  Calendar
} from 'lucide-react';

interface ActivityLogProps {
  selectedPlayer: Player | null;
  logs: ActivityLogEntry[];
}

export const ActivityLog: React.FC<ActivityLogProps> = ({ selectedPlayer, logs }) => {
  if (!selectedPlayer) {
    return (
      <div className="w-full bg-[#0a030d]/80 rounded-2xl border border-[#ff0055]/30 p-6 backdrop-blur-xl shadow-[0_0_30px_rgba(255,0,85,0.15)] flex flex-col items-center justify-center min-h-[360px] text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-[#1c061e] border border-[#ff0055]/40 flex items-center justify-center text-[#ff0055]">
          <Activity className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
          No Player Selected
        </h3>
        <p className="text-xs text-zinc-500 max-w-xs">
          Select a player from the directory table to inspect their real-time security activity log.
        </p>
      </div>
    );
  }

  const playerLogs = logs.filter((log) => log.empId === selectedPlayer.empId);

  return (
    <div className="w-full bg-[#0a030d]/80 rounded-2xl border border-[#ff0055]/30 p-6 backdrop-blur-xl shadow-[0_0_30px_rgba(255,0,85,0.15)] flex flex-col space-y-5">
      {/* Header Info Banner for Selected Player */}
      <div className="p-4 rounded-xl bg-[#050008] border border-[#ff0055]/30 flex flex-col space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-[#ff0055] px-2 py-0.5 rounded bg-[#ff0055]/20 border border-[#ff0055]/40">
              {selectedPlayer.empId}
            </span>
            <h3 className="text-base font-bold text-white tracking-tight">
              {selectedPlayer.name}
            </h3>
          </div>
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              selectedPlayer.status === 'suspended'
                ? 'bg-red-950 text-red-400 border border-red-600'
                : 'bg-emerald-950 text-emerald-400 border border-emerald-600'
            }`}
          >
            {selectedPlayer.status.toUpperCase()}
          </span>
        </div>

        {/* Player Metadata Pill Summary */}
        <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400 pt-1 border-t border-zinc-800 font-mono">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-[#ff0055]" />
            <span>@{selectedPlayer.username}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#ff0055]" />
            <span>{selectedPlayer.department}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-400 font-bold ml-auto">{selectedPlayer.xp || 0} XP</span>
            <span>{selectedPlayer.coins || 0} COINS</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-zinc-500" />
            <span>Joined: {selectedPlayer.joinedAt}</span>
          </div>
        </div>
      </div>

      {/* Activity Timeline Section Title */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#ff0055]" />
          <h4 className="text-xs font-mono font-bold uppercase text-white tracking-wider">
            ACTIVITY TIMELINE ({playerLogs.length})
          </h4>
        </div>
        <span className="text-[10px] font-mono text-zinc-500">LIVE FEED</span>
      </div>

      {/* Log Feed List */}
      <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
        {playerLogs.length === 0 ? (
          <div className="p-6 text-center text-xs text-zinc-500 font-mono">
            No logged activity records found for this player.
          </div>
        ) : (
          playerLogs.map((log) => {
            const getIcon = () => {
              switch (log.type) {
                case 'login':
                  return <LogIn className="w-3.5 h-3.5 text-emerald-400" />;
                case 'score':
                  return <Trophy className="w-3.5 h-3.5 text-amber-400" />;
                case 'flag':
                  return <AlertTriangle className="w-3.5 h-3.5 text-red-500" />;
                case 'status_change':
                  return <ShieldAlert className="w-3.5 h-3.5 text-[#ff0055]" />;
                default:
                  return <Clock className="w-3.5 h-3.5 text-zinc-400" />;
              }
            };

            const getBorderColor = () => {
              switch (log.type) {
                case 'login':
                  return 'border-emerald-600/30 bg-emerald-950/10';
                case 'score':
                  return 'border-amber-500/30 bg-amber-950/10';
                case 'flag':
                  return 'border-red-600/40 bg-red-950/20';
                case 'status_change':
                  return 'border-[#ff0055]/40 bg-[#ff0055]/10';
                default:
                  return 'border-zinc-800 bg-zinc-900/30';
              }
            };

            return (
              <div
                key={log.id}
                className={`p-3 rounded-xl border ${getBorderColor()} flex items-start gap-3 transition-all`}
              >
                <div className="p-1.5 rounded-lg bg-[#050008] border border-zinc-800 shrink-0 mt-0.5">
                  {getIcon()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white font-mono">
                      {log.action}
                    </span>
                    <span className="text-[9px] font-mono text-zinc-500">
                      {log.timestamp}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                    {log.details}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
