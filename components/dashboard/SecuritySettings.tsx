import React, { useState } from 'react';
import { 
    CheckCircle, Save, Download, Lock, RefreshCw, ShieldCheck 
} from 'lucide-react';
import { 
    generateSalt, deriveMasterKey, createKeyVerifier, unwrapFileKey, wrapFileKey, 
    generateRecoveryCode, deriveRecoveryKey, encryptMasterKeyWithRecoveryKey 
} from '@/lib/crypto';
import { FileItem } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';

interface SecuritySettingsProps {
    files: FileItem[];
    cachedMasterKey: CryptoKey | null;
    setCachedMasterKey: (k: CryptoKey) => void;
    addToast: (t: 'success' | 'error' | 'info', m: string) => void;
}

export function SecuritySettings({ files, cachedMasterKey, setCachedMasterKey, addToast }: SecuritySettingsProps) {
    // --- CHANGE PASSWORD STATE ---
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordProgress, setPasswordProgress] = useState(0); // 0-100

    // --- RECOVERY CODE STATE ---
    const [newRecoveryCode, setNewRecoveryCode] = useState<string | null>(null);

    const handleDownloadRecoveryCode = () => {
        if (!newRecoveryCode) return;
        const blob = new Blob([`IMPORTANT - Vault Access Recovery Code\n\nCode: ${newRecoveryCode}\n\nKEEP THIS SAFE. If you forget your password, this is the ONLY way to recover your files.`], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'vault-recovery-code.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // --- HANDLERS ---
    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cachedMasterKey) { addToast('error', 'Vault locked. Please logout and login again.'); return; }
        if (newPassword !== confirmPassword) { addToast('error', 'New passwords do not match.'); return; }
        if (newPassword.length < 8) { addToast('error', 'Password must be at least 8 characters.'); return; }

        setIsChangingPassword(true);
        setPasswordProgress(5);

        try {
            // 1. Generate New Master Key
            const newVaultSalt = generateSalt();
            const newMasterKey = await deriveMasterKey(newPassword, newVaultSalt);
            const newVaultVerifier = await createKeyVerifier(newMasterKey);
            setPasswordProgress(20);

            // 2. Fetch ALL Files (Keys Only) - Simplified for MVP
            const updates = [];
            let processed = 0;
            
            for (const file of files) {
                try {
                    // Unlock with OLD key
                    const fileKey = await unwrapFileKey(file.encryptedKey, file.keyIv || file.iv, cachedMasterKey);
                    // Lock with NEW key
                    const { wrappedKey, iv } = await wrapFileKey(fileKey, newMasterKey);
                    
                    updates.push({ id: file._id, encryptedKey: wrappedKey, keyIv: iv });
                } catch (err) {
                    console.error("Failed to rekey file", file._id, err);
                }
                processed++;
                if (processed % 5 === 0) setPasswordProgress(20 + Math.floor((processed / files.length) * 50));
            }
            setPasswordProgress(70);

            // 3. Batch Update Files
            if (updates.length > 0) {
                await fetch('/api/files/rekey', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ updates })
                });
            }
            setPasswordProgress(85);

            // 4. Generate New Recovery Data
            const newRecCode = generateRecoveryCode();
            const newRecSalt = generateSalt();
            const newRecKey = await deriveRecoveryKey(newRecCode, newRecSalt);
            const { encryptedMasterKey: newRecEncMasterKey, iv: newRecIv } = await encryptMasterKeyWithRecoveryKey(newMasterKey, newRecKey);

            // 5. Update User (Password + Vault Params + Recovery Params)
            const res = await fetch('/api/auth/change-login-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentPassword,
                    newPassword,
                    vaultSalt: newVaultSalt,
                    vaultVerifier: newVaultVerifier,
                    recoverySalt: newRecSalt,
                    recoveryEncryptedMasterKey: newRecEncMasterKey,
                    recoveryIv: newRecIv
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to update password');
            }

            // 6. Success & Cleanup
            setPasswordProgress(100);
            setCachedMasterKey(newMasterKey); // Update session key
            // Update session storage
            const exportedKey = await crypto.subtle.exportKey("jwk", newMasterKey);
            sessionStorage.setItem("vault_key", JSON.stringify(exportedKey));
            
            setNewRecoveryCode(newRecCode); // Show code to user
            addToast('success', 'Password changed and vault re-keyed successfully!');
            setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');

        } catch (err: any) {
            console.error(err);
            addToast('error', err.message);
        } finally {
            setIsChangingPassword(false);
            setPasswordProgress(0);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in zoom-in duration-300">
            
            {/* SUCCESS STATE - NEW RECOVERY CODE */}
            {newRecoveryCode && (
                 <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center animate-in fade-in zoom-in duration-300">
                    <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle size={32} className="text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-green-900 mb-2">Security Update Successful</h3>
                    <p className="text-green-700 mb-6">Your password has been changed and your vault re-keyed.</p>
                    
                    <div className="bg-white rounded-xl border border-green-200 p-6 max-w-lg mx-auto text-left shadow-sm">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">New Recovery Code</p>
                        <p className="font-mono text-lg text-slate-800 break-all bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4 select-all">
                            {newRecoveryCode}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
                            <Save size={14} />
                            <strong>Important:</strong> Save this code now. It is the ONLY way to recover your account.
                        </div>
                    </div>
                    
                    <div className="flex gap-4 mt-6">
                        <Button 
                            onClick={handleDownloadRecoveryCode}
                            variant="secondary"
                            leftIcon={<Download size={18} />}
                            className="flex-1"
                        >
                            Download
                        </Button>
                        <Button 
                            onClick={() => setNewRecoveryCode(null)}
                            variant="primary" // Replaced custom green button with primary for consistency, or we could add a green variant. 
                            // Actually, let's stick to standard variants. Primary is blue, maybe we need a success variant? 
                            // For now, let's use primary (blue) or Just use the custom class if we really want green.
                            // But improvement goal was standardization.
                            leftIcon={<CheckCircle size={18} />}
                            className="flex-1 bg-green-600 hover:bg-green-700 shadow-green-600/20" // Overriding for Green specific to success
                        >
                            I've Saved It
                        </Button>
                    </div>
                 </div>
            )}

            {/* CHANGE PASSWORD FORM */}
            {!newRecoveryCode && (
                <Card noPadding>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">Change Password & Rotate Keys</CardTitle>
                        <CardDescription>Update your password and securely re-encrypt your vault.</CardDescription>
                    </CardHeader>
                    
                    <div className="p-8">
                        <form onSubmit={handleChangePassword} className="space-y-5 max-w-lg">
                            <Input
                                label="Current Password"
                                type="password"
                                placeholder="Enter current password"
                                value={currentPassword}
                                onChange={e => setCurrentPassword(e.target.value)}
                                required
                                icon={<Lock size={18} />}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="New Password"
                                    type="password"
                                    placeholder="Min 8 chars"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    required
                                    minLength={8}
                                />
                                <Input
                                    label="Confirm New"
                                    type="password"
                                    placeholder="Repeat password"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    required
                                    minLength={8}
                                />
                            </div>

                            <div className="pt-4">
                                <Button 
                                    type="submit" 
                                    variant="secondary"
                                    className="w-full"
                                    isLoading={isChangingPassword}
                                    leftIcon={!isChangingPassword && <RefreshCw size={18} />}
                                >
                                    {isChangingPassword ? 'Re-keying Vault...' : 'Update Password & Re-Key'}
                                </Button>
                            </div>
                            
                            {/* PROGRESS BAR FOR RE-KEYING */}
                            {isChangingPassword && (
                                <div className="mt-4">
                                    <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                                        <span>Re-encrypting files...</span>
                                        <span>{passwordProgress}%</span>
                                    </div>
                                    <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
                                        <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${passwordProgress}%` }}></div>
                                    </div>
                                </div>
                            )}
                        </form>
                    </div>
                </Card>
            )}
            
            {/* RECOVERY CODE INFO BLOCK */}
             <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex gap-4 items-start">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-xl shrink-0">
                    <ShieldCheck size={24} />
                </div>
                <div>
                    <h4 className="font-bold text-blue-900 mb-1">Recovery Key Generation</h4>
                    <p className="text-sm text-blue-800 leading-relaxed mb-4">
                        To view a new recovery key, you must change your password. This generates a new cryptographic key pair and invalidates the old one securely.
                    </p>
                </div>
            </div>

        </div>
    );
}
