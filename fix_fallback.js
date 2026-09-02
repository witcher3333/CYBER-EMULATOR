const fs = require('fs');
let content = fs.readFileSync('socket-server/index.js', 'utf8');

const processRoundLogic = `
  const processRound = (battle, matchId, io) => {
    console.log(\`[SOCKET_SERVER] Both players answered! Processing round \${battle.round}...\`);

    // If both are correct, 0 damage to both (bump animation)
    if (battle.p1Answer.isCorrect && battle.p2Answer.isCorrect) {
      battle.p1Answer.damage = 0;
      battle.p2Answer.damage = 0;
    }

    // Apply damage: wrong answer player takes damage
    battle.p1Hp -= battle.p1Answer.damage;
    battle.p2Hp -= battle.p2Answer.damage;

    // Prevent negative HP
    battle.p1Hp = Math.max(0, battle.p1Hp);
    battle.p2Hp = Math.max(0, battle.p2Hp);

    const p1Dead = battle.p1Hp <= 0;
    const p2Dead = battle.p2Hp <= 0;

    console.log(\`[SOCKET_SERVER] After round: P1 HP=\${battle.p1Hp}, P2 HP=\${battle.p2Hp}. nextRound=\${!(p1Dead || p2Dead)}\`);

    // Emit update to both players
    io.to(matchId).emit('battle_update', {
      p1Hp: battle.p1Hp,
      p2Hp: battle.p2Hp,
      nextRound: !(p1Dead || p2Dead),
      p1Answer: battle.p1Answer,
      p2Answer: battle.p2Answer
    });

    if (p1Dead || p2Dead) {
      let winner = 'draw';
      if (battle.p1Hp > battle.p2Hp) winner = 'challenger';
      else if (battle.p2Hp > battle.p1Hp) winner = 'target';

      console.log(\`[SOCKET_SERVER] Battle over! Winner: \${winner}\`);
      setTimeout(() => {
        io.to(matchId).emit('battle_over', { winner });
        battleRooms.delete(matchId);
      }, 3000);
    } else {
      // Reset for next round
      battle.answersThisRound = 0;
      battle.p1Answer = null;
      battle.p2Answer = null;
      battle.round++;
      console.log(\`[SOCKET_SERVER] Moving to round \${battle.round}\`);
    }
  };
`;

const submitAnswerLogic = `
    battle.answersThisRound++;
    console.log(\`[SOCKET_SERVER] AnswersThisRound AFTER: \${battle.answersThisRound}\`);

    if (battle.answersThisRound === 1) {
      // Start fallback timer
      battle.fallbackTimeout = setTimeout(() => {
        if (battleRooms.has(matchId)) {
          const b = battleRooms.get(matchId);
          if (b.answersThisRound === 1 && b.round === battle.round) {
            console.log(\`[SOCKET_SERVER] Fallback timeout triggered for \${matchId} round \${b.round}\`);
            const missingIsChallenger = !isChallenger;
            if (missingIsChallenger) b.p1Answer = { isCorrect: false, damage: 15 };
            else b.p2Answer = { isCorrect: false, damage: 15 };
            b.answersThisRound = 2;
            processRound(b, matchId, io);
          }
        }
      }, 15000); // 15s grace period
    }

    // When both players have answered
    if (battle.answersThisRound === 2) {
      if (battle.fallbackTimeout) clearTimeout(battle.fallbackTimeout);
      processRound(battle, matchId, io);
    }
  });
`;

// Extract the top level logic replacement
content = content.replace(
  /const PORT = process\.env\.PORT \|\| 3001;/,
  processRoundLogic + '\n  const PORT = process.env.PORT || 3001;'
);

content = content.replace(
  /battle\.answersThisRound\+\+;[\s\S]*?(?=socket\.on\('player_forfeit')/g,
  submitAnswerLogic + '\n  '
);

fs.writeFileSync('socket-server/index.js', content);
console.log('Added server-side fallback timer for stuck rounds');
