'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, ArrowRight, Lock, 
  CheckCircle2, ArrowDown, FileLock, KeyRound, FileText, Mail
} from 'lucide-react';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { deriveMasterKey, createKeyVerifier } from '@/lib/crypto';
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

export default function LoginPage() {
  const router = useRouter();
  
  // --- STATE ---
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [animStep, setAnimStep] = useState(0);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailError = validateEmail(form.email);
    const passwordError = !form.password ? 'Password is required.' : '';
    const newErrors = { email: emailError, password: passwordError };
    
    setErrors(newErrors);

    if (newErrors.email || newErrors.password) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 400);
      return;
    }

    setIsSubmitting(true);
    
    try {
        // 1. Authenticate with Server (Get Vault params)
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
    
        const data = await res.json();
    
        if (!res.ok) {
          throw new Error(data.error || 'Login failed');
        }

        // 2. Client-Side Encryption Key Derivation
        if (data.vaultSalt && data.vaultVerifier) {
            // Derive Key
            const masterKey = await deriveMasterKey(form.password, data.vaultSalt);
            const computedVerifier = await createKeyVerifier(masterKey);

            if (computedVerifier !== data.vaultVerifier) {
                // This implies a CRITICAL logic error or data corruption, 
                // because the server authenticated the password hash independently.
                // However, if the client logic for PBKDF2 differs, this catches it.
                throw new Error("Security Check Failed: Key mismatch.");
            }

            // 3. Store Key in Session Storage (Temporary)
            // Ideally we use an in-memory Context, but for this architecture, SessionStorage allows page reloads.
            // We must serialize the CryptoKey to store it.
            const exportedKey = await crypto.subtle.exportKey("jwk", masterKey);
            sessionStorage.setItem("vault_key", JSON.stringify(exportedKey));
            
        } else {
             // Handle Legacy users with no vault? Or just ignore.
             console.warn("No vault data found for user.");
        }
    
        // 4. Redirect
        if (data.isProfileComplete) {
          router.push('/dashboard');
        } else {
          router.push('/onboarding');
        }
    
      } catch (err) {
        addToast('error', (err instanceof Error) ? err.message : 'Login failed');
      } finally {
        setIsSubmitting(false);
      }
    };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white text-slate-900">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      {/* LEFT: Form */}
      <div className="flex flex-col justify-center px-8 py-12 lg:px-20 border-r border-slate-100">
        <Link href="/" className="flex items-center gap-2 mb-10 w-fit">
          <div className="rounded-lg bg-blue-600/10 p-1.5 text-blue-600"><BrandLogo size={20} /></div>
          <span className="text-lg font-bold">SecureStore</span>
        </Link>
        <div className="max-w-md w-full mx-auto">
          <h1 className="text-3xl font-extrabold mb-2">Welcome back</h1>
          <p className="text-slate-500 mb-8">Enter your credentials to unlock your vault.</p>

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
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
              <div className="flex justify-end mt-2">
                <Link href="/forgot-password" className="text-sm font-bold text-blue-600 hover:text-blue-500 transition-colors">
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button 
              disabled={isSubmitting} 
              isLoading={isSubmitting}
              className="w-full py-4 text-base"
              rightIcon={!isSubmitting && <ArrowRight size={18} />}
            >
              Unlock Vault
            </Button>
          </form>
          <p className="mt-8 text-center text-sm text-slate-500">Don&apos;t have a vault? <Link href="/signup" className="font-bold text-blue-600 hover:underline">Create one</Link></p>
        </div>
      </div>

      {/* RIGHT: Animation */}
      <div className="hidden lg:flex flex-col justify-center bg-slate-50 relative overflow-hidden p-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-indigo-100/40 via-transparent to-transparent" />
        <div className="relative z-10 max-w-sm mx-auto w-full">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 mb-8">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 text-center">Decryption Workflow</h3>
            <div className="flex flex-col items-center space-y-2">
               <WorkflowNode icon={<FileLock size={20} />} label="Encrypted Blob" isActive={animStep >= 0} isDone={animStep > 0} />
               <WorkflowArrow isActive={animStep >= 1} />
               <WorkflowNode icon={<KeyRound size={20} />} label="Reconstructing Key" isActive={animStep >= 1} isDone={animStep > 1} />
               <WorkflowArrow isActive={animStep >= 2} />
               <WorkflowNode icon={<FileText size={20} />} label="Data Decrypted" isActive={animStep >= 2} isDone={animStep > 2} isFinal />
            </div>
          </div>
          <p className="text-center text-slate-500 text-sm">The server never sees the decrypted data.</p>
        </div>
      </div>
    </div>
  );
}

// --- Helpers ---
function WorkflowNode({ icon, label, isActive, isDone, isFinal }: WorkflowNodeProps) {
  const bgClass = isActive ? (isFinal ? "bg-green-50 border-green-200 text-green-600" : "bg-indigo-50 border-indigo-200 text-indigo-600") : "bg-slate-50 border-slate-100 text-slate-400";
  return (
    <div className={`flex items-center gap-4 w-full p-4 rounded-xl border-2 transition-all duration-500 ${bgClass} ${isActive ? 'scale-105' : 'scale-100'}`}>
      <div className={`p-2 rounded-lg bg-white ${isActive ? 'shadow-sm' : ''}`}>{isDone && !isFinal ? <CheckCircle2 size={20} /> : icon}</div>
      <span className="font-bold text-sm">{label}</span>
    </div>
  );
}
function WorkflowArrow({ isActive }: WorkflowArrowProps) {
  return <div className={`h-8 w-0.5 relative transition-colors duration-500 ${isActive ? 'bg-indigo-500' : 'bg-slate-200'}`}><div className={`absolute -bottom-1 -left-[3.5px] ${isActive ? 'text-indigo-500' : 'text-slate-200'}`}><ArrowDown size={10} strokeWidth={4} /></div></div>;
}
