const fs = require('fs');
let content = fs.readFileSync('src/app/battle/page.tsx', 'utf8');

// Remove misplaced HUD elements
content = content.replace(
  /\{\/\* HUD \*\/\}\s*<div className="flex flex-col items-center shrink-0">[\s\S]*?FORFEIT\s*<\/button>\s*<\/div>\s*<div className="flex items-center justify-between/g,
  '{/* HUD */}\n      <div className="flex items-center justify-between'
);

// Inject Session Timer into center column
content = content.replace(
  '<p className="text-[9px] text-gray-600 font-black tracking-[0.2em] uppercase mb-1">ROUND {currentRound + 1}</p>',
  '<p className="text-sm text-[#ff0055] font-black tracking-[0.2em] uppercase mb-2 drop-shadow-[0_0_5px_rgba(255,0,85,0.8)]">SESSION: {Math.floor(sessionTimer/60)}:{(sessionTimer%60).toString().padStart(2, \'0\')}</p>\n          <p className="text-[9px] text-gray-600 font-black tracking-[0.2em] uppercase mb-1">ROUND {currentRound + 1}</p>'
);

// Inject Forfeit button next to Deploy Gadget
content = content.replace(
  '{/* INJECT GADGET DEPLOYMENT BUTTON */}',
  '{/* INJECT GADGET DEPLOYMENT BUTTON */}\n      <div className="absolute bottom-6 right-6 z-40">\n        <button onClick={handleForfeit} className="bg-red-900/60 hover:bg-red-600 border border-red-500 text-white px-4 py-2 rounded-full font-mono text-[10px] sm:text-xs tracking-widest transition-all cursor-pointer shadow-[0_0_15px_rgba(255,0,85,0.4)]">FORFEIT MATCH</button>\n      </div>'
);

// Add isChallenger to handleForfeit emit
content = content.replace(
  /router\.push\('\/'\);\n    }/g,
  'socket?.emit(\'player_forfeit\', { matchId, empId: localUser?.empId, isChallenger });\n       router.push(\'/\');\n    }'
);

// Update battle_over listener to handle reason: forfeit
const battleOverLogic = `
      currentSocket.on('battle_over', async (data) => {
        const iWon = (data.winner === 'challenger' && parsedUser.empId === challengerId) || (data.winner === 'target' && parsedUser.empId !== challengerId);
        
        if (data.reason === 'forfeit') {
          if (data.forfeitedBy !== parsedUser.empId) {
             alert('Opponent forfeited! You win 300 Coins and 200 XP!');
             try { await fetch('/api/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ empId: parsedUser.empId, updates: { coins: (parsedUser.coins || 0) + 300, xp: (parsedUser.xp || 0) + 200 } }) }); } catch {}
             router.push('/');
          }
          return;
        }

        if (iWon) {
`;
content = content.replace(
  /currentSocket\.on\('battle_over', async \(data\) => \{\s*const iWon = [^\n]*\n\s*if \(iWon\) \{/g,
  battleOverLogic
);

fs.writeFileSync('src/app/battle/page.tsx', content);
console.log('Fixed battle page');
