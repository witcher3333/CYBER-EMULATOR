'use client';

import React, { useState } from 'react';
import { useQuizStore } from '@/store/quizStore';

interface ItemShopModalProps {
  onClose: () => void;
  players?: any[];
  socket?: any;
}

export default function ItemShopModal({ onClose, players = [], socket }: ItemShopModalProps) {
  const { inventory, buyItem, executeSabotage } = useQuizStore();
  const currentEmpId = typeof window !== 'undefined' ? localStorage.getItem('currentUserEmpId') : null;
  const me = players.find(p => p.empId === currentEmpId);
  const coins = me?.coins || 0;
  const xpEarned = me?.xp || 0;
  const [feedback, setFeedback] = useState<{ id: string, message: string, type: 'success' | 'error' } | null>(null);
  const [terminalLog, setTerminalLog] = useState<string | null>(null);
  const [targetingMode, setTargetingMode] = useState<string | null>(null);

  const handlePurchase = async (item: any) => {
    if (coins >= item.price) {
      if (currentEmpId) {
        await fetch('/api/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ empId: currentEmpId, inc: { coins: -item.price } }) });
        socket?.emit('trigger_refresh');
      }
      buyItem(item.type, 0);
      setFeedback({ id: item.id, message: 'ACQUIRED', type: 'success' });
      setTimeout(() => setFeedback(null), 2000);
    } else {
      console.log("Transaction denied: Not enough coins.");
      setFeedback({ id: item.id, message: 'INSUFFICIENT FUNDS', type: 'error' });
      setTimeout(() => setFeedback(null), 2000);
    }
  };

  const boosters = [
    {
      id: 'hint-hacker',
      type: 'hints' as const,
      name: 'Hint Hacker',
      price: 50,
      description: 'Scrambles and eliminates 50% of incorrect choices.',
      icon: '🧠',
      offensive: false      },
      {
        id: 'auto-sorter',
        type: 'autoSorters' as const,
        name: 'Auto-Sorter',
        price: 80,
        description: 'Instantly arranges the first 2 options in the correct sequence.',
        icon: '??',
        offensive: false
      },
      {
        id: 'chronos-freeze',
        type: 'timeFreezes' as const,
        name: 'Chronos Freeze',
        price: 30,
        description: 'Freezes question countdown timer for 15 seconds.',
        icon: '⏳',
        offensive: false
      },
      {
        id: 'screen-freeze',
        type: 'screenFreezes' as const,
        name: 'Glacier Protocol',
        price: 150,
        description: 'Freezes the opponent\'s screen for 10 seconds.',
        icon: '❄️',
        offensive: true
      },
    {
      id: 'firewall-shield',
      type: 'shields' as const,
      name: 'Firewall Shield',
      price: 100,
      description: 'Absorbs 1 wrong answer penalty without breaking streak.',
      icon: '🛡️',
      offensive: false
    },
    {
      id: 'zero-day-sabotager',
      type: 'sabotagers' as const,
      name: 'Zero-Day Sabotager',
      price: 300,
      description: 'Deploy a jumpscare and deduct 150 XP from a target.',
      icon: '💀',
      offensive: true
    },
    {
      id: 'decoy-proxy',
      type: 'decoys' as const,
      name: 'Decoy Proxy',
      price: 120,
      description: 'Deflects the next sabotage attempt.',
      icon: '🎭',
      offensive: false
    },
    {
      id: 'ddos-emp',
      type: 'ddosEmps' as const,
      name: 'DDoS EMP',
      price: 200,
      description: 'Blinds all opponents screens for 5 seconds.',
      icon: '🔌',
      offensive: true
    },
    {
      id: 'overclock-rig',
      type: 'overclocks' as const,
      name: 'Overclock Rig',
      price: 150,
      description: 'Double XP gains for the next 3 questions.',
      icon: '⚡',
      offensive: false
    }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-md bg-black/90 p-4">
      <div className="w-full max-w-4xl bg-gray-900 border-2 border-red-500/40 rounded-xl shadow-[0_0_30px_rgba(239,68,68,0.2)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-red-500/40 bg-black/50 flex-col md:flex-row gap-4">
          <h2 className="text-3xl font-black text-red-500 tracking-widest uppercase drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">
            Black Market
          </h2>
          <div className="flex gap-6 font-mono font-bold text-lg">
            <span className="text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.5)]">🪙 Coins: {coins}</span>
            <span className="text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">⚡ XP: {xpEarned}</span>
          </div>
        </div>

        {/* Grid Layout */}
        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6 max-h-[60vh] overflow-y-auto overflow-x-hidden cyber-scrollbar">
          {boosters.map((booster) => {
            const isOwned = inventory && (inventory[booster.type] as number) > 0;
            const isSabotager = booster.id === 'zero-day-sabotager';
            const showAttackBtn = isSabotager && isOwned;

            return (
              <div key={booster.id} className={`flex flex-col border p-6 rounded-lg transition-all duration-300 shadow-lg relative group ${booster.offensive ? 'border-red-600 bg-red-950/30 hover:border-red-400' : 'border-cyan-600 bg-cyan-950/20 hover:border-cyan-400'}`}>
                <div className="text-4xl mb-4 text-center drop-shadow-md">{booster.icon}</div>
                <h3 className={`text-xl font-black text-center uppercase mb-2 transition-colors ${booster.offensive ? 'text-red-400 group-hover:text-red-300' : 'text-cyan-400 group-hover:text-cyan-300'}`}>
                  {booster.name}
                </h3>
                <p className="text-gray-300 text-sm text-center mb-6 flex-grow font-mono">
                  {booster.description}
                </p>
                <div className="flex justify-between items-center mb-4 font-mono font-bold">
                  <span className="text-yellow-400">Cost:</span>
                  <span className="text-white bg-black/50 px-3 py-1 rounded border border-gray-600">{booster.price} 🪙</span>
                </div>
                
                {showAttackBtn ? (
                  <button
                    onClick={() => setTargetingMode(booster.id)}
                    className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest rounded transition-colors active:scale-95 shadow-[0_0_15px_rgba(220,38,38,0.4)] animate-pulse"
                  >
                    Launch Attack
                  </button>
                ) : (
                  <button
                    onClick={() => handlePurchase(booster)}
                    className={`w-full py-3 text-white font-black uppercase tracking-widest rounded transition-colors active:scale-95 ${booster.offensive ? 'bg-red-700 hover:bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.4)]' : 'bg-cyan-700 hover:bg-cyan-600 shadow-[0_0_15px_rgba(34,211,238,0.4)]'}`}
                  >
                    Purchase {isOwned ? `(${inventory[booster.type]})` : ''}
                  </button>
                )}
                
                {/* Visual Feedback Overlay */}
                {feedback?.id === booster.id && (
                  <div className={`absolute inset-0 flex items-center justify-center bg-black/90 rounded-lg border-2 z-10 backdrop-blur-sm ${feedback.type === 'success' ? 'border-green-500' : 'border-red-600'}`}>
                    <span className={`text-xl font-black tracking-widest uppercase p-4 text-center ${feedback.type === 'success' ? 'text-green-500 animate-pulse drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]' : 'text-red-600 animate-bounce drop-shadow-[0_0_10px_rgba(220,38,38,0.8)]'}`}>
                      {feedback.message}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer / Close Button */}
        <div className="p-6 border-t border-red-500/40 bg-black/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-8 py-3 border border-gray-500 text-gray-300 hover:text-white hover:border-red-500 hover:bg-red-900/20 font-mono font-bold uppercase tracking-widest transition-all"
          >
            EXIT SHOP // RETURN TO MATRIX
          </button>
        </div>
      </div>

      {targetingMode && (
        <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-6 backdrop-blur-lg rounded-xl">
          <h2 className="text-3xl font-black text-red-500 mb-6 tracking-widest animate-pulse drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">SELECT TARGET</h2>
          <div className="w-full max-w-2xl bg-gray-900 border border-red-500/50 rounded-lg overflow-y-auto max-h-[60vh] p-4">
            {players.length === 0 ? (
              <p className="text-center text-gray-500 font-mono">No active targets found in the arena.</p>
            ) : (
              players.map(p => (
                <div key={p.empId} className="flex justify-between items-center p-4 border-b border-red-500/20 hover:bg-red-950/40 transition-colors">
                  <span className="font-mono text-white text-lg font-bold">@{p.username}</span>
                  <button 
                    onClick={() => {
                      executeSabotage(p.empId, socket);
                      setTargetingMode(null);
                      setTerminalLog(`[!] PAYLOAD DELIVERED TO @${p.username}`);
                      setTimeout(() => setTerminalLog(null), 3000);
                    }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-black rounded text-sm uppercase tracking-widest shadow-[0_0_10px_rgba(220,38,38,0.5)]"
                  >
                    EXECUTE
                  </button>
                </div>
              ))
            )}
          </div>
          <button onClick={() => setTargetingMode(null)} className="mt-6 px-8 py-3 border border-gray-500 text-gray-400 hover:text-white uppercase font-mono tracking-widest transition-all hover:border-red-500 hover:text-red-500">
            ABORT
          </button>
        </div>
      )}

      {terminalLog && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-black/90 border border-red-500 px-6 py-3 rounded text-red-500 font-mono font-bold tracking-widest z-[60] shadow-[0_0_20px_rgba(239,68,68,0.6)]">
          {terminalLog}
        </div>
      )}
    </div>
  );
}



