const fs = require('fs');
let content = fs.readFileSync('socket-server/index.js', 'utf8');

const freezeLogic = `
  socket.on('player_ddos', ({ targetId }) => {
    if (userSockets.has(targetId)) {
      io.to(userSockets.get(targetId)).emit('ddos_received', { attackerName: parsedUser?.username || 'Opponent' });
    }
  });

  socket.on('player_screen_freeze', ({ targetId }) => {
    if (userSockets.has(targetId)) {
      io.to(userSockets.get(targetId)).emit('screen_freeze_received', { attackerName: parsedUser?.username || 'Opponent' });
    }
  });
`;

content = content.replace(
  /socket\.on\('player_ddos', \(\{ targetId \}\) => \{[\s\S]*?\}\);/,
  freezeLogic.trim()
);

fs.writeFileSync('socket-server/index.js', content);
console.log('Added player_screen_freeze');
