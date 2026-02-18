import mongoose from 'mongoose';

const PendingSignupSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        select: false,
    },
    // Vault Params
    vaultSalt: { type: String, required: true },
    vaultVerifier: { type: String, required: true },

    // Recovery Params
    recoverySalt: { type: String, required: true },
    recoveryEncryptedMasterKey: { type: String, required: true },
    recoveryIv: { type: String, required: true },

    // OTP Data
    otp: { type: String, required: true },
    otpExpires: { type: Date, required: true },

    createdAt: {
        type: Date,
        default: Date.now,
        expires: 600 // 10 minutes TTL
    }
});

const PendingSignup = mongoose.models.PendingSignup || mongoose.model('PendingSignup', PendingSignupSchema);

export default PendingSignup;
