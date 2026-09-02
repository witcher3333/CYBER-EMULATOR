async function fixBalances() {
  const res = await fetch('http://localhost:3000/api/users');
  const json = await res.json();
  if (json.success) {
    const users = json.data;
    for (const u of users) {
      if (u.coins < 0 || u.xp < 0) {
        const updates = {};
        if (u.coins < 0) updates.coins = 0;
        if (u.xp < 0) updates.xp = 0;
        
        await fetch('http://localhost:3000/api/users', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ empId: u.empId, updates })
        });
        console.log('Fixed:', u.empId);
      }
    }
  }
}
fixBalances();
