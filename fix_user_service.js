const fs = require('fs');
let content = fs.readFileSync('src/services/UserService.ts', 'utf8');

content = content.replace(
  '        if (key === \'coins\') {',
  '        if (key === \'coins\' || key === \'xp\') {'
);
content = content.replace(
  '           const newCoins = (currentUser.coins || 0) + (val as number);\n           updateQuery..coins = Math.max(0, newCoins);',
  '           const newVal = (currentUser[key] || 0) + (val as number);\n           updateQuery.[key] = Math.max(0, newVal);'
);

fs.writeFileSync('src/services/UserService.ts', content);
console.log('Fixed UserService for xp and coins');
