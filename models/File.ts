import mongoose from 'mongoose';

const FileSchema = new mongoose.Schema({
    name: { type: String, required: true },
    size: { type: Number, required: true },
    mimeType: { type: String, required: true },

    // Cloudflare R2 Reference
    r2Key: { type: String, required: true, unique: true }, // The random UUID used in the bucket

    // Crypto Metadata
    iv: { type: String, required: true }, // IV used to encrypt the file content itself
    encryptedKey: { type: String, required: true }, // The File Key, encrypted by the User's Master Key
    keyIv: { type: String, required: false }, // IV used to encrypt the encryptedKey (Required for new files)

    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
    isTrashed: { type: Boolean, default: false },
    trashedAt: { type: Date },
});

export default mongoose.models.File || mongoose.model('File', FileSchema);
