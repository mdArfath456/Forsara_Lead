import mongoose from 'mongoose';

const { Schema } = mongoose;

// Deliberately minimal: this app has exactly one admin account, never a
// full user-management system (no roles, no registration) — see spec.
const adminUserSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true }, // bcrypt hash, never plaintext
  },
  { timestamps: true }
);

export const AdminUser = mongoose.model('AdminUser', adminUserSchema);
