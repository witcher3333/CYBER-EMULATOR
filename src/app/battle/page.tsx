'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { AvatarSVG, DEFAULT_AVATAR as DEFAULT_AVATAR_OBJ } from '@/components/Avatar';
import { useQuizStore } from '@/store/quizStore';

function BattlePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const matchId = searchParams.get('matchId');
  const challengerId = searchParams.get('challengerId');
  const targetId = searchParams.get('targetId');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [timer, setTimer] = useState(30);
  const [sessionTimer, setSessionTimer] = useState(300);
  const [playerHp, setPlayerHp] = useState(100);
  const [opponentHp, setOpponentHp] = useState(100);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [localUser, setLocalUser] = useState<any>(null);
  const [opponent, setOpponent] = useState<any>({ name: 'Opponent', username: 'opponent' });
  const [animationState, setAnimationState] = useState('idle');
  const [screenFrozen, setScreenFrozen] = useState(false);
  const [eliminatedOptions, setEliminatedOptions] = useState<string[]>([]);
  const isChallenger = localUser?.empId === challengerId;
  const { inventory, consumeItem } = useQuizStore();

  useEffect(() => {
    let currentSocket: Socket | null = null;
    let isMounted = true;
    const currentEmpId = localStorage.getItem('currentUserEmpId');
    if (!currentEmpId) { window.location.href = '/login'; return; }
    const oppId = currentEmpId === challengerId ? targetId : challengerId;
    Promise.all([
      fetch(`/api/users?search=${currentEmpId}`).then(r => r.json()),
      fetch(`/api/users?search=${oppId}`).then(r => r.json()),
    ]).then(([localRes, oppRes]) => {
      if (!isMounted) return;
      if (!localRes.success || localRes.data.length === 0) { window.location.href = '/login'; return; }
      const parsedUser = localRes.data[0];
      setLocalUser(parsedUser);
      if (oppRes.success && oppRes.data.length > 0) setOpponent(oppRes.data[0]);
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || `http://${window.location.hostname}:3001`;
      currentSocket = io(socketUrl);
      setSocket(currentSocket);
      currentSocket.on('connect', () => {
        currentSocket!.emit('join_battle', { matchId, empId: parsedUser.empId });
        if (parsedUser.empId === challengerId) {
          fetch(`/api/questions?random=true&limit=50&exclude=${useQuizStore.getState().playedQuestions.join(',')}`).then(r => r.json()).then(data => {
            if (data.success && isMounted) {
              currentSocket!.emit('init_battle_data', { matchId, questions: data.data });
              setQuestions(data.data);
            }
          });
        }
      });
      currentSocket.on('battle_data_sync', (data) => { if (isMounted) setQuestions(data.questions); });
      currentSocket.on('battle_update', (data) => {
          // Track question played!
          if (questions.length > 0 && currentRound < questions.length) {
             const qId = questions[currentRound].id;
             const state = useQuizStore.getState();
             if (!state.playedQuestions.includes(qId)) {
                useQuizStore.setState({ playedQuestions: [...state.playedQuestions, qId] });
             }
          }
        const myAnswer  = parsedUser.empId === challengerId ? data.p1Answer : data.p2Answer;
        const oppAnswer = parsedUser.empId === challengerId ? data.p2Answer : data.p1Answer;
        if (!myAnswer || !oppAnswer) return;
        if (myAnswer.isCorrect && oppAnswer.isCorrect) { setAnimationState('both_correct'); }
          else if (myAnswer.isCorrect && !oppAnswer.isCorrect) { setAnimationState('player_shoot'); setTimeout(() => { if (isMounted) setAnimationState('opponent_damage'); }, 500); }
          else if (!myAnswer.isCorrect && oppAnswer.isCorrect) { setAnimationState('opponent_shoot'); setTimeout(() => { if (isMounted) setAnimationState('player_damage'); }, 500); }
          else { setAnimationState('system_zap'); } // BOTH WRONG -> LASER
        setTimeout(() => {
          if (!isMounted) return;
          if (parsedUser.empId === challengerId) { setPlayerHp(data.p1Hp); setOpponentHp(data.p2Hp); }
          else { setPlayerHp(data.p2Hp); setOpponentHp(data.p1Hp); }
        }, 500);
        if (data.nextRound) {
          setTimeout(() => {
            if (!isMounted) return;
            setAnimationState('idle'); setCurrentRound(prev => prev + 1);
            setTimer(30); setHasAnswered(false); setSelectedOption(null); setIsCorrect(null); setEliminatedOptions([]);
          }, 2500);
        } else { setTimeout(() => { if (isMounted) setAnimationState('idle'); }, 2500); }
      });
      
      currentSocket.on('screen_freeze_received', (data) => {
          setScreenFrozen(true);
          setTimeout(() => setScreenFrozen(false), 10000);
        });
        currentSocket.on('ddos_received', (data) => {
        alert(`[!] INCOMING DDOS FROM ${data.attackerName}! SYSTEM GLITCHING!`);
        setTimer(prev => Math.max(1, prev - 5));
      });
      currentSocket.on('sabotage_received', async (data) => {
        const { useQuizStore } = require('@/store/quizStore');
        const st = useQuizStore.getState();
        if (st.inventory.decoys && st.inventory.decoys > 0) {
           st.consumeItem('decoys');
           alert(`[DEFLECTED] Sabotage from ${data.attackerName} was blocked by your DECOY!`);
           return;
        }
        alert(`[!] SABOTAGE DETECTED! Lost ${data.penaltyXp} XP from ${data.attackerName}!`);
        try {
          const empId = localStorage.getItem('currentUserEmpId');
          await fetch('/api/users', {
             method: 'PATCH',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ empId, inc: { xp: -data.penaltyXp } })
          });
        } catch(e) {}
      });

      currentSocket.on('battle_over', async (data) => {
        const iWon = (data.winner === 'challenger' && parsedUser.empId === challengerId) || (data.winner === 'target' && parsedUser.empId !== challengerId);
        
        if (data.reason === 'forfeit') {
          if (data.forfeitedBy !== parsedUser.empId) {
             alert('Opponent forfeited! You win 300 Coins and 200 XP!');
             try { await fetch('/api/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ empId: parsedUser.empId, inc: { coins: 300, xp: 200 } }) }); } catch {}
             router.push('/');
          }
          return;
        }

        if (iWon) {
          alert('VICTORY! You earned 300 Coins and 200 XP!');
          try { await fetch('/api/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ empId: parsedUser.empId, updates: { coins: (parsedUser.coins || 0) + 300, xp: (parsedUser.xp || 0) + 200 } }) }); } catch {}
        } else if (data.winner === 'draw') { alert('DRAW!'); } else { alert('DEFEAT!'); }
        router.push('/');
      });
    });
    return () => { isMounted = false; currentSocket?.disconnect(); };
  }, [matchId, challengerId, targetId, router]);

  useEffect(() => {
    if (sessionTimer > 0) {
      const id = setInterval(() => setSessionTimer(p => p - 1), 1000);
      return () => clearInterval(id);
    } else if (sessionTimer === 0) {
      alert("Session Time Limit Reached! The Matrix has collapsed.");
      window.location.href = '/';
    }
  }, [sessionTimer]);

  useEffect(() => {
    if (questions.length === 0 || hasAnswered) return;
    if (timer > 0) {
      const id = setInterval(() => setTimer(p => p - 1), 1000);
      return () => clearInterval(id);
    } else { handleTimeOut(); }
  }, [timer, questions.length, hasAnswered]);

  const getDmg = (round: number) => {
    const d: Record<string, number> = { easy: 5, medium: 10, difficult: 15 };
    return d[questions[round]?.difficulty || 'medium'] || 10;
  };
  const handleTimeOut = () => {
    setHasAnswered(true);
    socket?.emit('submit_battle_answer', { matchId, empId: localUser?.empId, isCorrect: false, damage: getDmg(currentRound), isChallenger });
  };
  
    const handleForfeit = async () => {
      const confirm = window.confirm("DISCLAIMER: By forfeiting the match, you will lose 200 XP and 100 Coins. Do you wish to proceed?");
      if (confirm) {
         try { await fetch('/api/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ empId: localUser?.empId, inc: { coins: -100, xp: -200 } }) }); } catch {}
         alert("You have forfeited. 200 XP and 100 Coins have been deducted.");
         socket?.emit('player_forfeit', { matchId, empId: localUser?.empId, isChallenger });
         window.location.href = '/';
      }
    };

    const handleOptionClick = (option: string) => {
      if (hasAnswered || screenFrozen) return;
      setHasAnswered(true); setSelectedOption(option);
      const ans = questions[currentRound]?.correctAnswer;
      const correct = option === ans || option.startsWith(ans + '.') || option.startsWith(ans + ')');
      setIsCorrect(correct);
      socket?.emit('submit_battle_answer', { matchId, empId: localUser?.empId, isCorrect: correct, damage: correct ? 0 : getDmg(currentRound), isChallenger });
    };

    if (questions.length === 0 || !localUser) {

    return (<div className="h-screen w-screen bg-[#030005] flex items-center justify-center"><p className="text-[#ff0055] font-black tracking-[0.3em] text-xl uppercase animate-pulse">Initializing Matrix Duel...</p></div>);
  }

  const currentQ  = questions[currentRound];
  const myAvatar  = localUser?.activeAvatar && Object.keys(localUser.activeAvatar).length > 0 ? { ...DEFAULT_AVATAR_OBJ, ...localUser.activeAvatar } : DEFAULT_AVATAR_OBJ;
  const oppAvatar = opponent?.activeAvatar  && Object.keys(opponent.activeAvatar).length  > 0 ? { ...DEFAULT_AVATAR_OBJ, ...opponent.activeAvatar  } : DEFAULT_AVATAR_OBJ;
  const playerDmg   = animationState === 'player_damage'   || animationState === 'both_damage';
  const opponentDmg = animationState === 'opponent_damage' || animationState === 'both_damage';
  const bump        = animationState === 'both_correct';

  return (
    <div className="h-screen w-screen bg-[#030005] text-white flex flex-col font-mono overflow-hidden select-none relative">
        {screenFrozen && (
          <div className="absolute inset-0 z-[100] bg-blue-900/40 backdrop-blur-sm border-[10px] border-blue-500 flex flex-col items-center justify-center pointer-events-auto">
            <p className="text-4xl md:text-6xl font-black text-blue-300 drop-shadow-[0_0_20px_blue] animate-pulse uppercase tracking-[0.3em] text-center">SYSTEM FROZEN</p>
            <p className="text-white mt-4 tracking-widest bg-black/50 px-4 py-2 rounded">Controls disabled for 10 seconds</p>
          </div>
        )}
        <AnimatePresence>
          {animationState === 'system_zap' && (
            <motion.div key="laser-overlay" className="absolute inset-0 pointer-events-none z-50">
               <motion.div className="absolute top-0 bottom-[40%] left-[25%] w-[10px] bg-red-500 shadow-[0_0_30px_10px_red]"
                  initial={{ scaleY: 0, originY: 0 }} animate={{ scaleY: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} />
               <motion.div className="absolute top-0 bottom-[40%] right-[25%] w-[10px] bg-red-500 shadow-[0_0_30px_10px_red]"
                  initial={{ scaleY: 0, originY: 0 }} animate={{ scaleY: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} />
            </motion.div>
          )}
        </AnimatePresence>
      {/* HUD */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#111] bg-[#060606] shrink-0 gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-11 h-11 rounded border border-[#10b981] bg-[#10b981]/10 flex items-center justify-center overflow-hidden shrink-0">
            <AvatarSVG avatar={myAvatar} size={44} mini={true} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[#10b981] font-black text-sm tracking-wider truncate">@{localUser.username}</p>
            <div className="w-full bg-[#0d0d0d] h-[10px] rounded-full mt-1 border border-[#10b981]/20 overflow-hidden">
              <motion.div className="bg-[#10b981] h-full rounded-full" initial={{ width: '100%' }} animate={{ width: `${Math.max(0, playerHp)}%` }} transition={{ duration: 0.5 }} />
            </div>
            <p className="text-[10px] text-[#10b981]/60 mt-0.5 font-bold">{Math.max(0, playerHp)} HP</p>
          </div>
        </div>
        <div className="flex flex-col items-center shrink-0">
          <p className="text-sm text-[#ff0055] font-black tracking-[0.2em] uppercase mb-2 drop-shadow-[0_0_5px_rgba(255,0,85,0.8)]">SESSION: {Math.floor(sessionTimer/60)}:{(sessionTimer%60).toString().padStart(2, '0')}</p>
          <p className="text-[9px] text-gray-600 font-black tracking-[0.2em] uppercase mb-1">ROUND {currentRound + 1}</p>
          <div className={`w-14 h-14 rounded-full border-4 flex items-center justify-center transition-colors ${timer <= 5 ? 'border-[#ff0055] shadow-[0_0_20px_rgba(255,0,85,0.6)]' : 'border-[#222]'}`}>
            <span className={`text-2xl font-black tabular-nums ${timer <= 5 ? 'text-[#ff0055] animate-pulse' : 'text-white'}`}>{timer}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-1 min-w-0 flex-row-reverse">
          <div className="w-11 h-11 rounded border border-[#ff0055] bg-[#ff0055]/10 flex items-center justify-center overflow-hidden shrink-0">
            <AvatarSVG avatar={oppAvatar} size={44} mini={true} />
          </div>
          <div className="flex-1 min-w-0 text-right">
            <p className="text-[#ff0055] font-black text-sm tracking-wider truncate">@{opponent.username}</p>
            <div className="w-full bg-[#0d0d0d] h-[10px] rounded-full mt-1 border border-[#ff0055]/20 overflow-hidden flex justify-end">
              <motion.div className="bg-[#ff0055] h-full rounded-full" initial={{ width: '100%' }} animate={{ width: `${Math.max(0, opponentHp)}%` }} transition={{ duration: 0.5 }} />
            </div>
            <p className="text-[10px] text-[#ff0055]/60 mt-0.5 font-bold">{Math.max(0, opponentHp)} HP</p>
          </div>
        </div>
      </div>
      {/* Arena */}
      <div className="relative flex items-end justify-between px-8 sm:px-20 md:px-36 pb-3 shrink-0" style={{ height: '36%' }}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_110%,rgba(255,0,85,0.05),transparent)] pointer-events-none" />
        <AnimatePresence>
          {(animationState === 'player_shoot' || animationState === 'both_shoot') && (
            <motion.div key="pb" className="absolute top-[42%] left-[16%] h-[5px] rounded-full bg-[#10b981] shadow-[0_0_16px_6px_rgba(16,185,129,0.5)] z-50"
              initial={{ width: 10, x: 0, opacity: 1 }} animate={{ width: 80, x: '250%' }} exit={{ opacity: 0 }} transition={{ duration: 0.28, ease: 'easeIn' }} />
          )}
          {(animationState === 'opponent_shoot' || animationState === 'both_shoot') && (
            <motion.div key="ob" className="absolute top-[42%] right-[16%] h-[5px] rounded-full bg-[#ff0055] shadow-[0_0_16px_6px_rgba(255,0,85,0.5)] z-50"
              initial={{ width: 10, x: 0, opacity: 1 }} animate={{ width: 80, x: '-250%' }} exit={{ opacity: 0 }} transition={{ duration: 0.28, ease: 'easeIn' }} />
          )}
        </AnimatePresence>
        <motion.div className="flex flex-col items-center z-10"
          animate={bump ? { x: [0, 55, 0] } : playerDmg ? { x: [-10, 10, -10, 10, 0], filter: 'brightness(0.3) sepia(1) hue-rotate(-40deg) saturate(10)' } : { x: 0, filter: 'none' }}
          transition={{ duration: 0.4 }}>
          <div className={`drop-shadow-[0_0_20px_rgba(16,185,129,0.3)] ${playerHp <= 20 ? 'animate-[pulse_0.5s_infinite] drop-shadow-[0_0_20px_rgba(255,0,0,0.8)]' : ''}`}>
            <AvatarSVG avatar={myAvatar} size={130} mini={false} />
          </div>
          <div className="w-24 h-4 mt-1 rounded-[100%] bg-[#10b981]/5 shadow-[0_0_25px_10px_rgba(16,185,129,0.1)]" />
        </motion.div>
        <div className="text-[#1c1c1c] font-black text-5xl tracking-widest select-none z-10 hidden sm:block">VS</div>
        <motion.div className="flex flex-col items-center z-10"
          animate={bump ? { x: [0, -55, 0] } : opponentDmg ? { x: [-10, 10, -10, 10, 0], filter: 'brightness(0.3) sepia(1) hue-rotate(-40deg) saturate(10)' } : { x: 0, filter: 'none' }}
          transition={{ duration: 0.4 }}>
          <div className={`drop-shadow-[0_0_20px_rgba(255,0,85,0.3)] ${opponentHp <= 20 ? 'animate-[pulse_0.5s_infinite] drop-shadow-[0_0_20px_rgba(255,0,0,0.8)]' : ''}`} style={{ transform: 'scaleX(-1)' }}>
            <AvatarSVG avatar={oppAvatar} size={130} mini={false} />
          </div>
          <div className="w-24 h-4 mt-1 rounded-[100%] bg-[#ff0055]/5 shadow-[0_0_25px_10px_rgba(255,0,85,0.1)]" />
        </motion.div>
      </div>
      {/* Question Panel */}
      <div className="flex-1 bg-[#070707] border-t border-[#111] flex flex-col justify-center px-4 md:px-8 py-4 overflow-y-auto">
        {currentQ && (
          <div className="max-w-4xl mx-auto w-full">
            <div className="flex items-center justify-center mb-3">
              <span className="bg-[#0f0f0f] text-gray-500 border border-[#1c1c1c] px-3 py-1 rounded text-[10px] font-black tracking-[0.25em] uppercase">{currentQ.category}</span>
            </div>
            <h2 className="text-sm md:text-lg font-bold text-center text-white mb-4 leading-snug">{currentQ.question}</h2>
            <div className="grid grid-cols-2 gap-3">
              {currentQ.options.map((option: string, i: number) => {
                const isEliminated = eliminatedOptions.includes(option);
                let cls = 'bg-[#0d0d0d] border-[#1c1c1c] text-gray-400 hover:bg-[#141414] hover:border-gray-700 cursor-pointer';
                const ans = currentQ.correctAnswer;
                const isCorrectOpt = option === ans || option.startsWith(ans + '.') || option.startsWith(ans + ')');
                
                if (hasAnswered) {
                  if (isCorrectOpt) cls = 'bg-[#10b981]/10 border-[#10b981] text-[#10b981] shadow-[0_0_15px_rgba(16,185,129,0.2)]';
                  else if (option === selectedOption) cls = 'bg-[#ff0055]/10 border-[#ff0055] text-[#ff0055] shadow-[0_0_15px_rgba(255,0,85,0.2)]';
                  else cls = 'bg-[#080808] border-[#111] text-gray-700 opacity-40 cursor-default';
                } else if (option === selectedOption) { cls = 'bg-[#161616] border-gray-600 text-white'; }
                return (
                  <button key={i} onClick={() => handleOptionClick(option)} disabled={hasAnswered || screenFrozen || (typeof isEliminated !== 'undefined' ? isEliminated : false)}
                    className={`p-3 md:p-4 rounded border-2 font-mono text-xs md:text-sm transition-all active:scale-95 text-left leading-snug ${cls} ${isEliminated ? 'opacity-20 pointer-events-none grayscale line-through' : ''}`}>
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* INJECT GADGET DEPLOYMENT BUTTON */}
      <div className="absolute bottom-6 right-6 z-40">
        <button onClick={handleForfeit} className="bg-red-900/60 hover:bg-red-600 border border-red-500 text-white px-4 py-2 rounded-full font-mono text-[10px] sm:text-xs tracking-widest transition-all cursor-pointer shadow-[0_0_15px_rgba(255,0,85,0.4)]">FORFEIT MATCH</button>
      </div>
      <div className="absolute bottom-6 left-6 z-40">
        <button 
          onClick={() => (document.getElementById('battle-inventory-modal') as HTMLDialogElement)?.showModal()}
          className="bg-purple-900/60 hover:bg-purple-600 border border-purple-500 text-white px-4 py-2 rounded-full font-mono text-[10px] sm:text-xs tracking-widest shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all cursor-pointer"
        >
          DEPLOY GADGET
        </button>
        
        <dialog id="battle-inventory-modal" className="bg-gray-950 border border-purple-500 p-4 sm:p-6 rounded-lg text-white font-mono backdrop:bg-black/80 w-72 sm:w-80 max-w-[90vw]">
           <h3 className="text-purple-400 mb-4 border-b border-purple-900/50 pb-2">ACTIVE INVENTORY</h3>
           {Object.entries(inventory).filter(([_, count]) => count > 0).length === 0 ? (
             <p className="text-gray-500 text-xs">No tactical assets available.</p>
           ) : (
             Object.entries(inventory)
               .filter(([_, count]) => count > 0)
               .map(([key, count], idx) => (
               <button 
                 key={idx} 
                 onClick={() => {
                   consumeItem(key as any);
                   
                   if (key === 'hints') {
                       if (currentQ) {
                         const wrongOptions = currentQ.options.filter((opt: string) => !opt.startsWith(currentQ.correctAnswer + '.'));
                         const shuffledWrong = [...wrongOptions].sort(() => 0.5 - Math.random());
                         setEliminatedOptions(shuffledWrong.slice(0, 2));
                       }
                     } else if (key === 'timeFreezes') {
                       setTimer(prev => prev + 10);
                     } else if (key === 'screenFreezes') {
                       socket?.emit('player_screen_freeze', { targetId: opponent.empId });
                     } else if (key === 'sabotagers') {
                     socket?.emit('player_sabotage', { targetId: opponent.empId, penaltyXp: 50 });
                   } else if (key === 'overclocks') {
                     fetch('/api/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ empId: localUser?.empId, inc: { xp: 250 } }) });
                   } else if (key === 'ddosEmps') {
                     socket?.emit('player_ddos', { targetId: opponent.empId });
                   } else if (key === 'decoys') {
                     alert('Decoys are automatically triggered when sabotaged!');
                     useQuizStore.getState().buyItem('decoys', 0); // refund manual click
                   } else if (key === 'shields' || key === 'hints') {
                     alert('This tactical asset is reserved for Solo Matrix engagements.');
                     useQuizStore.getState().buyItem(key as any, 0); // refund
                   }
                   
                   (document.getElementById('battle-inventory-modal') as HTMLDialogElement)?.close();
                 }}
                 className="block w-full text-left p-3 mb-2 bg-purple-900/20 hover:bg-purple-600 text-sm border border-purple-900 rounded cursor-pointer"
               >
                 {">"} {key.toUpperCase()} (x{count})
               </button>
             ))
           )}
           <button onClick={() => (document.getElementById('battle-inventory-modal') as HTMLDialogElement)?.close()} className="mt-4 text-gray-500 hover:text-white text-xs w-full text-right cursor-pointer">
             [ CLOSE ]
           </button>
        </dialog>
      </div>
    </div>
  );
}



export default function BattlePage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-[#0a0a1a] text-white flex items-center justify-center">Loading Battle Arena...</div>}>
      <BattlePageContent />
    </React.Suspense>
  );
}




