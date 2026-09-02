const fs = require('fs');
let content = fs.readFileSync('src/app/battle/page.tsx', 'utf8');

// Change timer to 30 and add sessionTimer
content = content.replace(
  'const [timer, setTimer] = useState(15);',
  'const [timer, setTimer] = useState(30);\n  const [sessionTimer, setSessionTimer] = useState(300);'
);

fs.writeFileSync('src/app/battle/page.tsx', content);
console.log('Added sessionTimer state');
