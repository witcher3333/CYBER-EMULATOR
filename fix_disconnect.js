const fs = require('fs');
let content = fs.readFileSync('socket-server/index.js', 'utf8');

const disconnectLogic = `
  socket.on('disconnect', () => {
    console.log('[SOCKET_SERVER] Client disconnected:', socket.id);
    
    // Check if player was in any battle
    for (const [matchId, battle] of battleRooms.entries()) {
      if (battle.p1EmpId === currentEmpId || battle.p2EmpId === currentEmpId) {
        console.log(\`[SOCKET_SERVER] Player \${currentEmpId} disconnected during battle \${matchId}. Forfeiting...\`);
        const winner = battle.p1EmpId === currentEmpId ? 'target' : 'challenger';
        io.to(matchId).emit('battle_over', { winner, reason: 'forfeit', forfeitedBy: currentEmpId });
        battleRooms.delete(matchId);
      }
    }
`;

content = content.replace(
  /socket\.on\('disconnect', \(\) => \{\s*console\.log\(`\[SOCKET_SERVER\] Client disconnected: \$\{socket\.id\}`\);/g,
  disconnectLogic
);

fs.writeFileSync('socket-server/index.js', content);
console.log('Added disconnect forfeit logic');
