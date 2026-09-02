'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQuizStore } from '@/store/quizStore';
import quizData from '@/data/questions.json';
import { useRouter } from 'next/navigation';
import LiveLeaderboard from './LiveLeaderboard';
import SequenceOrdering from './SequenceOrdering';
import { QRCodeSVG } from 'qrcode.react';

const shuffleArray = (array: any[]) => {
  let shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const initialQuestions = quizData.questions;

// QuizEngine owns its own local question index (soloQuestionIndex) that is
// always bounded to the local 10-question shuffled array.
// The store's advanceQuestion is called only for score/streak side-effects.
// This keeps solo mode fully decoupled from the battle page which has its
// own socket-fetched question list and no dependency on quizStore.
export default function QuizEngine() {
  const router = useRouter();
  const { advanceQuestion, score, multiplier, resetStreak, coinsEarned, xpEarned, inventory } = useQuizStore();

  // Local 10-question session array — shuffled & burn-filtered on mount
  const [questions, setQuestions] = useState<any[]>([]);
  // soloQuestionIndex is owned entirely by QuizEngine — always within [0, questions.length)
  const [soloQuestionIndex, setSoloQuestionIndex] = useState(0);
  
  useEffect(() => {
    // Fetch the burn list
    const burnedQuestions = JSON.parse(localStorage.getItem('burned_questions') || '[]');
    
    // Filter out any question whose ID is in the burn list
    const freshQuestions = initialQuestions.filter((q: any) => !burnedQuestions.includes(q.id));
    
    // Failsafe: If they answer every question in the DB, clear the burn list to restart
    if (freshQuestions.length === 0) {
       console.log("Database exhausted. Resetting matrix...");
       localStorage.removeItem('burned_questions');
       setQuestions(shuffleArray(initialQuestions).slice(0, 10)); 
    } else {
       // Proceed with the fresh, unplayed questions
       setQuestions(shuffleArray(freshQuestions).slice(0, 10));
    }
  }, []);

  const [qrEvent, setQrEvent] = useState({ active: false, payload: "" });
  const publicAssets = [
    "/secret-gadget-blueprint.png",
    "/classified-intel-01.jpg",
    "/black-market-voucher.pdf"
  ];

  useEffect(() => {
    const popTime = Math.floor(Math.random() * 20000) + 10000; // 10s to 30s delay
    
    const dropTimer = setTimeout(() => {
      // Pick a random asset from the array
      const randomAsset = publicAssets[Math.floor(Math.random() * publicAssets.length)];
      // Generate the full URL so a mobile scanner can actually open the file
      const fullUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://cyber-emulator.vercel.app'}${randomAsset}`;
      
      setQrEvent({ active: true, payload: fullUrl });
    }, popTime);

    return () => clearTimeout(dropTimer);
  }, []);
  const [isBriefing, setIsBriefing] = useState(true);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isTimeout, setIsTimeout] = useState(false);
  
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [activeMedia, setActiveMedia] = useState<{ type: 'video' | 'image' | 'audio', url: string } | null>(null);
  
  const [isTimerFrozen, setIsTimerFrozen] = useState(false);
  
  const [isSabotaged, setIsSabotaged] = useState(false);
  const [sabotageMessage, setSabotageMessage] = useState<string | null>(null);
    const [eliminatedOptions, setEliminatedOptions] = useState<string[]>([]);
    const [autoSolvedCount, setAutoSolvedCount] = useState(0);
    const [currentSequence, setCurrentSequence] = useState<any[]>([]);
  const [socket, setSocket] = useState<any>(null);

  const [quizMode, setQuizMode] = useState<'standard' | 'wager'>('standard');
  const [wagerAmount, setWagerAmount] = useState(0);

  useEffect(() => {
    import('socket.io-client').then(({ io }) => {
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || `http://${window.location.hostname}:3001`;
      const newSocket = io(socketUrl, { transports: ['websocket', 'polling'] });
      setSocket(newSocket);
    });
  }, []);

  const triggerGotcha = () => {
    const mediaArsenal = [
      { type: 'video', url: '/videos/hack1.mp4' },
      { type: 'image', url: '/images/scary1.jpg' },
      { type: 'audio', url: '/sounds/screech.mp3' }
    ];
    const selected = mediaArsenal[Math.floor(Math.random() * mediaArsenal.length)];
    setActiveMedia(selected as any);
    
    if (selected.type === 'image') {
      setTimeout(() => setActiveMedia(null), 5000); // 5-second hard lock
    } else if (selected.type === 'audio') {
      const audio = new Audio(selected.url);
      audio.play().catch(() => setActiveMedia(null)); // Fallback if browser blocks audio
      audio.onended = () => setActiveMedia(null); // Unlock when audio finishes
    }
  };

  const initiateWagerRound = () => {
    setQuizMode('wager');
    // Logic to pause standard timer and render the betting UI
  };

  useEffect(() => {
    const handlePhysicalSmash = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && quizMode === 'standard') {
        initiateWagerRound();
      }
    };
    window.addEventListener('keydown', handlePhysicalSmash);
    return () => window.removeEventListener('keydown', handlePhysicalSmash);
  }, [quizMode]);
  
  // Hydration check since we use localStorage persist
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const activeQuestion = questions[soloQuestionIndex];


  useEffect(() => {
    if (!socket) return;

    socket.on('sabotage_received', (data: { attackerName: string, penaltyXp: number }) => {
      // Check if player has active decoy proxy
      const store = useQuizStore.getState();
      if (store.inventory.decoys > 0) {
        store.consumeDecoy();
        socket.emit('sabotage_deflected', { attackerId: data.attackerName });
        return;
      }

      // Trigger shake and red glitch
      setIsSabotaged(true);
      setSabotageMessage(`⚠️ ZERO-DAY EXPLOIT INJECTED BY ${data.attackerName || 'ANONYMOUS'} (-${data.penaltyXp} XP)`);
      
      // Deduct XP locally
      store.deductXP(data.penaltyXp || 150);

      // Clear effect after 2.5 seconds
      setTimeout(() => {
        setIsSabotaged(false);
        setSabotageMessage(null);
      }, 2500);
    });

    return () => {
      socket.off('sabotage_received');
    };
  }, [socket]);

  // Timer Initialization
  useEffect(() => {
    if (!activeQuestion) return;
      setAutoSolvedCount(0);
      setCurrentSequence(activeQuestion.draggableItems || []);
    
    const diff = activeQuestion.difficulty?.toLowerCase() || '';
    let initialTime = 30;
    
    if (diff.includes('hard') || diff.includes('expert') || diff.includes('difficult')) {
      initialTime = 60;
    } else if (diff.includes('medium')) {
      initialTime = 45;
    } else if (diff.includes('easy')) {
      initialTime = 30;
    }
    
    setTimeLeft(initialTime);
  }, [soloQuestionIndex, activeQuestion]);

  // Countdown Logic
  useEffect(() => {
    if (isSubmitted || !activeQuestion || timeLeft <= 0 || isTimerFrozen) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSubmitted, activeQuestion, timeLeft, isTimerFrozen]);

  // Timeout Trigger
  useEffect(() => {
    if (timeLeft === 0 && !isSubmitted && activeQuestion) {
      resetStreak();
      setIsTimeout(true);
      setIsCorrect(false);
      setIsSubmitted(true);

      const diff = activeQuestion.difficulty?.toLowerCase() || '';
      let initialTime = 30;
      if (diff.includes('hard') || diff.includes('expert') || diff.includes('difficult')) initialTime = 60;
      else if (diff.includes('medium')) initialTime = 45;

      useQuizStore.getState().addLog({
        questionId: String(activeQuestion.id),
        isCorrect: false,
        timeSpent: initialTime,
      });
    }
  }, [timeLeft, isSubmitted, activeQuestion, resetStreak]);

  // Handle Simulation Complete - Save Session
  useEffect(() => {
    if (mounted && !activeQuestion && score > 0) {
      const saveSession = async () => {
        const state = useQuizStore.getState();
        const empId = localStorage.getItem('currentUserEmpId') || 'EMP-456'; 
        
        try {
          await fetch('/api/quiz-sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              empId,
              finalScore: state.score,
              highestStreak: state.highestStreak || 0,
              questionsPlayed: state.playedQuestions,
              sessionLogs: state.sessionLogs,
            }),
          });

          await fetch('/api/users', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              empId,
              updates: { score: state.score }
            }),
          });
        } catch (error) {
          console.error('[QuizEngine] Failed to save session:', error);
        }
      };
      saveSession();
    }
  }, [activeQuestion, mounted, score]);

  if (!mounted) return <div className="min-h-screen w-full bg-[#050505]" />;

  if (!activeQuestion) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen w-full">
        <h1 className="text-3xl text-[#ff0055] font-black uppercase tracking-widest mb-4">Simulation Complete</h1>
        <p className="text-gray-400 font-mono mb-2">Final Score: {score}</p>
        <p className="text-yellow-400 font-mono mb-2">Coins Earned: {coinsEarned}</p>
        <p className="text-blue-400 font-mono mb-8">XP Earned: {xpEarned}</p>
        <button 
          onClick={() => {
            useQuizStore.getState().resetQuiz();
            router.push('/');
          }}
          className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const submitAnswer = (selected: string | null) => {
    const answer = activeQuestion.correctAnswer || '';
    let correct = false;
    
    
      if (activeQuestion.type === 'sequence' || activeQuestion.type === 'drag_and_drop') {
        try {
          const defaultOrder = JSON.stringify(activeQuestion.draggableItems?.map((i: any) => i.id) || []);
            const orderIds = JSON.parse(selected || defaultOrder);
          correct = JSON.stringify(orderIds) === JSON.stringify(activeQuestion.correctOrder);
        } catch(e) { correct = false; }
      } else if (selected) {
      correct = 
        selected === answer || 
        selected.startsWith(answer + '.') || 
        selected.startsWith(answer + ')') ||
        selected.includes(answer);
    }
      
    setIsCorrect(correct);
    setIsTimeout(false);
    setIsSubmitted(true);

    const diff = activeQuestion.difficulty?.toLowerCase() || '';
    let initialTime = 30;
    if (diff.includes('hard') || diff.includes('expert') || diff.includes('difficult')) initialTime = 60;
    else if (diff.includes('medium')) initialTime = 45;

    useQuizStore.getState().addLog({
      questionId: String(activeQuestion.id),
      isCorrect: correct,
      timeSpent: initialTime - timeLeft,
    });

    if (correct) {
      let xpEarned = 20;
      let coinsEarned = 10;
      if (diff.includes('hard') || diff.includes('expert') || diff.includes('difficult')) {
        xpEarned = 100;
        coinsEarned = 50;
      } else if (diff.includes('medium')) {
        xpEarned = 50;
        coinsEarned = 20;
      }

      useQuizStore.setState((state) => ({
        coinsEarned: state.coinsEarned + coinsEarned,
        xpEarned: state.xpEarned + xpEarned
      }));

      const empId = localStorage.getItem('currentUserEmpId') || 'EMP-456';
      fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empId,
          inc: { coins: coinsEarned, xp: xpEarned }
        })
      }).then(() => {
        // Broadcast to all connected clients that the leaderboard has updated
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || `http://${window.location.hostname}:3001`;
        const tempSocket = require('socket.io-client').io(socketUrl, { transports: ['websocket', 'polling'] });
        tempSocket.emit('trigger_refresh');
        setTimeout(() => tempSocket.disconnect(), 1000);
      }).catch(err => console.error('[QuizEngine] Real-time reward sync failed:', err));
    }
  };

  const handleAction = () => {
    if (!isSubmitted) {
      if (!selectedOption) return;
      submitAnswer(selectedOption);
    } else {
      // Log question ID to the permanent burn list
      const burnedQuestions = JSON.parse(localStorage.getItem('burned_questions') || '[]');
      if (activeQuestion && !burnedQuestions.includes(activeQuestion.id)) {
        burnedQuestions.push(activeQuestion.id);
        localStorage.setItem('burned_questions', JSON.stringify(burnedQuestions));
      }

      setSelectedOption(null);
      setIsSubmitted(false);
      setIsTimeout(false);
      setEliminatedOptions([]);
      
      // Call store for score/streak/multiplier side-effects only
      if (!isCorrect && useQuizStore.getState().inventory.shields > 0) {
         useQuizStore.getState().consumeItem('shields');
         advanceQuestion(true, 0); // Shield prevents streak loss
      } else {
         advanceQuestion(isCorrect, 10);
      }
      // Advance the local index — this is the ONLY index that drives which
      // question is displayed. It stays within the local 10-question array.
      setSoloQuestionIndex(prev => prev + 1);
    }
  };

  const handleSaveAndExit = async () => {
    const state = useQuizStore.getState();
    const empId = localStorage.getItem('currentUserEmpId') || 'EMP-456'; 
    
    try {
      await fetch('/api/quiz-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empId,
          finalScore: state.score,
          highestStreak: state.highestStreak || 0,
          questionsPlayed: state.playedQuestions,
          sessionLogs: state.sessionLogs,
        }),
      });

      // Increment total player coins and xp by the amounts earned in this session
      await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empId,
          inc: { 
            coins: state.coinsEarned,
            xp: state.xpEarned 
          }
        }),
      });
      
      console.log("Progress saved. Aborting simulation...");

    } catch (error) {
      console.error('[QuizEngine] Failed to save session:', error);
    }
    
    if (socket) {
      socket.emit('player_extracted', { targetId: socket.id });
    }

    useQuizStore.getState().resetQuiz();
    router.push('/');
  };

  if (isBriefing) {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-950 border border-red-500/50 rounded-lg p-8 max-w-2xl w-full shadow-[0_0_30px_rgba(220,38,38,0.15)] font-mono">
          <h2 className="text-3xl text-red-500 mb-6 tracking-widest text-center border-b border-red-900/30 pb-4">
            SYSTEM BRIEFING
          </h2>
          <ul className="space-y-4 text-gray-300 text-sm md:text-base mb-8 font-mono">
            <li><span className="text-red-400">»</span> Answer rapidly. Speed yields higher point multipliers.</li>
            <li><span className="text-red-400">»</span> Access the Black Market via the lower console to deploy tactical gadgets.</li>
            <li><span className="text-purple-400 font-bold">» GADGET EFFECT: Deploying an item will freeze the system timer for exactly 5 seconds.</span></li>
            <li><span className="text-yellow-400 font-bold">» SYSTEM EXIT: You must press "SAVE AND ABORT" to securely extract your progress before leaving.</span></li>
          </ul>
          <button 
            onClick={() => setIsBriefing(false)} 
            className="w-full bg-red-900/20 hover:bg-red-600 border border-red-500 text-white py-4 rounded font-bold tracking-[0.2em] transition-all duration-300 hover:shadow-[0_0_20px_rgba(220,38,38,0.4)]"
          >
            ACKNOWLEDGE & INITIATE
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-3 gap-8 w-full max-w-7xl mx-auto min-h-screen overflow-y-auto p-6 pb-8 relative transition-all ${isSabotaged ? 'animate-cyber-shake border-4 border-red-600' : ''}`}>
      <button 
        onClick={handleSaveAndExit}
        className="absolute top-6 left-6 bg-red-600 hover:bg-red-700 text-white font-mono text-xs px-4 py-2 rounded flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(220,38,38,0.4)] z-50"
      >
        <span className="text-lg font-bold">←</span> SAVE AND EXIT
      </button>
      
      {/* LEFT SIDE: QUIZ UI */}
      <div className="lg:col-span-2 flex flex-col w-full h-auto">

        <div className="w-full flex justify-between mb-4 text-gray-500 font-mono text-sm uppercase tracking-wider">
          <span>Unit {soloQuestionIndex + 1} / {questions.length}</span>
          <div className="flex items-center gap-4">
            {multiplier > 1 && (
              <span className="text-[#ff9900] font-black animate-pulse">🔥 {multiplier}X ACTIVE</span>
            )}
            <span className="text-yellow-400">🪙 {coinsEarned}</span>
            <span className="text-blue-400">✨ {xpEarned} XP</span>
          </div>
        </div>

        <div className="w-full h-auto bg-gray-900 border border-gray-800 p-6 pb-24 rounded-lg shadow-xl text-white flex flex-col relative min-h-[500px]">
          <div className="mb-4 text-xs font-mono text-[#ff0055] uppercase tracking-widest flex items-center justify-between border-b border-gray-800 pb-2">
            <div className="flex gap-4">
              <span>{activeQuestion.category}</span>
              <span className="text-gray-700">•</span>
              <span>{activeQuestion.difficulty}</span>
            </div>
            <div className={`font-black text-lg ${timeLeft <= 5 && !isSubmitted ? 'text-red-500 animate-pulse drop-shadow-[0_0_8px_rgba(255,0,0,0.8)]' : 'text-gray-400'}`}>
              00:{timeLeft.toString().padStart(2, '0')}
            </div>
          </div>
          
          <h2 className="text-xl font-bold mb-6 leading-relaxed">
            {activeQuestion.question}
          </h2>


          {(activeQuestion.type === 'sequence' || activeQuestion.type === 'drag_and_drop') && (
              <SequenceOrdering 
                items={currentSequence.length > 0 ? currentSequence : (activeQuestion.items || activeQuestion.draggableItems || [])}
                onChange={(val: any) => !isSubmitted && setSelectedOption(val)}
                disabled={isSubmitted}
                solvedCount={autoSolvedCount}
              />
            )}

            {(activeQuestion.type === 'mcq' || activeQuestion.type === 'true_false') && (
            activeQuestion.options && activeQuestion.options.length > 0 ? (
                <div className="space-y-3 mb-8">
                  {activeQuestion.options.map((option: string, index: number) => {
                    if (eliminatedOptions.includes(option)) return null;
                    const isSelected = selectedOption === option;
                  return (
                    <button
                      key={index}
                      onClick={() => !isSubmitted && setSelectedOption(option)}
                      disabled={isSubmitted}
                      className={`w-full text-left p-4 rounded border transition-colors ${
                        isSelected 
                          ? 'bg-[#ff0055]/20 border-[#ff0055] text-white' 
                          : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500 hover:bg-gray-750'
                      } ${isSubmitted ? 'opacity-75 cursor-not-allowed' : ''}`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="bg-red-900/20 border border-red-500 p-6 rounded-lg text-center font-mono mb-8">
                <span className="text-red-500 text-xl block mb-2">⚠️ DATA CORRUPTION DETECTED</span>
                <p className="text-gray-300 text-sm">No operational parameters loaded for this sequence. (Check database payload for this question).</p>
                <button 
                  onClick={() => advanceQuestion(false, 0)}
                  className="mt-4 bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded text-xs tracking-widest cursor-pointer"
                >
                  FORCE SKIP →
                </button>
              </div>
            )
          )}

          {isSubmitted && (
            <div className={`mb-8 p-4 border rounded ${isCorrect ? 'bg-green-900/20 border-green-500' : 'bg-red-900/20 border-red-500'}`}>
              <h3 className={`text-lg font-black uppercase tracking-widest mb-2 ${isCorrect ? 'text-green-500' : 'text-red-500'}`}>
                {isTimeout ? 'INCORRECT - TIME EXPIRED' : (isCorrect ? 'CORRECT' : 'INCORRECT')}
              </h3>
              <p className="text-gray-300 mb-2 font-bold">
                Correct Answer: {activeQuestion.correctAnswer}
              </p>
              <p className="text-gray-400 text-sm">
                {activeQuestion.explanation}
              </p>
            </div>
          )}

          <div className="mt-auto">
            <button
              onClick={handleAction}
              disabled={!isSubmitted && !selectedOption}
              className="w-full mt-4 py-4 bg-[#ff0055] text-white font-black uppercase tracking-widest hover:bg-[#cc0044] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitted ? 'NEXT QUESTION' : 'Submit Intel'}
            </button>
          </div>

          {/* INJECT GADGET DEPLOYMENT BUTTON */}
          <div className="absolute bottom-6 left-6 z-40">
            <button 
              onClick={() => (document.getElementById('inventory-modal') as HTMLDialogElement)?.showModal()}
              className="bg-purple-900/60 hover:bg-purple-600 border border-purple-500 text-white px-6 py-3 rounded-full font-mono text-sm tracking-widest shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all cursor-pointer"
            >
              DEPLOY GADGET 🛠️
            </button>
            
            {/* Simple native dialog for inventory */}
            <dialog id="inventory-modal" className="bg-gray-950 border border-purple-500 p-6 rounded-lg text-white font-mono backdrop:bg-black/80 w-80">
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
                       const store = useQuizStore.getState();
                       store.consumeItem(key as any);
                       
                       if (key === 'timeFreezes') {
                         setIsTimerFrozen(true);
                         setTimeout(() => setIsTimerFrozen(false), 10000); // Thaws after 10 seconds
                       } else if (key === 'overclocks') {
                         store.addXP(250);
                       } else if (key === 'hints') {
                           const answer = activeQuestion.correctAnswer || '';
                           const wrongOptions = activeQuestion.options?.filter((o: string) => !(o === answer || o.startsWith(answer + '.') || o.startsWith(answer + ')') || o.includes(answer))) || [];
                           if (wrongOptions.length > 0) {
                             setEliminatedOptions([wrongOptions[0], wrongOptions[1]].filter(Boolean));
                           }
                         } else if (key === 'autoSorters') {
                           if (activeQuestion.type !== 'sequence' && activeQuestion.type !== 'drag_and_drop') {
                             alert('Auto-Sorters can only be deployed on sequence questions.');
                             useQuizStore.getState().buyItem('autoSorters', 0);
                           } else {
                             const correctIds = activeQuestion.correctOrder.slice(0, 2);
                             const correctItems = correctIds.map((id: string) => currentSequence.find(i => i.id === id)).filter(Boolean);
                             const remainingItems = currentSequence.filter(i => !correctIds.includes(i.id));
                             const newOrder = [...correctItems, ...remainingItems];
                             setCurrentSequence(newOrder);
                             setAutoSolvedCount(correctItems.length);
                             setSelectedOption(JSON.stringify(newOrder.map(i => i.id)));
                           }
                         } else if (['sabotagers', 'ddosEmps', 'decoys'].includes(key)) {
                           alert('This tactical asset is reserved for 1v1 Multiplayer engagements.');
                           useQuizStore.getState().buyItem(key as any, 0); // refund
                         }
                       
                       (document.getElementById('inventory-modal') as HTMLDialogElement)?.close();
                     }}
                     className="block w-full text-left p-3 mb-2 bg-purple-900/20 hover:bg-purple-600 text-sm border border-purple-900 rounded cursor-pointer"
                   >
                     {">"} {key.toUpperCase()} (x{count})
                   </button>
                 ))
               )}
               <button onClick={() => (document.getElementById('inventory-modal') as HTMLDialogElement)?.close()} className="mt-4 text-gray-500 hover:text-white text-xs w-full text-right cursor-pointer">
                 [ CLOSE ]
               </button>
            </dialog>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: LEADERBOARD */}
      <div className="lg:col-span-1 w-full h-full bg-gray-900 border border-gray-800 rounded-lg shadow-xl overflow-hidden flex flex-col">
        <LiveLeaderboard />
      </div>

      {activeMedia && (
        <div className="fixed inset-0 z-[10000] bg-black flex justify-center items-center pointer-events-none">
          {activeMedia.type === 'video' && (
            <video src={activeMedia.url} autoPlay playsInline onEnded={() => setActiveMedia(null)} className="w-full h-full object-cover" />
          )}
          {activeMedia.type === 'image' && (
            <img src={activeMedia.url} className="max-h-[80vh] w-full object-contain animate-pulse" alt="Compromised" />
          )}
          {activeMedia.type === 'audio' && (
            <div className="text-center">
              <h1 className="text-red-600 text-6xl font-black animate-ping mb-4">⚠️ MALWARE DETECTED ⚠️</h1>
              <p className="text-white text-2xl font-bold">Listen carefully...</p>
            </div>
          )}
        </div>
      )}

      {isSabotaged && (
        <div className="fixed inset-0 z-[9999] pointer-events-none bg-red-900/30 backdrop-hue-rotate-90 flex flex-col items-center justify-center">
          <div className="bg-black/90 border border-red-500 p-6 rounded-lg shadow-[0_0_50px_rgba(239,68,68,0.8)] text-center animate-pulse">
            <h2 className="text-red-500 font-mono text-3xl font-black tracking-widest mb-2">SYSTEM COMPROMISED</h2>
            <p className="text-white font-mono text-lg">{sabotageMessage}</p>
          </div>
        </div>
      )}

      {quizMode === 'wager' && (
        <div className="absolute inset-0 bg-red-900/90 z-40 flex flex-col items-center justify-center border-8 border-red-600 animate-pulse">
          <h2 className="text-4xl font-black text-white">🔥 HIGH STAKES WAGER 🔥</h2>
          <p className="text-xl text-red-200 mt-2">Bet your coins. Double the payout, or lose it all.</p>
          {/* Betting input and Wager Question component go here */}
        </div>
      )}

      {qrEvent.active && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-950 border-2 border-yellow-500 p-8 rounded-lg shadow-[0_0_50px_rgba(234,179,8,0.4)] z-50 text-center animate-pulse w-[90%] max-w-md">
          
          {/* Quick Close 'X' in top right */}
          <button 
            onClick={() => setQrEvent({ active: false, payload: "" })} 
            className="absolute top-3 right-4 text-gray-500 hover:text-white font-mono text-2xl transition-colors"
          >
            &times;
          </button>

          <h3 className="text-yellow-500 font-bold font-mono text-3xl mb-2 tracking-widest uppercase drop-shadow-[0_0_10px_rgba(234,179,8,0.8)]">
            🎁 LOOT DROP 🎁
          </h3>
          
          <p className="text-gray-200 text-sm mb-4 font-mono leading-relaxed">
            Scan immediately to claim:
            <br/>
            <span className="text-blue-400 font-bold text-lg drop-shadow-[0_0_5px_rgba(96,165,250,0.8)]">⚡ FREE XP</span> | 
            <span className="text-green-400 font-bold text-lg drop-shadow-[0_0_5px_rgba(74,222,128,0.8)]"> 💰 BONUS COINS</span> | 
            <span className="text-purple-400 font-bold text-lg drop-shadow-[0_0_5px_rgba(168,85,247,0.8)]"> 🛠️ GADGETS</span>
          </p>
          
          <div className="bg-white p-4 inline-block rounded-xl shadow-[0_0_25px_rgba(255,255,255,0.3)] mb-6">
            <QRCodeSVG 
              value={qrEvent.payload} 
              size={200} 
              bgColor={"#ffffff"} 
              fgColor={"#000000"} 
              level={"H"}
            />
          </div>
          
          {/* Massive Skip Button */}
          <button 
            onClick={() => setQrEvent({ active: false, payload: "" })} 
            className="block w-full bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white py-4 rounded font-mono text-sm tracking-[0.2em] transition-all"
          >
            SKIP & RETURN TO QUIZ
          </button>
        </div>
      )}
    </div>
  );
}











