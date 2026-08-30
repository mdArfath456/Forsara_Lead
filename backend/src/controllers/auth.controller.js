import bcrypt from 'bcryptjs';
import { AdminUser } from '../models/AdminUser.model.js';

export async function login(req, res) {
  const { username, password } = req.body;

  const admin = await AdminUser.findOne({ username });
  if (!admin) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const matches = await bcrypt.compare(password || '', admin.passwordHash);
  if (!matches) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  req.session.isAuthenticated = true;
  req.session.adminId = admin._id.toString();
  await new Promise((resolve, reject) => {
    req.session.save((err) => (err ? reject(err) : resolve()));
  });
  res.json({ success: true });
}

export function logout(req, res) {
  req.session.destroy(() => {
    res.json({ success: true });
  });
}

export function me(req, res) {
  res.json({ authenticated: Boolean(req.session?.isAuthenticated) });
}
