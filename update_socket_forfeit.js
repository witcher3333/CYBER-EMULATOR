const fs = require('fs');
let content = fs.readFileSync('socket-server/index.js', 'utf8');

const forfeitLogic = `
  socket.on('player_forfeit', ({ matchId, empId, isChallenger }) => {
    console.log(\`[SOCKET_SERVER] \${empId} forfeited match \${matchId}\`);
    const winner = isChallenger ? 'target' : 'challenger';
    io.to(matchId).emit('battle_over', { winner, reason: 'forfeit', forfeitedBy: empId });
    battleRooms.delete(matchId);
  });

  socket.on('disconnect', () => {
`;

content = content.replace(
  /socket\.on\('disconnect', \(\) => \{/g,
  forfeitLogic
);

fs.writeFileSync('socket-server/index.js', content);
console.log('Fixed socket-server forfeit logic');
