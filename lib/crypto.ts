export const PBKDF2_ITERATIONS = 100000;
export const SALT_LENGTH = 16;
export const IV_LENGTH = 12; // AES-GCM standard
export const KEY_LENGTH = 256;

// --- 1. Utilities ---

export function buf2hex(buffer: ArrayBuffer | Uint8Array) {
    return [...new Uint8Array(buffer)]
        .map(x => x.toString(16).padStart(2, '0'))
        .join('');
}

export function hex2buf(hex: string) {
    const bytes = new Uint8Array(Math.ceil(hex.length / 2));
    for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    return bytes.buffer;
}

// --- 2. Key Derivation (Master Key) ---

/**
 * Generates a random salt.
 */
export function generateSalt(): string {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    return buf2hex(salt);
}

/**
 * Derives a Master Key from a password and salt using PBKDF2.
 * Returns the CryptoKey object.
 */
export async function deriveMasterKey(password: string, saltHex: string): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const passwordKey = await crypto.subtle.importKey(
        "raw",
        enc.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveKey", "deriveBits"]
    );

    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: hex2buf(saltHex),
            iterations: PBKDF2_ITERATIONS,
            hash: "SHA-256"
        },
        passwordKey,
        { name: "AES-GCM", length: KEY_LENGTH },
        true,
        ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
    );
}

/**
 * Creates a "Verifier" hash of the Master Key.
 * We send this to the server. The server stores it.
 * Later, when user enters password, we re-derive the key, hash it, and send hash to server to prove we have the key.
 * We do NOT send the key itself.
 */
export async function createKeyVerifier(masterKey: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey("raw", masterKey);
    const hash = await crypto.subtle.digest("SHA-256", exported);
    return buf2hex(hash);
}

// --- 3. Recovery (Backup Code) ---

/**
 * Generates a strong random Recovery Code (24 bytes hex).
 * This code is displayed to the user ONE TIME.
 */
export function generateRecoveryCode(): string {
    const code = crypto.getRandomValues(new Uint8Array(24));
    return buf2hex(code);
}

/**
 * Derives a Recovery Key from the Recovery Code and Salt.
 * This is similar to Master Key derivation but uses the Recovery Code as the "password".
 */
export async function deriveRecoveryKey(recoveryCode: string, saltHex: string): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        enc.encode(recoveryCode),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: hex2buf(saltHex),
            iterations: PBKDF2_ITERATIONS,
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: KEY_LENGTH },
        true,
        ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
    );
}

/**
 * Encrypts the Master Key using the Recovery Key.
 * We store this encrypted blob on the server.
 */
export async function encryptMasterKeyWithRecoveryKey(masterKey: CryptoKey, recoveryKey: CryptoKey): Promise<{ encryptedMasterKey: string; iv: string }> {
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const rawMasterKey = await crypto.subtle.exportKey("raw", masterKey);

    const encryptedBuffer = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        recoveryKey,
        rawMasterKey
    );

    // Format: IV (hex) + :: + Ciphertext (hex)
    // We combine them for easier storage in a single DB field
    return {
        encryptedMasterKey: buf2hex(encryptedBuffer),
        iv: buf2hex(iv)
    };
}

// --- 4. Encryption (File) ---

/**
 * Generates a random File Key (AES-256).
 */
export async function generateFileKey(): Promise<CryptoKey> {
    return crypto.subtle.generateKey(
        { name: "AES-GCM", length: KEY_LENGTH },
        true,
        ["encrypt", "decrypt"]
    );
}

/**
 * Encrypts a File Key using the Master Key.
 * We store this "Wrapped Key" in MongoDB.
 */
export async function wrapFileKey(fileKey: CryptoKey, masterKey: CryptoKey): Promise<{ wrappedKey: string; iv: string }> {
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const rawFileKey = await crypto.subtle.exportKey("raw", fileKey);

    const encryptedBuffer = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        masterKey,
        rawFileKey
    );

    return {
        wrappedKey: buf2hex(encryptedBuffer),
        iv: buf2hex(iv)
    };
}

/**
 * Decrypts a Wrapped File Key using the Master Key.
 */
export async function unwrapFileKey(wrappedKeyHex: string, ivHex: string, masterKey: CryptoKey): Promise<CryptoKey> {
    const encryptedBuffer = hex2buf(wrappedKeyHex);
    const iv = hex2buf(ivHex);

    const rawKeyCheck = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        masterKey,
        encryptedBuffer
    );

    return crypto.subtle.importKey(
        "raw",
        rawKeyCheck,
        { name: "AES-GCM", length: KEY_LENGTH },
        true,
        ["encrypt", "decrypt"]
    );
}



/**
 * Encrypts a File (blob) using the File Key.
 */
export async function encryptFile(file: File, fileKey: CryptoKey): Promise<{ encryptedBlob: Blob; iv: string }> {
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const arrayBuffer = await file.arrayBuffer();

    const encryptedBuffer = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        fileKey,
        arrayBuffer
    );

    return {
        encryptedBlob: new Blob([encryptedBuffer]),
        iv: buf2hex(iv)
    };
}

/**
 * Decrypts a File (blob) using the File Key.
 */
export async function decryptFile(encryptedBlob: Blob, ivHex: string, fileKey: CryptoKey): Promise<Blob> {
    const iv = hex2buf(ivHex);
    const arrayBuffer = await encryptedBlob.arrayBuffer();

    const decryptedBuffer = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        fileKey,
        arrayBuffer
    );

    return new Blob([decryptedBuffer]);
}
