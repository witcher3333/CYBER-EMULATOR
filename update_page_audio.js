const fs = require('fs');
let content = fs.readFileSync('src/app/page.tsx', 'utf8');

// Inject Audio playback in triggerDuelCountdown
content = content.replace(
  'const triggerDuelCountdown = (matchData?: { challengerId: string, targetId: string }) => {\n    setDuelCountdown(3);',
  'const triggerDuelCountdown = (matchData?: { challengerId: string, targetId: string }) => {\n    setDuelCountdown(3);\n    const audio = new Audio(\'/game%20duel/make_more_sound-321-go-8-bit-video-game-sound-version-1-145007.mp3\');\n    audio.play().catch(e => console.log(\'Audio play failed:\', e));'
);

fs.writeFileSync('src/app/page.tsx', content);
console.log('Fixed page.tsx audio');
