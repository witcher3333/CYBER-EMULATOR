const fs = require('fs');
let content = fs.readFileSync('src/app/battle/page.tsx', 'utf8');

const sessionEffect = `
  useEffect(() => {
    if (sessionTimer > 0) {
      const id = setInterval(() => setSessionTimer(p => p - 1), 1000);
      return () => clearInterval(id);
    } else if (sessionTimer === 0) {
      alert("Session Time Limit Reached! The Matrix has collapsed.");
      window.location.href = '/';
    }
  }, [sessionTimer]);

  useEffect(() => {
`;

content = content.replace(
  '  useEffect(() => {\n    if (questions.length === 0 || hasAnswered) return;',
  sessionEffect + '    if (questions.length === 0 || hasAnswered) return;'
);

// Reset timer to 30 on next round
content = content.replace(
  /setTimer\(15\);/g,
  'setTimer(30);'
);

fs.writeFileSync('src/app/battle/page.tsx', content);
console.log('Added sessionTimer logic');
