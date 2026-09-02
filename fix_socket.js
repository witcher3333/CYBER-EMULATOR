const fs = require('fs');
let content = fs.readFileSync('socket-server/index.js', 'utf8');

// Fix disconnect logic to only delete if the socket ID matches
content = content.replace(
  'userSockets.delete(currentEmpId);',
  'if (userSockets.get(currentEmpId) === socket.id) { userSockets.delete(currentEmpId); }'
);

fs.writeFileSync('socket-server/index.js', content);
console.log('Fixed socket-server disconnect logic');
