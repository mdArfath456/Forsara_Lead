/**
 * Run once (or whenever you want to rotate the admin password):
 *   node src/scripts/seedAdmin.js <username> <plaintext-password>
 *
 * Never commit a plaintext password anywhere — pass it as a CLI arg,
 * which only lives in your shell history, not in a file.
 */
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { AdminUser } from '../models/AdminUser.model.js';

async function main() {
  const [, , username, plaintextPassword] = process.argv;

  if (!username || !plaintextPassword) {
    console.error('Usage: node src/scripts/seedAdmin.js <username> <password>');
    process.exit(1);
  }

  await mongoose.connect(env.mongoUri);

  const passwordHash = await bcrypt.hash(plaintextPassword, 10);

  const admin = await AdminUser.findOneAndUpdate(
    { username },
    { username, passwordHash },
    { upsert: true, returnDocument: 'after' }
  );

  console.log(`[seed] Admin account ready: ${admin.username} (id: ${admin._id})`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
