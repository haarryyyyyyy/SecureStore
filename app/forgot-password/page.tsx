'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, ArrowRight, Loader2, 
  AlertCircle, CheckCircle2, Lock, RefreshCw, Mail, Download,
} from 'lucide-react';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  deriveRecoveryKey, unwrapFileKey, wrapFileKey, 
  deriveMasterKey, createKeyVerifier, generateSalt, 
  encryptMasterKeyWithRecoveryKey, generateRecoveryCode, hex2buf
} from '@/lib/crypto';
import { ToastContainer, ToastMessage } from '@/components/ui/Toast';

export default function ForgotPasswordPage() {
  const router = useRouter();
  
  // Steps: 0=Email/Code, 1=NewPassword, 2=Processing
  const [step, setStep] = useState(0);
  
  const [email, setEmail] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Validation State
  const [errors, setErrors] = useState<{email?: string; recoveryCode?: string; newPassword?: string; confirmPassword?: string}>({});
  const [generalError, setGeneralError] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  
  // Temporary State
  const [tempData, setTempData] = useState<{
      recoveryToken: string;
      oldMasterKey: CryptoKey;
  } | null>(null);

  const [newRecoveryCode, setNewRecoveryCode] = useState('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error', message: string) => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { id, type, message }]);
  };
  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  // --- Logic Handlers ---
  const triggerShake = () => {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 400);
  };

  const handleVerify = async (e: React.FormEvent) => {
      e.preventDefault();
      setGeneralError('');
      setErrors({});

      // Validate
      const newErrors: any = {};
      if (!email) newErrors.email = "Email is required";
      if (!recoveryCode) newErrors.recoveryCode = "Recovery code is required";
      
      if (Object.keys(newErrors).length > 0) {
          setErrors(newErrors);
          triggerShake();
          return;
      }

      setIsSubmitting(true);
      setStatusText('authenticating...');

      try {
          const res = await fetch('/api/auth/recover/init', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Recovery failed');

          setStatusText('decrypting vault...');
          const recKey = await deriveRecoveryKey(recoveryCode.trim(), data.recoverySalt);
          
          if (!data.recoveryIv) throw new Error("Security Error: Missing IV.");

          const rawMasterKey = await crypto.subtle.decrypt(
             { name: "AES-GCM", iv: hex2buf(data.recoveryIv) },
             recKey,
             hex2buf(data.recoveryEncryptedMasterKey)
          );

          const oldMasterKey = await crypto.subtle.importKey(
              "raw",
              rawMasterKey,
              { name: "AES-GCM", length: 256 },
              true,
              ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
          );

          setTempData({ recoveryToken: data.recoveryToken, oldMasterKey });
          setStep(1);
          addToast('success', 'Recovery code verified.');

      } catch (err: any) {
          setGeneralError(err.message || "Invalid Email or Recovery Code.");
          triggerShake();
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleReset = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!tempData) return;

      setGeneralError('');
      setErrors({});

      // Validation
      const newErrors: any = {};
      if (!newPassword) newErrors.newPassword = "Password is required";
      else if (newPassword.length < 8) newErrors.newPassword = "Password must be at least 8 characters";
      
      if (!confirmPassword) newErrors.confirmPassword = "Please confirm your password";
      else if (newPassword !== confirmPassword) newErrors.confirmPassword = "Passwords do not match";

      if (Object.keys(newErrors).length > 0) {
          setErrors(newErrors);
          triggerShake();
          return;
      }
      
      setIsSubmitting(true);
      setStep(2); 

      try {
          setStatusText("generating keys...");
          setProgress(10);
          
          const newVaultSalt = generateSalt();
          const newMasterKey = await deriveMasterKey(newPassword, newVaultSalt);
          const newVaultVerifier = await createKeyVerifier(newMasterKey);

          setStatusText("fetching files...");
          setProgress(20);

          const listRes = await fetch('/api/files/list?keysOnly=true', {
              headers: { 'Authorization': `Bearer ${tempData.recoveryToken}` }
          });
          const listData = await listRes.json();
          const files = listData.files || [];

          setStatusText(`re-encrypting ${files.length} files...`);
          
          const updates = [];
          for (let i = 0; i < files.length; i++) {
              const file = files[i];
              try {
                  const fileKey = await unwrapFileKey(file.encryptedKey, file.keyIv, tempData.oldMasterKey);
                  const { wrappedKey, iv } = await wrapFileKey(fileKey, newMasterKey);
                  updates.push({ id: file._id, encryptedKey: wrappedKey, keyIv: iv });
              } catch (e) {
                  console.error(e);
              }
              if (i % 5 === 0) setProgress(30 + Math.floor((i / files.length) * 50));
          }

          setStatusText("saving changes...");
          setProgress(85);

          if (updates.length > 0) {
              await fetch('/api/files/rekey', {
                  method: 'POST',
                  headers: { 
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${tempData.recoveryToken}`
                  },
                  body: JSON.stringify({ updates })
              });
          }

          setStatusText("finalizing...");
          const newRecCode = generateRecoveryCode();
          const newRecSalt = generateSalt();
          const newRecKey = await deriveRecoveryKey(newRecCode, newRecSalt);
          const { encryptedMasterKey: newRecEncMasterKey, iv: newRecIv } = await encryptMasterKeyWithRecoveryKey(newMasterKey, newRecKey);

          await fetch('/api/auth/recover/complete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  recoveryToken: tempData.recoveryToken,
                  password: newPassword,
                  vaultSalt: newVaultSalt,
                  vaultVerifier: newVaultVerifier,
                  recoverySalt: newRecSalt,
                  recoveryEncryptedMasterKey: newRecEncMasterKey,
                  recoveryIv: newRecIv 
              })
          });

          setProgress(100);
          setNewRecoveryCode(newRecCode);

      } catch (err: any) {
          setGeneralError(err.message);
          setStep(1); 
      } finally {
          setIsSubmitting(false);
      }
  };


  // --- UI RENDER ---

  // SUCCESS STATE
  if (newRecoveryCode) {
      const handleDownload = () => {
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

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900 p-4">
             <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center">
                <div className="mx-auto w-20 h-20 bg-blue-100/50 rounded-full flex items-center justify-center mb-6">
                    <BrandLogo size={40} className="text-blue-600" />
                </div>
                <h2 className="text-2xl font-extrabold mb-4">Access Restored</h2>
                <p className="text-slate-500 mb-8">Your vault has been re-keyed and secured. <br/>Please save your new recovery code.</p>
                
                <div className="bg-slate-900 rounded-xl p-5 mb-8 text-left relative group">
                    <p className="text-xs font-bold text-green-400 uppercase mb-2">New Recovery Code</p>
                    <p className="font-mono text-white break-all text-lg leading-relaxed">{newRecoveryCode}</p>
                    <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                            <AlertCircle size={14} /> Old code is now invalid
                    </div>
                </div>

                <div className="flex gap-4">
                    <button onClick={handleDownload} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2">
                        <Download size={18} /> Download
                    </button>
                    <button onClick={() => router.push('/login')} className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-600/20">
                        Go to Login
                    </button>
                </div>
             </div>
        </div>
      );
  }

  // MAIN FORM STATE
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900 p-4">
       <ToastContainer toasts={toasts} removeToast={removeToast} />

       <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 sm:p-10">
          <Link href="/login" className="inline-flex items-center gap-2 mb-8 text-slate-500 hover:text-slate-900 font-bold text-sm transition-colors group">
             <span className="group-hover:-translate-x-1 transition-transform">&larr;</span> Back to Login
          </Link>
          
          <div className="flex items-center gap-2 mb-6">
                 <div className="p-2 bg-blue-600/10 text-blue-600 rounded-lg"><BrandLogo size={24} /></div>
                 <span className="font-bold text-slate-900">SecureStore</span>
          </div>

          <h1 className="text-2xl font-extrabold mb-2 text-slate-900">Reset Password</h1>
          
          <AnimatePresence mode="wait">
             {step === 0 && (
                <motion.div key="step0" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <p className="text-slate-500 mb-8 text-sm leading-relaxed">Enter your email and the 24-byte recovery code you saved during signup. This process happens entirely in your browser.</p>
                    <form onSubmit={handleVerify} className="space-y-5" noValidate>
                        <InputGroup 
                            label="Email" type="email" value={email} onChange={(e: any) => setEmail(e.target.value)} icon={<Mail size={18} />} autoFocus 
                            error={errors.email} isShaking={isShaking && !!errors.email}
                        />
                        
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Recovery Code</label>
                            <textarea 
                                className={`w-full p-4 bg-slate-50 rounded-xl border outline-none transition-all font-mono text-sm h-32 resize-none placeholder:text-slate-400 focus:bg-white focus:ring-4 ${
                                    isShaking && errors.recoveryCode ? 'animate-shake border-red-500 focus:ring-red-500/10' : 
                                    errors.recoveryCode ? 'border-red-500 focus:ring-red-500/10' : 
                                    'border-slate-200 focus:border-blue-600 focus:ring-blue-50/50'
                                }`}
                                placeholder="Paste your 24-byte hex code here..." 
                                value={recoveryCode} onChange={e => setRecoveryCode(e.target.value)} required 
                            />
                            {errors.recoveryCode && <p className="text-red-500 text-xs mt-1 font-medium">{errors.recoveryCode}</p>}
                        </div>
                        
                        {generalError && <ErrorMessage msg={generalError} />}
                        
                        <button disabled={isSubmitting} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-slate-900/10 hover:translate-y-[-2px] active:translate-y-[0px] disabled:opacity-50 disabled:cursor-not-allowed">
                            {isSubmitting ? <Loader2 className="animate-spin" /> : <>Verify Identity <ArrowRight size={18} /></>}
                        </button>
                    </form>
                </motion.div>
             )}

             {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <div className="flex items-center gap-3 text-green-700 bg-green-50 border border-green-100 p-4 rounded-xl text-sm font-bold mb-8">
                        <CheckCircle2 size={18} className="shrink-0" /> 
                        <span>Identity Verified. Key Decrypted.</span>
                    </div>

                    <p className="text-slate-500 mb-6 text-sm">Please create a new strong password.</p>
                    
                    <form onSubmit={handleReset} className="space-y-6" noValidate>
                        <InputGroup 
                            label="New Password" type="password" value={newPassword} onChange={(e: any) => setNewPassword(e.target.value)} icon={<Lock size={18} />} autoFocus 
                            error={errors.newPassword} isShaking={isShaking && !!errors.newPassword}
                        />

                        <InputGroup 
                            label="Confirm Password" type="password" value={confirmPassword} onChange={(e: any) => setConfirmPassword(e.target.value)} icon={<Lock size={18} />}
                            error={errors.confirmPassword} isShaking={isShaking && !!errors.confirmPassword}
                        />
                        
                        {generalError && <ErrorMessage msg={generalError} />}

                        <button disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20 hover:translate-y-[-2px]">
                            {isSubmitting ? <Loader2 className="animate-spin" /> : <>Reset & Re-Key Vault <RefreshCw size={18} /></>}
                        </button>
                    </form>
                </motion.div>
             )}

             {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-12 text-center">
                     <div className="relative w-24 h-24 mx-auto mb-8">
                         <svg className="w-full h-full transform -rotate-90">
                             <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
                             <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-blue-600 transition-all duration-300 ease-linear" strokeDasharray={264} strokeDashoffset={264 - (264 * progress) / 100} strokeLinecap="round" />
                         </svg>
                         <div className="absolute inset-0 flex items-center justify-center font-bold text-2xl text-blue-600">{progress}%</div>
                     </div>
                     <h3 className="text-xl font-bold text-slate-900 mb-2">{statusText}</h3>
                     <p className="text-slate-500 text-sm max-w-[200px] mx-auto">Re-shuffling encryption keys. Please do not close this window.</p>
                </motion.div>
             )}
          </AnimatePresence>
       </div>
    </div>
  );
}

// --- COMPONENTS ---

function InputGroup({ label, error, icon, isShaking, ...props }: any) {
  return (
    <div>
      <label className="block text-sm font-bold text-slate-700 mb-1.5">{label}</label>
      <div className="relative group">
        <input 
            {...props} 
            className={`w-full px-5 py-3.5 bg-slate-50 rounded-xl border outline-none transition-all font-medium focus:bg-white focus:ring-4 ${
                isShaking ? 'animate-shake border-red-500 focus:ring-red-500/10' : 
                error ? 'border-red-500 focus:ring-red-500/10' : 
                'border-slate-200 focus:border-blue-600 focus:ring-blue-50/50'
            }`} 
        />
        {icon && <div className={`absolute right-4 top-3.5 transition-colors ${error ? 'text-red-400' : 'text-slate-400 group-focus-within:text-blue-600'}`}>{icon}</div>}
      </div>
      {error && <p className="text-red-500 text-xs mt-1 font-medium animate-slide-down">{error}</p>}
    </div>
  );
}

function ErrorMessage({ msg }: { msg: string }) {
    return (
        <motion.div 
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100"
        >
            <AlertCircle size={16} /> {msg}
        </motion.div>
    );
}