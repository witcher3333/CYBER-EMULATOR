const fs = require('fs');
let content = fs.readFileSync('src/app/battle/page.tsx', 'utf8');

// 1. Add screenFrozen state
content = content.replace(
  /const \[animationState, setAnimationState\] = useState\('idle'\);/,
  'const [animationState, setAnimationState] = useState(\'idle\');\n  const [screenFrozen, setScreenFrozen] = useState(false);'
);

// 2. Add screenFrozen socket listener
const freezeListener = `
        currentSocket.on('screen_freeze_received', (data) => {
          setScreenFrozen(true);
          setTimeout(() => setScreenFrozen(false), 10000);
        });
        currentSocket.on('ddos_received', (data) => {`;
content = content.replace(
  /currentSocket\.on\('ddos_received', \(data\) => \{/,
  freezeListener.trim()
);

// 3. Add system_zap animation state handling
const animStateHandling = `
          if (myAnswer.isCorrect && oppAnswer.isCorrect) { setAnimationState('both_correct'); }
          else if (myAnswer.isCorrect && !oppAnswer.isCorrect) { setAnimationState('player_shoot'); setTimeout(() => { if (isMounted) setAnimationState('opponent_damage'); }, 500); }
          else if (!myAnswer.isCorrect && oppAnswer.isCorrect) { setAnimationState('opponent_shoot'); setTimeout(() => { if (isMounted) setAnimationState('player_damage'); }, 500); }
          else { setAnimationState('system_zap'); } // BOTH WRONG -> LASER
`;
content = content.replace(
  /if \(myAnswer\.isCorrect && oppAnswer\.isCorrect\) \{[\s\S]*?else \{ setAnimationState\('both_shoot'\); setTimeout\(\(\) => \{ if \(isMounted\) setAnimationState\('both_damage'\); \}, 500\); \}/,
  animStateHandling.trim()
);

// Update derived damage variables to include system_zap
content = content.replace(
  /const playerDmg = animationState === 'player_damage' \|\| animationState === 'both_damage';\s*const opponentDmg = animationState === 'opponent_damage' \|\| animationState === 'both_damage';/,
  `const playerDmg = animationState === 'player_damage' || animationState === 'both_damage' || animationState === 'system_zap';\n  const opponentDmg = animationState === 'opponent_damage' || animationState === 'both_damage' || animationState === 'system_zap';`
);
if (!content.includes('system_zap')) {
    content = content.replace(
        /const playerDmg = /g,
        `// @ts-ignore\n  const playerDmg = ` // just in case it doesn't match perfectly, though I can just rewrite the exact block.
    );
}

// Ensure derived damage states actually include system_zap
const derivedStates = `
  const isChallenger = localUser?.empId === challengerId;
  const bump = animationState === 'both_correct';
  const playerDmg = animationState === 'player_damage' || animationState === 'both_damage' || animationState === 'system_zap';
  const opponentDmg = animationState === 'opponent_damage' || animationState === 'both_damage' || animationState === 'system_zap';
`;
content = content.replace(
  /const isChallenger = localUser\?\.empId === challengerId;\s*const bump = animationState === 'both_correct';\s*const playerDmg = [^\n]*;\s*const opponentDmg = [^\n]*;/,
  derivedStates.trim()
);

// 4. Inject screen freeze overlay and system_zap lasers
const lasersAndFreeze = `
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
`;
content = content.replace(
  /<div className="h-screen w-screen bg-\[#030005\] text-white flex flex-col font-mono overflow-hidden select-none">/,
  lasersAndFreeze.trim()
);

// 5. Add Low HP Blinking
content = content.replace(
  /<div className="drop-shadow-\[0_0_20px_rgba\(16,185,129,0\.3\)\]">/g,
  `<div className={\`drop-shadow-[0_0_20px_rgba(16,185,129,0.3)] \${playerHp <= 20 ? 'animate-[pulse_0.5s_infinite] drop-shadow-[0_0_20px_rgba(255,0,0,0.8)]' : ''}\`}>`
);
content = content.replace(
  /<div className="drop-shadow-\[0_0_20px_rgba\(255,0,85,0\.3\)\]" style=\{\{ transform: 'scaleX\(-1\)' \}\}>/g,
  `<div className={\`drop-shadow-[0_0_20px_rgba(255,0,85,0.3)] \${opponentHp <= 20 ? 'animate-[pulse_0.5s_infinite] drop-shadow-[0_0_20px_rgba(255,0,0,0.8)]' : ''}\`} style={{ transform: 'scaleX(-1)' }}>`
);

// 6. Disable options if screen is frozen
content = content.replace(
  /disabled=\{hasAnswered\}/g,
  'disabled={hasAnswered || screenFrozen}'
);
content = content.replace(
  /if \(hasAnswered\) return;/g,
  'if (hasAnswered || screenFrozen) return;'
);

// 7. Add screenFreezes to gadget inventory modal logic
const gadgetLogic = `
                     if (key === 'timeFreezes') {
                       setTimer(prev => prev + 10);
                     } else if (key === 'screenFreezes') {
                       socket?.emit('player_screen_freeze', { targetId: opponent.empId });
                     } else if (key === 'sabotagers') {
`;
content = content.replace(
  /if \(key === 'timeFreezes'\) \{\s*setTimer\(prev => prev \+ 10\);\s*\} else if \(key === 'sabotagers'\) \{/,
  gadgetLogic.trim()
);

fs.writeFileSync('src/app/battle/page.tsx', content);
console.log('Battle page updated with laser, freeze, and blinking');
