'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User, Loader2, Globe, Calendar, 
  ShieldCheck, Lock, Sparkles, ChevronDown, AlertCircle
} from 'lucide-react';
// import { generateSalt, deriveMasterKey, createKeyVerifier, generateRecoveryCode, deriveRecoveryKey, encryptMasterKeyWithRecoveryKey } from '@/lib/crypto';

export default function OnboardingPage() {
  const router = useRouter();
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(false);

  // Removed phone and password fields
  const [form, setForm] = useState({ 
    name: '', gender: '', country: '', dob: ''
  });
  
  const [errors, setErrors] = useState({
    name: '', gender: '', country: '', dob: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  // --- Auth Check ---
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        if (!res.ok) throw new Error('Not logged in');
        const data = await res.json();
        
        if (data.isProfileComplete) {
          router.push('/dashboard');
        } else {
          setIsLoadingAuth(false);
        }
      } catch (err) {
        setAuthError(true);
        setIsLoadingAuth(false);
        setTimeout(() => router.push('/login'), 2000);
      }
    };
    checkSession();
  }, [router]);

  // --- Validation ---
  const validateForm = () => {
    const newErrors: any = {};
    let isValid = true;
    if (!form.name.trim()) { newErrors.name = 'Full name is required'; isValid = false; }
    if (!form.dob) { newErrors.dob = 'Date of birth is required'; isValid = false; }
    if (!form.country) { newErrors.country = 'Please select a country'; isValid = false; }
    if (!form.gender) { newErrors.gender = 'Please select a gender'; isValid = false; }
    
    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 400);
      return;
    }
    setIsSubmitting(true);
    try {
      // Update Profile Only (Vault is already set up at Signup)
      const res = await fetch('/api/user/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          gender: form.gender,
          country: form.country,
          dob: form.dob
        }),
      });
      
      if (!res.ok) throw new Error('Failed to update profile');
      
      // Success!
      router.push('/dashboard');

    } catch (err) {
      alert("Error updating profile");
      setIsSubmitting(false);
    }
  };

  const getInputClass = (hasError: boolean) => `
    w-full px-4 py-3 rounded-xl bg-slate-50 border outline-none transition-all font-medium text-slate-700
    ${hasError ? 'border-red-500 focus:ring-4 focus:ring-red-500/10' : 'border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 hover:border-blue-300'}
  `;

  if (isLoadingAuth) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;
  if (authError) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><p className="text-red-500 font-bold">Access Denied. Redirecting...</p></div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F3F4F6] p-4 relative overflow-hidden">
      
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-300/30 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-300/30 rounded-full blur-[100px]" />
      </div>

      <div className={`max-w-4xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative z-10 min-h-[600px] transition-transform duration-300 ${isShaking ? 'animate-shake' : ''}`}>
        
        {/* Sidebar */}
        <div className="md:w-5/12 bg-gradient-to-br from-blue-600 to-indigo-800 p-10 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent scale-150" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-8 opacity-80"><ShieldCheck size={20} /> <span className="font-bold tracking-wide text-sm">SECURE VAULT</span></div>
            <h1 className="text-4xl font-extrabold mb-4 leading-tight">Almost <br /> There!</h1>
            <p className="text-blue-100 text-sm leading-relaxed max-w-xs">Just a few more details to finish your profile.</p>
          </div>
          <div className="relative z-10 mt-10 md:mt-0">
             <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10">
                <div className="bg-white/20 p-2 rounded-lg"><User size={20} className="text-white" /></div>
                <div><p className="text-xs font-bold text-blue-100 uppercase">Status</p><p className="text-sm font-semibold">Profile Incomplete</p></div>
                <div className="ml-auto"><div className="h-8 w-8 rounded-full border-2 border-white/30 flex items-center justify-center text-xs font-bold">50%</div></div>
             </div>
          </div>
        </div>

        {/* Form */}
        <div className="md:w-7/12 p-8 md:p-12 bg-white">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-slate-800">Your Details</h2>
            <div className="flex gap-1"><div className="h-2 w-8 rounded-full bg-blue-600" /><div className="h-2 w-2 rounded-full bg-slate-200" /></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            
            <div className="group">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Full Legal Name</label>
              <div className="relative">
                <input type="text" className={`${getInputClass(!!errors.name)} pl-10`} placeholder="e.g. Sarah Connor" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} />
                <User size={18} className="absolute left-3.5 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              </div>
              {errors.name && <p className="text-red-500 text-xs mt-1 font-semibold flex items-center gap-1"><AlertCircle size={12}/> {errors.name}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="group">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Date of Birth</label>
                <div className="relative">
                  <input type="date" className={`${getInputClass(!!errors.dob)} pl-10 appearance-none [color-scheme:light]`} value={form.dob} onChange={(e) => setForm({...form, dob: e.target.value})} />
                  <Calendar size={18} className="absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
                </div>
                {errors.dob && <p className="text-red-500 text-xs mt-1 font-semibold flex items-center gap-1"><AlertCircle size={12}/> {errors.dob}</p>}
              </div>

              <div className="group">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Country of Residence</label>
                <div className="relative">
                  <select className={`${getInputClass(!!errors.country)} pl-10 appearance-none cursor-pointer`} value={form.country} onChange={(e) => setForm({...form, country: e.target.value})}>
                    <option value="" disabled>Select Country</option>
                    <option value="US">United States</option>
                    <option value="IN">India</option>
                    <option value="GB">United Kingdom</option>
                    <option value="CA">Canada</option>
                    <option value="AU">Australia</option>
                    <option value="DE">Germany</option>
                    <option value="JP">Japan</option>
                    <option value="OTHER">Other</option>
                  </select>
                  <Globe size={18} className="absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
                  <div className="absolute right-4 top-3.5 pointer-events-none"><ChevronDown size={16} className="text-slate-400" /></div>
                </div>
                {errors.country && <p className="text-red-500 text-xs mt-1 font-semibold flex items-center gap-1"><AlertCircle size={12}/> {errors.country}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Gender Identity</label>
              <div className="grid grid-cols-3 gap-3">
                {['Male', 'Female', 'Other'].map((g) => (
                  <button key={g} type="button" onClick={() => setForm({...form, gender: g.toLowerCase()})} className={`relative overflow-hidden py-3 rounded-xl text-sm font-bold border transition-all duration-300 flex items-center justify-center gap-2 ${form.gender === g.toLowerCase() ? 'bg-slate-900 text-white border-slate-900 shadow-lg scale-[1.02]' : errors.gender ? 'bg-red-50 border-red-300 text-red-600' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-400 hover:text-blue-600'}`}>
                    {g}
                    {form.gender === g.toLowerCase() && <div className="absolute inset-0 bg-white/10 animate-pulse" />}
                  </button>
                ))}
              </div>
              {errors.gender && <p className="text-red-500 text-xs mt-1 font-semibold flex items-center gap-1"><AlertCircle size={12}/> {errors.gender}</p>}
            </div>

            <button disabled={isSubmitting} className="w-full mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-blue-600/30 hover:-translate-y-0.5 transform active:scale-95">
              {isSubmitting ? <Loader2 className="animate-spin" /> : <><Sparkles size={18} /> Complete Profile</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}