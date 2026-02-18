import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },

  // --- Vault Security ---
  vaultSalt: { type: String, select: false },
  vaultVerifier: { type: String, select: false },
  recoverySalt: { type: String, select: false },
  recoveryEncryptedMasterKey: { type: String, select: false },
  recoveryIv: { type: String, select: false },
  hasVault: { type: Boolean, default: false },

  // --- Profile Fields (Phone Removed) ---
  name: { type: String },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  country: { type: String },
  dob: { type: Date },

  // Marks if the FULL onboarding (Details + Vault) is done
  isProfileComplete: { type: Boolean, default: false },

  // --- Verification ---
  isVerified: { type: Boolean, default: false },
  otp: { type: String, select: false },
  otpExpires: { type: Date, select: false },

  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.User || mongoose.model('User', UserSchema);