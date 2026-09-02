const fs = require('fs');
let content = fs.readFileSync('src/app/battle/page.tsx', 'utf8');

// 1. Add socket listeners for gadgets
const listeners = `
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
      currentSocket.on('battle_update', (data) => {`;
      
content = content.replace(
  '      currentSocket.on(\'battle_update\', (data) => {',
  listeners
);

// 2. Fix handleOptionClick logic
const handleOptFix = `
    const handleOptionClick = (option: string) => {
      if (hasAnswered) return;
      setHasAnswered(true); setSelectedOption(option);
      const ans = questions[currentRound]?.correctAnswer;
      const correct = option === ans || option.startsWith(ans + '.') || option.startsWith(ans + ')');
      setIsCorrect(correct);
      socket?.emit('submit_battle_answer', { matchId, empId: localUser?.empId, isCorrect: correct, damage: correct ? 0 : getDmg(currentRound), isChallenger });
    };`;
    
content = content.replace(
  /const handleOptionClick = \(option: string\) => \{[\s\S]*?\}\s*;/g,
  handleOptFix.trim()
);

// 3. Fix JSX class generation & remove hardcoded A/B/C/D
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
console.log('Fixed battle page logic');
