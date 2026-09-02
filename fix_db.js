const mongoose = require('mongoose');
const { connectDB } = require('./src/lib/mongodb');
const User = require('./src/models/User').default;

async function fixNegativeBalances() {
  await connectDB();
  const res = await User.updateMany(
    { $or: [{ coins: { $lt: 0 } }, { xp: { $lt: 0 } }] },
    { $max: { coins: 0, xp: 0 } }
  );
  console.log('Fixed users:', res.modifiedCount);
  process.exit(0);
}
fixNegativeBalances();
