'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, ArrowRight, Lock, 
  CheckCircle2, ArrowDown, Hash, Key, Mail, Copy, Download
} from 'lucide-react';
import { generateSalt, deriveMasterKey, createKeyVerifier, generateRecoveryCode, deriveRecoveryKey, encryptMasterKeyWithRecoveryKey } from '@/lib/crypto';
import { ToastContainer, ToastMessage } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface WorkflowNodeProps {
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    isDone: boolean;
    isFinal?: boolean;
}

interface WorkflowArrowProps {
    isActive: boolean;
}

export default function SignupPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [animStep, setAnimStep] = useState(0);

  // Recovery Code State
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // OTP State
  const [otp, setOtp] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);

  // --- TOAST STATE ---
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const addToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { id, type, message }]);
  }, []);
  
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // --- Animation Loop ---
  useEffect(() => {
    let mounted = true;
    const runLoop = async () => {
      while (mounted) {
        setAnimStep(0); await new Promise(r => setTimeout(r, 1000));
        if (!mounted) break;
        setAnimStep(1); await new Promise(r => setTimeout(r, 1500));
        if (!mounted) break;
        setAnimStep(2); await new Promise(r => setTimeout(r, 1500));
        if (!mounted) break;
        setAnimStep(3); await new Promise(r => setTimeout(r, 3000)); 
      }
    };
    runLoop();
    return () => { mounted = false; };
  }, []);

  // --- Strict Validation ---
  const validateEmail = (val: string) => {
    if (!val) return 'Email is required.';
    if (!/@/.test(val)) return 'Missing "@" symbol.';
    if (!/@[^.]+\.[a-zA-Z]{2,}$/.test(val)) return 'Invalid domain (e.g. .com).'; 
    return '';
  };

  const validatePassword = (val: string) => {
    if (!val) return 'Password is required.';
    if (val.length < 8) return 'At least 8 characters required.';
    if (!/[A-Z]/.test(val)) return 'Needs an uppercase letter.';
    if (!/[a-z]/.test(val)) return 'Needs a lowercase letter.';
    if (!/[0-9]/.test(val)) return 'Needs a number.';
    if (!/[^A-Za-z0-9]/.test(val)) return 'Needs a symbol (!@#$).';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailError = validateEmail(form.email);
    const passwordError = validatePassword(form.password);
    const newErrors = { email: emailError, password: passwordError };
    
    setErrors(newErrors);

    if (newErrors.email || newErrors.password) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 400);
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Generate Vault Keys CLIENT-SIDE
      const salt = generateSalt();
      const masterKey = await deriveMasterKey(form.password, salt);
      const verifier = await createKeyVerifier(masterKey);

      // 2. Generate Recovery Code
      const recCode = generateRecoveryCode();
      const recSalt = generateSalt();
      const recKey = await deriveRecoveryKey(recCode, recSalt);
      const { encryptedMasterKey: recEncMasterKey, iv: recIv } = await encryptMasterKeyWithRecoveryKey(masterKey, recKey);

      // 3. Send to API (Auth + Vault Params)
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          vaultSalt: salt,
          vaultVerifier: verifier,
          recoverySalt: recSalt,
          recoveryEncryptedMasterKey: recEncMasterKey,
          recoveryIv: recIv
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      // 4. Success - Show OTP Input
      setShowOtpInput(true);
      addToast('success', 'Verification code sent to your email.');
      
      // Store recovery code temporarily (don't show yet)
      // We will show it only after OTP verification
      setRecoveryCode(recCode); 

    } catch (err) {
      addToast('error', (err instanceof Error) ? err.message : 'Signup failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
          const res = await fetch('/api/auth/verify-otp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: form.email, otp })
          });
          
          if (!res.ok) {
              const data = await res.json();
              throw new Error(data.error || 'Verification failed');
          }

          // OTP Verified! Now show Recovery Code (which we stored earlier)
          setShowOtpInput(false); 
          addToast('success', 'Account verified successfully!');
          // recoveryCode is already set from previous step, so the UI will switch to "Account Created" view

      } catch (err) {
          addToast('error', (err instanceof Error) ? err.message : 'Verification failed');
          setIsShaking(true);
      } finally {
          setIsSubmitting(false);
      }
  };

  // --- RECOVERY CODE VIEW (Final Success) ---
  if (recoveryCode && !showOtpInput) {
    const handleCopy = () => {
      navigator.clipboard.writeText(recoveryCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      addToast('success', 'Recovery code copied to clipboard');
    };

    const handleDownload = () => {
      const blob = new Blob([`IMPORTANT - Vault Access Recovery Code\n\nCode: ${recoveryCode}\n\nEmail: ${form.email}\n\nKEEP THIS SAFE. If you forget your password, this is the ONLY way to recover your files.`], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'vault-recovery-code.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast('success', 'Recovery code downloaded');
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F3F4F6] p-4 relative overflow-hidden">
         <ToastContainer toasts={toasts} removeToast={removeToast} />
         <div className="max-w-xl w-full bg-white rounded-3xl shadow-2xl p-10 text-center relative z-10 animate-fade-in-up">
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-8 shadow-sm">
              <ShieldCheck size={40} className="text-green-600" />
            </div>
            
            <h2 className="text-3xl font-extrabold text-slate-800 mb-3 tracking-tight">Account Created!</h2>
            <p className="text-slate-500 text-base mb-8 leading-relaxed max-w-sm mx-auto">
              Your vault is ready. <br/>
              <strong className="text-red-500">SAVE THIS CODE NOW.</strong> It is the only way to recover your account if you forget your password.
            </p>
            
            <div className="bg-slate-900 rounded-2xl p-6 mb-8 relative group shadow-xl ring-1 ring-slate-900/5">
              <p className="font-mono text-green-400 text-xl break-all tracking-wider leading-relaxed selection:bg-green-500/30">{recoveryCode}</p>
              
              <div className="absolute top-3 right-3 flex gap-2">
                <button 
                  onClick={handleCopy}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors backdrop-blur-sm cursor-pointer"
                  title="Copy to clipboard"
                >
                  {copied ? <CheckCircle2 size={18} className="text-green-400" /> : <Copy size={18} />}
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <button 
                onClick={handleDownload}
                className="flex-1 py-3.5 px-6 rounded-xl border-2 border-slate-200 font-bold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 cursor-pointer group"
              >
                <Download size={18} className="group-hover:-translate-y-0.5 transition-transform" />
                Download
              </button>
              
              <Link 
                href="/login"
                className="flex-[2] py-3.5 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-blue-600/30 hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
              >
                Go to Login <ArrowRight size={18} />
              </Link>
            </div>
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white text-slate-900">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      {/* LEFT: Form */}
      <div className="flex flex-col justify-center px-8 py-12 lg:px-20 border-r border-slate-100">
        <Link href="/" className="flex items-center gap-2 mb-10 w-fit">
          <div className="rounded-lg bg-blue-600 p-1.5 text-white"><ShieldCheck size={20} /></div>
          <span className="text-lg font-bold">SecureStore</span>
        </Link>
        <div className="max-w-md w-full mx-auto">
          <h1 className="text-3xl font-extrabold mb-2">Create your vault</h1>
          <p className="text-slate-500 mb-8">Zero-knowledge privacy starts here.</p>

          <form onSubmit={showOtpInput ? handleVerifyOtp : handleSubmit} className="space-y-6" noValidate>
            
            {!showOtpInput && (
                <>
                <Input 
                  label="Email" 
                  type="email" 
                  value={form.email} 
                  error={errors.email} 
                  icon={<Mail size={18} />} 
                  onChange={(e) => setForm({...form, email: e.target.value})}
                  className={isShaking && !!errors.email ? 'animate-shake' : ''}
                />
                
                <div>
                    <Input 
                      label="Password" 
                      type="password" 
                      value={form.password} 
                      error={errors.password} 
                      icon={<Lock size={18} />}
                      onChange={(e) => setForm({...form, password: e.target.value})}
                      className={isShaking && !!errors.password ? 'animate-shake' : ''}
                    />
                    <div className="text-xs text-slate-400 mt-2 pl-1 flex flex-wrap gap-2">
                        <span className={/[A-Z]/.test(form.password) ? "text-green-600 font-bold" : ""}>• Upper</span>
                        <span className={/[a-z]/.test(form.password) ? "text-green-600 font-bold" : ""}>• Lower</span>
                        <span className={/[0-9]/.test(form.password) ? "text-green-600 font-bold" : ""}>• Number</span>
                        <span className={/[^A-Za-z0-9]/.test(form.password) ? "text-green-600 font-bold" : ""}>• Symbol</span>
                        <span className={form.password.length >= 8 ? "text-green-600 font-bold" : ""}>• 8+ Chars</span>
                    </div>
                </div>
                </>
            )}

            {showOtpInput && (
                <div className="animate-fade-in-up">
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-sm text-blue-800">
                        <p className="font-bold mb-1">Check your email</p>
                        <p>We sent a 6-digit verification code to <strong>{form.email}</strong></p>
                    </div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Verification Code</label>
                    <input 
                        className={`w-full px-4 py-3 rounded-xl border outline-none transition-all font-mono text-center text-2xl tracking-widest ${isShaking ? 'animate-shake border-red-500' : 'border-slate-200 focus:border-blue-600'}`}
                        placeholder="000000"
                        maxLength={6}
                        value={otp}
                        onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                        autoFocus
                    />
                </div>
            )}

            <Button 
                disabled={isSubmitting} 
                isLoading={isSubmitting}
                className={`w-full py-4 text-base ${showOtpInput ? "" : "bg-blue-600 hover:bg-blue-700"}`}
                rightIcon={!isSubmitting && <ArrowRight size={18} />}
            >
                {showOtpInput ? "Verify & Activate Account" : "Create Account & Vault"}
            </Button>
          </form>
          <p className="mt-8 text-center text-sm text-slate-500">Already have an account? <Link href="/login" className="font-bold text-blue-600 hover:underline">Log in</Link></p>
        </div>
      </div>

      {/* RIGHT: Animation */}
      <div className="hidden lg:flex flex-col justify-center bg-slate-50 relative overflow-hidden p-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-blue-100/40 via-transparent to-transparent" />
        <div className="relative z-10 max-w-sm mx-auto w-full">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 mb-8">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 text-center">Encryption Workflow</h3>
            <div className="flex flex-col items-center space-y-2">
               <WorkflowNode icon={<Lock size={20} />} label="Raw Password" isActive={animStep >= 0} isDone={animStep > 0} />
               <WorkflowArrow isActive={animStep >= 1} />
               <WorkflowNode icon={<Hash size={20} />} label="Secure Hashing" isActive={animStep >= 1} isDone={animStep > 1} />
               <WorkflowArrow isActive={animStep >= 2} />
               <WorkflowNode icon={<Key size={20} />} label="Key Generated" isActive={animStep >= 2} isDone={animStep > 2} isFinal />
            </div>
          </div>
          <p className="text-center text-slate-500 text-sm">Your raw password never leaves this loop.</p>
        </div>
      </div>
    </div>
  );
}

// --- Helpers ---
function WorkflowNode({ icon, label, isActive, isDone, isFinal }: WorkflowNodeProps) {
  const bgClass = isActive ? (isFinal ? "bg-green-50 border-green-200 text-green-600" : "bg-blue-50 border-blue-200 text-blue-600") : "bg-slate-50 border-slate-100 text-slate-400";
  return (
    <div className={`flex items-center gap-4 w-full p-4 rounded-xl border-2 transition-all duration-500 ${bgClass} ${isActive ? 'scale-105' : 'scale-100'}`}>
      <div className={`p-2 rounded-lg bg-white ${isActive ? 'shadow-sm' : ''}`}>{isDone && !isFinal ? <CheckCircle2 size={20} /> : icon}</div>
      <span className="font-bold text-sm">{label}</span>
    </div>
  );
}
function WorkflowArrow({ isActive }: WorkflowArrowProps) {
  return <div className={`h-8 w-0.5 relative transition-colors duration-500 ${isActive ? 'bg-blue-500' : 'bg-slate-200'}`}><div className={`absolute -bottom-1 -left-[3.5px] ${isActive ? 'text-blue-500' : 'text-slate-200'}`}><ArrowDown size={10} strokeWidth={4} /></div></div>;
}