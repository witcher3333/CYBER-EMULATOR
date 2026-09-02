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
`;

if (!content.includes('setSessionTimer(p => p - 1)')) {
  content = content.replace(
    /\s*useEffect\(\(\) => \{\s*if \(questions\.length === 0 \|\| hasAnswered\) return;/g,
    '\n' + sessionEffect + '\n  useEffect(() => {\n    if (questions.length === 0 || hasAnswered) return;'
  );
  fs.writeFileSync('src/app/battle/page.tsx', content);
  console.log('Fixed sessionTimer');
} else {
  console.log('Already fixed');
}
