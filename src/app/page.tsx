'use client';

import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Gamepad2, 
  ArrowLeft, 
  Trophy, 
  Sparkles, 
  Circle, 
  Triangle, 
  Square, 
  Wifi, 
  WifiOff,
  List
} from 'lucide-react';
import { MiniAvatar, AvatarSVG, DEFAULT_AVATAR, type AvatarState } from '@/components/Avatar';
import ItemShopModal from '@/components/shop/ItemShopModal';
import PasswordQuest from '@/components/dashboard/PasswordQuest';
import InventoryModal from '@/components/dashboard/InventoryModal';
import { useQuizStore } from '@/store/quizStore';

import { LeaderboardPlayer, FloatingEmoji, FloatingStat } from '@/types/dashboard';
import { LeaderboardItem, BADGE_COLORS } from '@/components/dashboard/LeaderboardItem';
import { FullLeaderboardModal } from '@/components/dashboard/FullLeaderboardModal';



export default function Phase3RealtimeDashboard() {
  const router = useRouter();
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const { coinsEarned, addCoins } = useQuizStore();

  const setMyScore = (s: number) => useQuizStore.setState({ score: s });
  const setCoins = (c: number) => useQuizStore.setState({ coinsEarned: c });

  useEffect(() => {
    // Check for your specific auth token or user state here
    const isAuthenticated = localStorage.getItem('currentUserEmpId'); 
        if (!isAuthenticated) {
        // Eject unauthenticated users to the login route
        window.location.href = '/login'; 
      } else {
        setIsAuthenticating(false); // Green light, lift the blackout cloak
      }
  }, [router]);

  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardPlayer[]>([]);
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  const [floatingStats, setFloatingStats] = useState<FloatingStat[]>([]);
  const [reactionCounts, setReactionCounts] = useState<{ [key: string]: number }>({
    '🔥': 0,
    '⚡': 0,
    '💀': 0,
    '👑': 0,
    '🎯': 0,
  });
  
  const [selectedTarget, setSelectedTarget] = useState<LeaderboardPlayer | null>(null);
  
  const [isFullLeaderboardOpen, setIsFullLeaderboardOpen] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isQuestOpen, setIsQuestOpen] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [showOperantsList, setShowOperantsList] = useState(false);
  const [incomingChallenge, setIncomingChallenge] = useState<{challengerId: string, challengerName: string} | null>(null);
  const [challengeTimer, setChallengeTimer] = useState<number | null>(null);
  const [duelCountdown, setDuelCountdown] = useState<number | null>(null);
  const [pendingChallengeTarget, setPendingChallengeTarget] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  
  const sendDuelChallenge = (targetId: string, targetName: string) => {
    if (!socket) return;
    const currentUser = leaderboard.find(p => p.empId === localStorage.getItem('currentUserEmpId'));
    setPendingChallengeTarget(targetId);
    socket.emit('initiate_1v1_challenge', { targetId, challengerName: currentUser?.name || 'A Player' });
    alert(`[!] CHALLENGE SENT TO ${targetName.toUpperCase()}`); // Temporary feedback
  };

  const triggerDuelCountdown = (matchData?: { challengerId: string, targetId: string }) => {
    setDuelCountdown(4);
    const audio = new Audio('/game duel/make_more_sound-321-go-8-bit-video-game-sound-version-1-145007.mp3');
    audio.play().catch(e => console.log('Audio play failed:', e));
    let timeLeft = 4;
    const timer = setInterval(() => {
      timeLeft -= 1;
      if (timeLeft > 0) {
        setDuelCountdown(timeLeft);
      } else {
        clearInterval(timer);
        setDuelCountdown(null);
        
        if (matchData) {
          window.location.href = `/battle?matchId=battle_${matchData.challengerId}_${matchData.targetId}&challengerId=${matchData.challengerId}&targetId=${matchData.targetId}`;
        } else {
          window.location.href = '/simulation-matrix';
        }
      }
    }, 1000);
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/users');
      const json = await res.json();
      if (json.success && json.data.length > 0) {
        // Rank by XP descending; use coins as tiebreaker
        const sorted = json.data.sort((a: any, b: any) => (b.xp - a.xp) || (b.coins - a.coins));
        const mapped: LeaderboardPlayer[] = sorted.map((u: any, idx: number) => ({
          rank: idx + 1,
          empId: u.empId,
          name: u.name,
          username: u.username,
          role: u.role,
          score: u.score || 0,
          xp: u.xp || 0,
          coins: u.coins || 0,
          badgeColor: BADGE_COLORS[idx % BADGE_COLORS.length],
          avatar: (u.activeAvatar && Object.keys(u.activeAvatar).length > 0)
            ? { ...DEFAULT_AVATAR, ...u.activeAvatar }
            : DEFAULT_AVATAR,
        }));
        setLeaderboard(mapped);
      }
    } catch (error) {
      console.error('[Dashboard] Failed to fetch leaderboard:', error);
    }
  };

  useEffect(() => {
    fetchLeaderboard();

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || `http://${window.location.hostname}:3001`;
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('[FRONTEND] Connected to Socket server:', newSocket.id);
      setIsConnected(true);
      const currentEmpId = localStorage.getItem('currentUserEmpId');
      if (currentEmpId) {
        newSocket.emit('register', currentEmpId);
      }
    });

    newSocket.on('disconnect', () => {
      console.log('[FRONTEND] Disconnected from Socket server');
      setIsConnected(false);
    });

    newSocket.on('online_users', (users: string[]) => {
      setOnlineUsers(users);
    });

    newSocket.on('refresh_leaderboard', () => {
      console.log('[FRONTEND] Refreshing leaderboard from socket event');
      fetchLeaderboard();
    });

    newSocket.on('update_score', (data: { empId: string; newScore: number }) => {
      setLeaderboard((prevLeaderboard) => {
        const updated = prevLeaderboard.map((p) =>
          p.empId === data.empId ? { ...p, xp: data.newScore } : p
        );
        updated.sort((a, b) => (b.xp || 0) - (a.xp || 0));
        return updated.map((p, idx) => ({ ...p, rank: idx + 1 }));
      });
    });

    newSocket.on('send_emoji', (data: { empId: string; emoji: string; id: string; senderName?: string }) => {
      const emojiId = data.id || `${Date.now()}-${Math.random()}`;
      setFloatingEmojis((prev) => [...prev, { id: emojiId, empId: data.empId, emoji: data.emoji, senderName: data.senderName }]);
      setReactionCounts((prev) => ({
        ...prev,
        [data.emoji]: (prev[data.emoji] || 0) + 1,
      }));
      setTimeout(() => {
        setFloatingEmojis((prev) => prev.filter((e) => e.id !== emojiId));
      }, 1800);
    });

    newSocket.on('send_stat_animation', (data: FloatingStat) => {
      const statId = data.id || `stat-${Date.now()}-${Math.random()}`;
      setFloatingStats((prev) => [...prev, { ...data, id: statId }]);
      setTimeout(() => {
        setFloatingStats((prev) => prev.filter((s) => s.id !== statId));
      }, 2000);
    });

    newSocket.on('receive_1v1_challenge', (data: { challengerId: string, challengerName: string }) => {
      setIncomingChallenge(data);
      setChallengeTimer(15);
    });

    newSocket.on('1v1_challenge_accepted', (data: { challengerId: string, targetId: string }) => {
      triggerDuelCountdown(data);
    });

    newSocket.on('1v1_challenge_denied', (data: { reason: string }) => {
      alert(`[!] Challenge denied: ${data.reason}`);
    });

    return () => {
      newSocket.off('receive_1v1_challenge');
      newSocket.off('1v1_challenge_accepted');
      newSocket.off('1v1_challenge_denied');
      newSocket.disconnect();
    };
  }, []);

  // Timer effect for challenge expiration
  useEffect(() => {
    if (challengeTimer === null || challengeTimer <= 0) return;
    const interval = setInterval(() => {
      setChallengeTimer((prev) => {
        if (prev && prev <= 1) {
          // Timer ended
          if (incomingChallenge && socket) {
            socket.emit('deny_1v1_challenge', { challengerId: incomingChallenge.challengerId, reason: 'Timeout' });
          }
          setIncomingChallenge(null);
          return null;
        }
        return prev ? prev - 1 : null;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [challengeTimer, incomingChallenge, socket]);

  const handleScoreBoost = async (empId: string, xpAmount: number = 10, coinCost: number = 50) => {
    const currentEmpId = localStorage.getItem('currentUserEmpId');
    if (!currentEmpId || currentEmpId === empId) return; // Cannot boost yourself

    const sender = leaderboard.find(p => p.empId === currentEmpId);
    if (!sender || (sender.coins || 0) < coinCost) {
      alert(`Not enough coins! You need ${coinCost} coins to send ${xpAmount} XP.`);
      return;
    }

    try {
      await Promise.all([
        fetch('/api/users', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ empId: currentEmpId, inc: { coins: -coinCost } }),
        }),
        fetch('/api/users', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ empId, inc: { xp: xpAmount } }),
        })
      ]);

      // Trigger real-time refresh for all connected clients (no page reload needed)
      const statIdXP = `xp-${Date.now()}`;
      const statIdCoins = `coins-${Date.now()}`;
      const xpAnim: FloatingStat = { id: statIdXP, empId, type: 'xp_up', amount: xpAmount };
      const coinsAnim: FloatingStat = { id: statIdCoins, empId: currentEmpId, type: 'coins_down', amount: coinCost };

      if (socket && isConnected) {
        socket.emit('trigger_refresh');
        socket.emit('send_stat_animation', xpAnim);
        socket.emit('send_stat_animation', coinsAnim);
      } else {
        fetchLeaderboard();
        setFloatingStats(prev => [...prev, xpAnim, coinsAnim]);
        setTimeout(() => setFloatingStats(prev => prev.filter(s => s.id !== statIdXP && s.id !== statIdCoins)), 2000);
      }

      fetch('/api/activity-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empId,
          action: 'XP Boost',
          type: 'score',
          details: `XP boosted by +${xpAmount} from ${sender.name}.`,
        }),
      }).catch((err) => console.error('[Dashboard] Log persist failed:', err));
    } catch (err) {
      console.error('[Dashboard] XP transfer failed:', err);
    }
  };

  const handleEmitEmoji = (empId: string, emoji: string) => {
    const currentEmpId = localStorage.getItem('currentUserEmpId');
    const sender = leaderboard.find(p => p.empId === currentEmpId);
    const senderName = sender ? sender.name : 'Unknown';

    const emojiObj = { empId, emoji, id: `emoji-${Date.now()}-${Math.random()}`, senderName };
    if (!socket || !isConnected) {
      setFloatingEmojis((prev) => [...prev, emojiObj]);
      setReactionCounts((prev) => ({ ...prev, [emoji]: (prev[emoji] || 0) + 1 }));
      setTimeout(() => {
        setFloatingEmojis((prev) => prev.filter((e) => e.id !== emojiObj.id));
      }, 1800);
    } else {
      socket.emit('send_emoji', emojiObj);
    }
  };

  if (isAuthenticating) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center text-red-500 font-mono tracking-[0.3em]">
        VERIFYING CLEARANCE...
      </div>
    );
  }

  return (
    <div className="min-h-screen h-screen bg-black text-white p-4 sm:p-6 lg:p-8 font-sans relative overflow-x-hidden flex flex-col justify-between select-none">
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#ff0055]/15 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-[#e60039]/15 rounded-full blur-3xl pointer-events-none z-0" />

      <div className="max-w-7xl w-full mx-auto space-y-6 relative z-10 my-auto">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#ff0055]/30">
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="p-2.5 rounded-xl bg-[#0e0414] border border-[#ff0055]/30 text-[#ff0055] hover:bg-[#ff0055] hover:text-white transition-all shadow-[0_0_10px_rgba(255,0,85,0.2)]"
              title="Sign Out to Login"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#ff0055]/20 border border-[#ff0055]/40 text-[#ff0055] shadow-[0_0_15px_#ff0055]">
                <Gamepad2 className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-wider text-white">
                  CYBER<span className="text-[#ff0055]">//</span>SIMULATOR
                </span>
                <div className="flex items-center gap-1 text-[#ff0055] px-2 py-0.5 rounded-full bg-[#1c061e] border border-[#ff0055]/30">
                  <Circle className="w-2.5 h-2.5 fill-current" />
                  <Triangle className="w-2.5 h-2.5 fill-current" />
                  <Square className="w-2.5 h-2.5 fill-current" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/avatar"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#ff0055] to-[#e60039] hover:from-[#e60039] hover:to-[#ff0055] text-white text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(255,0,85,0.5)] border border-white/20 transition-all active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-white" />
              EDIT AVATAR
            </Link>
            <button 
              onClick={() => setIsShopOpen(true)} 
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl font-bold border border-purple-400 font-mono tracking-widest text-xs shadow-[0_0_15px_rgba(147,51,234,0.5)] transition-all active:scale-95 cursor-pointer"
            >
              🛒 BLACK MARKET
            </button>
            <button 
              onClick={() => setIsQuestOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold border border-blue-400 font-mono tracking-widest text-xs shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all active:scale-95 cursor-pointer"
            >
              🛡️ SIDE QUESTS
            </button>
            <button 
              onClick={() => setIsInventoryOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl font-bold border border-green-400 font-mono tracking-widest text-xs shadow-[0_0_15px_rgba(34,197,94,0.5)] transition-all active:scale-95 cursor-pointer"
            >
              📦 INVENTORY
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-start">
          <div className="lg:col-span-6 xl:col-span-7 space-y-6">
            <div className="bg-[#030303]/90 rounded-3xl p-6 sm:p-8 border border-[#ff0055]/40 backdrop-blur-xl shadow-[0_0_35px_rgba(255,0,85,0.25)] relative overflow-hidden space-y-6">
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <button 
                  onClick={() => window.location.href = '/simulation-matrix'}
                  className="px-10 py-5 rounded-2xl bg-[#0a0a0a] border border-red-500 hover:shadow-[0_0_40px_rgba(255,0,60,0.6)] hover:bg-[#ff003c] text-[#ff003c] hover:text-white font-mono font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-[0_0_15px_rgba(255,0,60,0.5)] transition-all active:scale-95 cursor-pointer"
                >
                  <span className="w-2 h-2 rounded-full bg-[#ff003c] animate-pulse group-hover:bg-white" />
                  ENTER SIMULATION MATRIX
                </button>

              </div>
            </div>

            {(() => {
              const currentEmpId = typeof window !== 'undefined' ? localStorage.getItem('currentUserEmpId') : null;
              const me = leaderboard.find(p => p.empId === currentEmpId);
              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {/* MY XP */}
                  <div className="relative p-4 rounded-2xl bg-[#0a030d]/80 border border-[#ff0055]/30 backdrop-blur-md flex flex-col justify-between space-y-2">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase">MY XP</span>
                    <span className="text-xl font-extrabold text-[#ff0055] font-mono">
                      {(me?.xp || 0).toLocaleString()} XP
                    </span>
                    <AnimatePresence>
                      {floatingStats.filter(s => s.empId === me?.empId && s.type === 'xp_up').map(s => (
                        <motion.div
                          key={s.id}
                          initial={{ y: 0, opacity: 1, scale: 1 }}
                          animate={{ y: -40, opacity: 0, scale: 1.5 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 2, ease: 'easeOut' }}
                          className="absolute right-4 top-2 text-[#ff0055] font-black font-mono text-lg drop-shadow-[0_0_10px_currentColor] z-50 pointer-events-none"
                        >
                          ↑ +{s.amount} XP
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  {/* PLAYER */}
                  <div className="p-4 rounded-2xl bg-[#0a030d]/80 border border-[#ff0055]/30 backdrop-blur-md flex flex-col justify-between space-y-2">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase">PLAYER</span>
                    <span className="text-xl font-extrabold text-white font-mono truncate">
                      {me?.name || '—'}
                    </span>
                  </div>

                  {/* MY COINS */}
                  <div className="relative p-4 rounded-2xl bg-[#0a030d]/80 border border-blue-500/30 backdrop-blur-md flex flex-col justify-between space-y-2">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">MY COINS</span>
                    <span className="text-xl font-extrabold text-yellow-500 font-mono tabular-nums">
                      {(me?.coins || 0).toLocaleString()} COINS
                    </span>
                    <AnimatePresence>
                      {floatingStats.filter(s => s.empId === me?.empId && s.type === 'coins_down').map(s => (
                        <motion.div
                          key={s.id}
                          initial={{ y: 0, opacity: 1, scale: 1 }}
                          animate={{ y: 40, opacity: 0, scale: 1.5 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 2, ease: 'easeOut' }}
                          className="absolute right-4 top-2 text-yellow-500 font-black font-mono text-lg drop-shadow-[0_0_10px_currentColor] z-50 pointer-events-none"
                        >
                          ↓ -{s.amount} COINS
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  {/* ACTIVE OPERANTS */}
                  <div
                    onClick={() => setShowOperantsList(true)}
                    className="p-4 rounded-2xl bg-[#0a030d]/80 border border-[#ff0055]/30 hover:border-emerald-500/50 hover:bg-[#111] backdrop-blur-md flex flex-col justify-between space-y-2 cursor-pointer transition-all"
                  >
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">OPERANTS</span>
                    <span className="text-xl font-extrabold text-emerald-400 font-mono">
                      {typeof window !== 'undefined'
                        ? leaderboard.filter(p => p.empId !== localStorage.getItem('currentUserEmpId') && onlineUsers.includes(p.empId)).length
                        : 0} ACTIVE
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="lg:col-span-4 xl:col-span-3 bg-[#030303]/90 rounded-3xl p-6 border border-[#ff0055]/40 backdrop-blur-xl shadow-[0_0_35px_rgba(255,0,85,0.25)] space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#ff0055]/30">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#ff0055]" />
                <h3 className="text-xs font-mono font-bold uppercase text-white tracking-wider">
                  LIVE LEADERBOARD
                </h3>
              </div>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#ff0055]/20 text-[#ff0055] animate-pulse">
                REAL-TIME
              </span>
            </div>

            <div className="space-y-2 relative min-h-[280px] max-h-[350px] overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#ff0055 transparent' }}>
              {leaderboard.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[280px] text-zinc-600 font-mono text-xs text-center gap-2">
                  <Trophy className="w-8 h-8 opacity-30" />
                  <p>No players yet. Sign up to claim the #1 spot!</p>
                </div>
              ) : (
                leaderboard.map((player) => (
                  <LeaderboardItem
                    key={player.empId}
                    player={player}
                    floatingEmojis={floatingEmojis}
                    selectedTarget={selectedTarget}
                    setSelectedTarget={setSelectedTarget}
                  />
                ))
              )}
            </div>

            <button
              onClick={() => setIsFullLeaderboardOpen(true)}
              className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-zinc-800 to-zinc-900 border border-zinc-700 hover:border-[#ff0055]/50 hover:bg-[#1a0515] transition-all text-xs font-bold font-mono tracking-widest text-zinc-300 hover:text-[#ff0055] flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <List className="w-4 h-4" />
              FULL PLAYER LEADERBOARD
            </button>

            <div className="mt-6 border-t border-white/10 pt-6">
              <h4 className="text-xs text-zinc-500 font-mono mb-4 uppercase tracking-[0.2em]">
                {selectedTarget ? `TARGET LOCKED: ${selectedTarget.name}` : 'SELECT A TARGET TO ENGAGE'}
              </h4>
              
              {/* Reactions */}
              <div className="flex justify-between gap-2 mb-6">
                {['🔥', '⚡', '💀', '👑', '🎯'].map(emoji => (
                   <button 
                     key={emoji}
                     disabled={!selectedTarget}
                     onClick={() => selectedTarget && handleEmitEmoji(selectedTarget.empId, emoji)}
                     className="flex-1 bg-black py-3 rounded border border-white/5 hover:border-blue-500 disabled:opacity-20 transition-all text-xl cursor-pointer"
                   >
                     {emoji}
                   </button>
                ))}
              </div>

              {/* Coin-Based XP Boosts */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { xp: 50, cost: 10 }, 
                  { xp: 100, cost: 25 }, 
                  { xp: 250, cost: 50 }, 
                  { xp: 500, cost: 100 }
                ].map(tier => (
                  <button 
                     key={tier.xp}
                     disabled={!selectedTarget}
                     onClick={() => selectedTarget && handleScoreBoost(selectedTarget.empId, tier.xp, tier.cost)}
                     className="bg-black group flex justify-between items-center p-3 font-mono border border-green-900/50 hover:bg-green-900/20 disabled:opacity-20 rounded transition-all cursor-pointer"
                  >
                     <span className="text-green-500 text-sm font-bold group-hover:text-green-400">+{tier.xp} XP</span>
                     <span className="text-yellow-600 text-xs tracking-widest">{tier.cost} 🪙</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <FullLeaderboardModal
        isOpen={isFullLeaderboardOpen}
        onClose={() => setIsFullLeaderboardOpen(false)}
        leaderboard={leaderboard}
        floatingEmojis={floatingEmojis}
        floatingStats={floatingStats}
        selectedTarget={selectedTarget}
        setSelectedTarget={setSelectedTarget}
      />

      {isShopOpen && <ItemShopModal onClose={() => setIsShopOpen(false)} players={leaderboard} socket={socket} />}
      {isQuestOpen && <PasswordQuest onClose={() => setIsQuestOpen(false)} onClaimed={() => socket?.emit('trigger_refresh')} />}
        {isInventoryOpen && <InventoryModal onClose={() => setIsInventoryOpen(false)} />}
      
      {showOperantsList && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setShowOperantsList(false)}>
          <div className="bg-[#0a0a0a] border border-green-500/30 p-6 rounded-lg min-w-[320px] shadow-[0_0_30px_rgba(34,197,94,0.1)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-2">
              <h3 className="text-green-400 font-black tracking-widest text-lg flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                ACTIVE OPERANTS
              </h3>
              <button onClick={() => setShowOperantsList(false)} className="text-gray-500 hover:text-white transition-colors">✕</button>
            </div>
            <div className="max-h-[40vh] overflow-y-auto cyber-scrollbar flex flex-col gap-2">
              {leaderboard.filter(p => p.empId !== localStorage.getItem('currentUserEmpId')).map((player, idx) => {
                const isOnline = onlineUsers.includes(player.empId);
                return (
                <div key={player.empId || idx} className="flex items-center gap-3 bg-[#111] p-2 border border-gray-800/50 rounded hover:border-gray-700 transition-colors">
                  <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center text-xs overflow-hidden">
                    <MiniAvatar avatar={player.avatar as AvatarState} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-200 text-sm font-bold">{player.name || `Operant-${idx}`}</span>
                    <span className={`text-[10px] uppercase tracking-wider flex items-center gap-1 ${isOnline ? 'text-green-500' : 'text-gray-500'}`}><span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-500'}`}></span> {isOnline ? 'ONLINE' : 'OFFLINE'}</span>
                  </div>
                  <div className="ml-auto text-green-500 text-xs font-mono">12ms</div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      sendDuelChallenge(player.empId, player.name || player.username || `Operant-${idx}`);
                    }}
                    className="ml-3 bg-red-950/40 hover:bg-red-900 border border-red-700/50 text-red-500 hover:text-red-400 px-3 py-1 rounded text-[10px] font-black tracking-widest transition-all"
                  >
                    ⚔️ CHALLENGE
                  </button>
                </div>
              )})}
              {leaderboard.filter(p => p.empId !== localStorage.getItem('currentUserEmpId')).length === 0 && (
                <div className="text-gray-600 text-center py-6 font-mono text-sm">NO OTHER OPERANTS REGISTERED IN SYSTEM</div>
              )}
            </div>
          </div>
        </div>
      )}

      {incomingChallenge && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md pointer-events-auto">
          <div className="bg-red-950/20 border-2 border-red-600 p-8 rounded-lg shadow-[0_0_80px_rgba(220,38,38,0.4)] text-center animate-pulse max-w-md w-full mx-4">
            <div className="text-red-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z"/></svg>
            </div>
            <h2 className="text-3xl font-black text-white tracking-widest mb-2 uppercase">1v1 DUEL INCOMING</h2>
            <p className="text-red-400 font-mono mb-8">
              <span className="text-white font-bold">{incomingChallenge.challengerName}</span> has challenged you to a rapid-fire matrix duel.
              <br />
              <span className="text-sm mt-2 block">Expires in: {challengeTimer}s</span>
            </p>
            <div className="flex gap-4 justify-center">
              <button 
                onClick={() => {
                  socket?.emit('accept_1v1_challenge', { challengerId: incomingChallenge.challengerId });
                  triggerDuelCountdown({ challengerId: incomingChallenge.challengerId, targetId: localStorage.getItem('currentUserEmpId') || '' });
                  setIncomingChallenge(null);
                }}
                className="bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded font-black tracking-widest w-1/2 transition-colors"
              >
                ACCEPT
              </button>
              <button 
                onClick={() => {
                  socket?.emit('deny_1v1_challenge', { challengerId: incomingChallenge.challengerId, reason: 'Declined by player' });
                  setIncomingChallenge(null);
                }}
                className="bg-transparent border border-gray-600 text-gray-400 hover:text-white hover:border-gray-400 px-6 py-3 rounded font-black tracking-widest w-1/2 transition-colors"
              >
                DECLINE
              </button>
            </div>
          </div>
        </div>
      )}

      {duelCountdown !== null && (
        <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-black/95 backdrop-blur-lg pointer-events-auto">
          <div className="text-red-600 font-mono text-[15rem] font-black leading-none animate-ping">
            {duelCountdown}
          </div>
          <div className="text-red-500 font-black tracking-[1em] mt-8 animate-pulse text-2xl uppercase">
            PREPARE TO ENGAGE
          </div>
        </div>
      )}
    </div>
  );
}


