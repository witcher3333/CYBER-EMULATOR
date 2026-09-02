const fs = require('fs');

let content = fs.readFileSync('src/app/battle/page.tsx', 'utf8');

// 1. Increase timer to 30
content = content.replace('const [timer, setTimer] = useState(15);', 'const [timer, setTimer] = useState(30);');
content = content.replace(/setTimer\(15\)/g, 'setTimer(30)');

// 2. Add state and session timer, hasAcceptedRules
const stateInjections = `
  const [sessionTimer, setSessionTimer] = useState(300);
  const [hasAcceptedRules, setHasAcceptedRules] = useState(false);
`;
content = content.replace("const [animationState, setAnimationState] = useState('idle');", "const [animationState, setAnimationState] = useState('idle');" + stateInjections);

// 3. Add handleForfeit
const forfeitMethod = `
  const handleForfeit = async () => {
    const confirm = window.confirm("DISCLAIMER: By forfeiting the match, you will lose 200 XP and 100 Coins. Do you wish to proceed?");
    if (confirm) {
       try { await fetch('/api/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ empId: localUser?.empId, inc: { coins: -100, xp: -200 } }) }); } catch {}
       alert("You have forfeited. 200 XP and 100 Coins have been deducted.");
       router.push('/');
    }
  };
`;
content = content.replace("const handleTimeOut = () => {", forfeitMethod + "\n  const handleTimeOut = () => {");

// 4. Add session timer useEffect
const sessionEffect = `
  useEffect(() => {
    if (!hasAcceptedRules) return;
    if (sessionTimer > 0) {
      const id = setInterval(() => setSessionTimer(p => p - 1), 1000);
      return () => clearInterval(id);
    } else {
      alert("Session Time Limit Reached! It's a DRAW.");
      router.push('/');
    }
  }, [sessionTimer, hasAcceptedRules, router]);
`;
content = content.replace("const handleOptionClick", sessionEffect + "\n  const handleOptionClick");

// 5. Add socket event listeners for gadgets
const socketListeners = `
      currentSocket.on('ddos_received', (data) => {
        if (isMounted) {
          alert(\`CRITICAL WARNING: DDoS Attack from \${data.attackerName}! Your timer is halved!\`);
          setTimer(prev => Math.floor(prev / 2));
        }
      });
      currentSocket.on('sabotage_received', async (data) => {
        if (isMounted) {
          const inventory = useQuizStore.getState().inventory;
          if (inventory.decoys > 0) {
            alert(\`SABOTAGE BLOCKED! Your Decoy absorbed an attack from \${data.attackerName}.\`);
            useQuizStore.getState().consumeItem('decoys');
          } else {
            alert(\`SABOTAGE! You were hit by \${data.attackerName}. Lost \${data.penaltyXp} XP!\`);
            try { await fetch('/api/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ empId: parsedUser.empId, inc: { xp: -data.penaltyXp } }) }); } catch {}
          }
        }
      });
`;
content = content.replace("currentSocket.on('battle_data_sync', (data) => { if (isMounted) setQuestions(data.questions); });", "currentSocket.on('battle_data_sync', (data) => { if (isMounted) setQuestions(data.questions); });" + socketListeners);

// 6. Alert for overclocks
content = content.replace(/fetch\('\/api\/users', { method: 'PATCH'.*?xp: 250.*?}\);/, "fetch('/api/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ empId: localUser?.empId, inc: { xp: 250 } }) }); alert('Overclock deployed! Gained 250 XP.');");

// 7. Inject Modal and Session Timer Display, Forfeit Button
const renderInjection = `
  if (!hasAcceptedRules) {
    return (
      <div className="h-screen w-screen bg-[#030005] flex flex-col items-center justify-center font-mono z-[100] relative p-4">
        <div className="bg-[#111] border border-[#ff0055] p-8 rounded-lg max-w-lg text-center shadow-[0_0_30px_rgba(255,0,85,0.4)]">
          <h2 className="text-[#ff0055] text-2xl font-black mb-4 uppercase">Matrix Rules</h2>
          <p className="text-white mb-6">once you enter the simulation you can not exit before the session timer ends</p>
          <button 
            onClick={() => setHasAcceptedRules(true)}
            className="bg-[#ff0055] hover:bg-[#e60039] text-white px-6 py-3 rounded-xl font-bold font-mono transition-all cursor-pointer"
          >
            I UNDERSTAND, ENTER SIMULATION
          </button>
        </div>
      </div>
    );
  }
`;
content = content.replace("const currentQ  = questions[currentRound];", renderInjection + "\n  const currentQ  = questions[currentRound];");

// Timer and forfeit UI in HUD
const uiAdditions = `
        <div className="flex flex-col items-center shrink-0">
          <p className="text-[9px] text-[#ff0055] font-black tracking-[0.2em] uppercase mb-1">SESSION: {Math.floor(sessionTimer/60)}:{(sessionTimer%60).toString().padStart(2, '0')}</p>
        </div>
        <div className="absolute top-24 right-4 sm:top-20 sm:right-6 z-40">
          <button 
            onClick={handleForfeit}
            className="bg-red-900/60 hover:bg-red-600 border border-red-500 text-white px-3 py-1.5 rounded-full font-mono text-[9px] sm:text-xs tracking-widest transition-all cursor-pointer shadow-[0_0_15px_rgba(255,0,85,0.4)]"
          >
            FORFEIT
          </button>
        </div>
`;
content = content.replace("{/* HUD */}", "{/* HUD */}" + uiAdditions);

fs.writeFileSync('src/app/battle/page.tsx', content);
console.log('Successfully updated battle/page.tsx');
