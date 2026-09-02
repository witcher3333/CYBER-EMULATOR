const fs = require('fs');
let content = fs.readFileSync('src/app/battle/page.tsx', 'utf8');

const handleForfeitLogic = `
  const handleForfeit = async () => {
    const confirm = window.confirm("DISCLAIMER: By forfeiting the match, you will lose 200 XP and 100 Coins. Do you wish to proceed?");
    if (confirm) {
       try { await fetch('/api/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ empId: localUser?.empId, inc: { coins: -100, xp: -200 } }) }); } catch {}
       alert("You have forfeited. 200 XP and 100 Coins have been deducted.");
       socket?.emit('player_forfeit', { matchId, empId: localUser?.empId, isChallenger });
       window.location.href = '/';
    }
  };

  const currentQ`;

content = content.replace(
  '  const currentQ',
  handleForfeitLogic
);

fs.writeFileSync('src/app/battle/page.tsx', content);
console.log('Added handleForfeit');
