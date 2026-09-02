const fs = require('fs');
let content = fs.readFileSync('src/app/battle/page.tsx', 'utf8');

// 1. States
content = content.replace(
  'const [timer, setTimer] = useState(15);',
  'const [timer, setTimer] = useState(30);\n  const [sessionTimer, setSessionTimer] = useState(300);'
);

// 2. sessionTimer effect
const sessionEffect = `
  useEffect(() => {
    if (sessionTimer > 0) {
      const id = setInterval(() => setSessionTimer(p => p - 1), 1000);
      return () => clearInterval(id);
    } else if (sessionTimer === 0) {
      alert("Session Time Limit Reached! The Matrix has collapsed.");
      window.location.href = '/';
    }
  }, [sessionTimer]);

  useEffect(() => {`;
content = content.replace(
  '  useEffect(() => {\n    if (questions.length === 0 || hasAnswered) return;',
  sessionEffect + '\n    if (questions.length === 0 || hasAnswered) return;'
);

// 3. Reset timer to 30
content = content.replace(/setTimer\(15\);/g, 'setTimer(30);');

// 4. Gadget socket listeners & forfeit logic in battle_over
const battleOverLogic = `
      currentSocket.on('ddos_received', (data) => {
        alert(\`[!] INCOMING DDOS FROM \${data.attackerName}! SYSTEM GLITCHING!\`);
        setTimer(prev => Math.max(1, prev - 5));
      });
      currentSocket.on('sabotage_received', async (data) => {
        const { useQuizStore } = require('@/store/quizStore');
        const st = useQuizStore.getState();
        if (st.inventory.decoys && st.inventory.decoys > 0) {
           st.consumeItem('decoys');
           alert(\`[DEFLECTED] Sabotage from \${data.attackerName} was blocked by your DECOY!\`);
           return;
        }
        alert(\`[!] SABOTAGE DETECTED! Lost \${data.penaltyXp} XP from \${data.attackerName}!\`);
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

        if (iWon) {`;
content = content.replace(
  /currentSocket\.on\('battle_over', async \(data\) => \{\s*const iWon = [^\n]*\n\s*if \(iWon\) \{/g,
  battleOverLogic
);

// 5. handleForfeit and handleOptionClick
const logicBlock = `
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
      if (hasAnswered) return;
      setHasAnswered(true); setSelectedOption(option);
      const ans = questions[currentRound]?.correctAnswer;
      const correct = option === ans || option.startsWith(ans + '.') || option.startsWith(ans + ')');
      setIsCorrect(correct);
      socket?.emit('submit_battle_answer', { matchId, empId: localUser?.empId, isCorrect: correct, damage: correct ? 0 : getDmg(currentRound), isChallenger });
    };

    if (questions.length === 0 || !localUser) {
`;
content = content.replace(
  /const handleOptionClick = \(option: string\) => \{[\s\S]*?if \(questions\.length === 0 \|\| !localUser\) \{/,
  logicBlock
);

// 6. HUD Layout Top
content = content.replace(
  /\{\/\* HUD \*\/\}\s*<div className="flex flex-col items-center shrink-0">[\s\S]*?FORFEIT\s*<\/button>\s*<\/div>\s*<div className="flex items-center justify-between/g,
  '{/* HUD */}\n      <div className="flex items-center justify-between'
);

// 7. HUD Session Timer
content = content.replace(
  '<p className="text-[9px] text-gray-600 font-black tracking-[0.2em] uppercase mb-1">ROUND {currentRound + 1}</p>',
  '<p className="text-sm text-[#ff0055] font-black tracking-[0.2em] uppercase mb-2 drop-shadow-[0_0_5px_rgba(255,0,85,0.8)]">SESSION: {Math.floor(sessionTimer/60)}:{(sessionTimer%60).toString().padStart(2, \'0\')}</p>\n          <p className="text-[9px] text-gray-600 font-black tracking-[0.2em] uppercase mb-1">ROUND {currentRound + 1}</p>'
);

// 8. HUD Forfeit Button (bottom right)
content = content.replace(
  '{/* INJECT GADGET DEPLOYMENT BUTTON */}',
  '{/* INJECT GADGET DEPLOYMENT BUTTON */}\n      <div className="absolute bottom-6 right-6 z-40">\n        <button onClick={handleForfeit} className="bg-red-900/60 hover:bg-red-600 border border-red-500 text-white px-4 py-2 rounded-full font-mono text-[10px] sm:text-xs tracking-widest transition-all cursor-pointer shadow-[0_0_15px_rgba(255,0,85,0.4)]">FORFEIT MATCH</button>\n      </div>'
);

// 9. Answer Option UI Fix
const jsxFix = `
              {currentQ.options.map((option: string, i: number) => {
                let cls = 'bg-[#0d0d0d] border-[#1c1c1c] text-gray-400 hover:bg-[#141414] hover:border-gray-700 cursor-pointer';
                const ans = currentQ.correctAnswer;
                const isCorrectOpt = option === ans || option.startsWith(ans + '.') || option.startsWith(ans + ')');
                
                if (hasAnswered) {
                  if (isCorrectOpt) cls = 'bg-[#10b981]/10 border-[#10b981] text-[#10b981] shadow-[0_0_15px_rgba(16,185,129,0.2)]';
                  else if (option === selectedOption) cls = 'bg-[#ff0055]/10 border-[#ff0055] text-[#ff0055] shadow-[0_0_15px_rgba(255,0,85,0.2)]';
                  else cls = 'bg-[#080808] border-[#111] text-gray-700 opacity-40 cursor-default';
                } else if (option === selectedOption) { cls = 'bg-[#161616] border-gray-600 text-white'; }
                return (
                  <button key={i} onClick={() => handleOptionClick(option)} disabled={hasAnswered}
                    className={\`p-3 md:p-4 rounded border-2 font-mono text-xs md:text-sm transition-all active:scale-95 text-left leading-snug \${cls}\`}>
                    {option}
                  </button>
                );
              })}
`;
content = content.replace(
  /\{currentQ\.options\.map\(\(option: string, i: number\) => \{[\s\S]*?\}\)\}/,
  jsxFix.trim()
);

fs.writeFileSync('src/app/battle/page.tsx', content);
console.log('Restored all battle page features');
