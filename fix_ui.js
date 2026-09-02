const fs = require('fs');
let content = fs.readFileSync('src/app/page.tsx', 'utf8');

// Change the map to include all non-current users, and define isOnline
content = content.replace(
  /{leaderboard\.filter\(p => p\.empId !== localStorage\.getItem\('currentUserEmpId'\) && onlineUsers\.includes\(p\.empId\)\)\.map\(\(player, idx\) => \(/g,
  "{leaderboard.filter(p => p.empId !== localStorage.getItem('currentUserEmpId')).map((player, idx) => { const isOnline = onlineUsers.includes(player.empId); return ("
);

// We need to add the closing parenthesis for the return inside the map
content = content.replace(
  /<\/button>\s*<\/div>\s*}\)\)}/g,
  "</button></div>);})}"
);

// Add the green/gray online indicator
content = content.replace(
  /<span className="text-green-500 text-\[10px\] uppercase tracking-wider flex items-center gap-1"><span className="w-1\.5 h-1\.5 rounded-full bg-green-500"><\/span> ONLINE<\/span>/g,
  "<span className={`text-[10px] uppercase tracking-wider flex items-center gap-1 ${isOnline ? 'text-green-500' : 'text-gray-500'}`}><span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-500'}`}></span> {isOnline ? 'ONLINE' : 'OFFLINE'}</span>"
);

// Replace the empty state condition
content = content.replace(
  /{leaderboard\.filter\(p => p\.empId !== localStorage\.getItem\('currentUserEmpId'\) && onlineUsers\.includes\(p\.empId\)\)\.length === 0 && \(/g,
  "{leaderboard.filter(p => p.empId !== localStorage.getItem('currentUserEmpId')).length === 0 && ("
);

// Change the empty state text
content = content.replace(
  /NO OTHER ONLINE OPERANTS DETECTED/g,
  "NO OTHER OPERANTS REGISTERED IN SYSTEM"
);

fs.writeFileSync('src/app/page.tsx', content);
console.log('Fixed page.tsx active players list');
