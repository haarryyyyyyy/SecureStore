'use client';

import React from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  Lock, 
  EyeOff, 
  Key, 
  FileCheck, 
  Server,
  ArrowRight,
  Fingerprint,
  Globe,
  Menu,
  X,
  Cpu,
  Database
} from 'lucide-react';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function HomePage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-white text-slate-900 scroll-smooth">
      
      {/* --- Navbar --- */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-100 bg-white/90 backdrop-blur-md">
        <div className="container mx-auto flex h-20 items-center justify-between px-6">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600">
              <BrandLogo size={28} />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-slate-900">SafeCloud</span>
          </Link>

          {/* Links */}
          <div className="hidden md:flex items-center gap-10 text-sm font-semibold text-slate-500">
            <Link href="#security" className="hover:text-blue-600 transition-colors">Security Flow</Link>
            <Link href="#architecture" className="hover:text-blue-600 transition-colors">Architecture</Link>
            <Link href="#features" className="hover:text-blue-600 transition-colors">Features</Link>
          </div>

          {/* Auth */}
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-bold text-slate-700 hover:text-blue-600 hidden sm:block">
              Log In
            </Link>
            <Link 
              href="/signup" 
              className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-lg hover:bg-slate-800 hover:-translate-y-0.5 transition-all"
            >
              Get Started
            </Link>
          </div>
          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg z-50 relative"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>


      </header>

      <main className="flex-1">
        
        {/* --- Hero Section --- */}
        <section className="relative pt-24 pb-32 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-blue-50/50 via-white to-white -z-10" />

          <div className="container mx-auto px-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-blue-700 mb-8">
              <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
              Client-Side Encryption Standard
            </div>

            <h1 className="mx-auto max-w-4xl text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1] mb-8">
              The only vault where <br />
              <span className="text-blue-600">we can't see your files.</span>
            </h1>
            
            <p className="mx-auto max-w-2xl text-lg md:text-xl text-slate-500 leading-relaxed mb-10">
              Traditional cloud storage holds the keys to your data. We don't. 
              Your files are encrypted in your browser before they ever leave your device.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="w-full sm:w-auto rounded-xl bg-blue-600 px-8 py-4 text-base font-bold text-white shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all"
              >
                Create Secure Vault
              </Link>
              <Link 
                href="#architecture" 
                className="w-full sm:w-auto rounded-xl border border-slate-200 bg-white px-8 py-4 text-base font-bold text-slate-700 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
              >
                View Architecture <ArrowRight size={18}/>
              </Link>
            </div>
          </div>
        </section>

        {/* --- Section 1: Security Flow (How it works) --- */}
        <section id="security" className="py-24 bg-slate-50 border-y border-slate-200">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-blue-600 font-bold tracking-wide uppercase text-sm mb-3">Security Process</h2>
              <p className="text-3xl md:text-4xl font-extrabold text-slate-900">
                Data is encrypted <span className="underline decoration-blue-300 decoration-4 underline-offset-4">before</span> it uploads.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-12 relative">
              {/* Connector Line (Desktop Only) */}
              <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-slate-200 -z-10 border-t-2 border-dashed border-slate-300"></div>

              {/* Step 1 */}
              <div className="relative flex flex-col items-center text-center group">
                <div className="h-24 w-24 bg-white rounded-full border-4 border-white shadow-xl flex items-center justify-center mb-8 relative z-10 group-hover:scale-110 transition-transform">
                  <div className="bg-blue-50 p-4 rounded-full text-blue-600">
                    <Lock size={32} />
                  </div>
                  <div className="absolute -top-2 -right-2 bg-slate-900 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold border-4 border-white">1</div>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Browser Encryption</h3>
                <p className="text-slate-600 text-sm leading-relaxed max-w-xs">
                  We use <strong>military-grade encryption</strong> to secure files locally. We never see your password.
                </p>
              </div>

              {/* Step 2 */}
              <div className="relative flex flex-col items-center text-center group">
                <div className="h-24 w-24 bg-white rounded-full border-4 border-white shadow-xl flex items-center justify-center mb-8 relative z-10 group-hover:scale-110 transition-transform">
                  <div className="bg-indigo-50 p-4 rounded-full text-indigo-600">
                    <Globe size={32} />
                  </div>
                  <div className="absolute -top-2 -right-2 bg-slate-900 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold border-4 border-white">2</div>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Secure Tunnel</h3>
                <p className="text-slate-600 text-sm leading-relaxed max-w-xs">
                  Encrypted files are streamed securely. Our servers handle the transfer without ever decrypting your data.
                </p>
              </div>

              {/* Step 3 */}
              <div className="relative flex flex-col items-center text-center group">
                <div className="h-24 w-24 bg-white rounded-full border-4 border-white shadow-xl flex items-center justify-center mb-8 relative z-10 group-hover:scale-110 transition-transform">
                  <div className="bg-emerald-50 p-4 rounded-full text-emerald-600">
                    <Database size={32} />
                  </div>
                  <div className="absolute -top-2 -right-2 bg-slate-900 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold border-4 border-white">3</div>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Opaque Storage</h3>
                <p className="text-slate-600 text-sm leading-relaxed max-w-xs">
                  The database stores only ciphertext. Without your key, the data is mathematically indistinguishable from noise.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* --- Section 2: Architecture (The New Tab) --- */}
        <section id="architecture" className="py-24 bg-white scroll-mt-20">
          <div className="container mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              
              {/* Left: Content */}
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider mb-6">
                  <Cpu size={14} /> System Design
                </div>
                <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-6 leading-tight">
                  Built on a modern <br />
                  <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-indigo-600">Zero-Knowledge Stack.</span>
                </h2>
                <p className="text-lg text-slate-500 mb-8 leading-relaxed">
                  We leverage power of <b>Cutting-edge Tech</b> for the frontend interface and <b>High-Speed Streams</b> for the backend to handle large encrypted payloads efficiently.
                </p>

                <div className="space-y-6">
                  <ArchitectureItem 
                    title="Client Layer (Next.js)"
                    desc="Handles Secure Key Generation and industry-standard encryption within the browser."
                  />
                  <ArchitectureItem 
                    title="Transport Layer"
                    desc="A stateless system that pipes encrypted binary streams directly to storage, keeping your data private."
                  />
                  <ArchitectureItem 
                    title="Persistence Layer (DB)"
                    desc="Stores encrypted blobs and hashed metadata. Zero plain-text data is ever persisted."
                  />
                </div>
              </div>

              {/* Right: Technical Diagram / Visual */}
              <div className="relative">
                <div className="absolute inset-0 bg-blue-600/5 rounded-3xl transform rotate-3"></div>
                <div className="relative bg-slate-900 rounded-3xl p-8 shadow-2xl overflow-hidden border border-slate-800">
                  {/* Fake Code Window Header */}
                  <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-4">
                    <div className="w-3 h-3 rounded-full bg-red-500"/>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"/>
                    <div className="w-3 h-3 rounded-full bg-green-500"/>
                    <div className="ml-auto text-xs text-slate-500 font-mono">encryption.ts</div>
                  </div>
                  
                  {/* Fake Code Snippet */}
                  <div className="font-mono text-sm space-y-4">
                    <div>
                      <span className="text-purple-400">const <span className="text-blue-400">encryptFile</span> = <span className="text-yellow-300">async</span> (file, key) =&gt; {'{'}</span>
                    </div>
                    <div className="pl-6 text-slate-400">
                      // 1. Generate IV
                    </div>
                    <div className="pl-6">
                      <span className="text-purple-400">const iv = crypto.getRandomValues(<span className="text-orange-400">new</span> Uint8Array(12));</span>
                    </div>
                     <div className="pl-6 text-slate-400 mt-2">
                      // 2. Encrypt with AES-GCM
                    </div>
                    <div className="pl-6">
                      <span className="text-purple-400">return window.crypto.subtle.encrypt(
                      <br/> &nbsp;&nbsp;{'{'} name: <span className="text-green-400">"AES-GCM"</span>, iv {'}'},
                      <br/> &nbsp;&nbsp;key,
                      <br/> &nbsp;&nbsp;file
                      <br/>);</span>
                    </div>
                    <div className='text-purple-400'>{'}'}</div>
                  </div>
                  
                  <div className="absolute bottom-0 right-0 p-8 opacity-20">
                     <ShieldCheck size={120} className="text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- Section 3: Features Grid --- */}
        <section id="features" className="py-24 bg-slate-50 border-t border-slate-200">
          <div className="container mx-auto px-6">
            <div className="mb-16">
              <h2 className="text-3xl font-extrabold text-slate-900 mb-6">Key Features</h2>
              <p className="text-lg text-slate-500 max-w-2xl">
                Stripped of bloat, focused on privacy.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard 
                icon={<Fingerprint className="text-blue-600" size={24} />}
                title="Client-Side Keys"
                desc="Your encryption key is derived locally. It never leaves your device."
              />
              <FeatureCard 
                icon={<ShieldCheck className="text-indigo-600" size={24} />}
                title="Strong Encryption"
                desc="Military-grade encryption standard authenticated with industry protocols."
              />
              <FeatureCard 
                icon={<EyeOff className="text-emerald-600" size={24} />}
                title="No Metadata Leaks"
                desc="We encrypt filenames and sizes. We can't even see what you're storing."
              />
              <FeatureCard 
                icon={<Key className="text-amber-500" size={24} />}
                title="Non-Custodial"
                desc="If you lose your password, we cannot recover it. No backdoors."
              />
              <FeatureCard 
                icon={<Server className="text-violet-600" size={24} />}
                title="Instant Access"
                desc="High-performance streams for instant access to large encrypted files."
              />
              <FeatureCard 
                icon={<FileCheck className="text-rose-500" size={24} />}
                title="Verifiable"
                desc="Our cryptographic implementation is open for inspection."
              />
            </div>
          </div>
        </section>

        {/* --- CTA Section --- */}
        <section className="bg-slate-900 text-white py-24">
          <div className="container mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Start encrypting today.</h2>
            <p className="text-slate-400 text-lg mb-10 max-w-xl mx-auto">
              Secure your digital assets with a vault only you can open.
            </p>
            <Link 
              href="/signup" 
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/50"
            >
              Get Started for Free <ArrowRight size={20} />
            </Link>
          </div>
        </section>

      </main>

      {/* --- Footer --- */}
      <footer className="bg-white border-t border-slate-100 py-12">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-slate-400" />
            <span className="text-sm font-bold text-slate-700">SecureStore</span>
          </div>
          <p className="text-sm text-slate-400">
            &copy; 2026 SecureStore Inc. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm md:hidden"
            />
            
            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 right-0 z-[61] w-full max-w-xs bg-white shadow-2xl p-6 md:hidden flex flex-col h-full overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <span className="text-xl font-extrabold tracking-tight text-slate-900">Menu</span>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 -mr-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex flex-col gap-2 font-bold text-slate-700">
                <Link href="#security" onClick={() => setIsMobileMenuOpen(false)} className="py-3 px-4 hover:bg-slate-50 rounded-xl transition-colors flex items-center justify-between group">
                  <span>Security</span>
                  <ArrowRight size={16} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </Link>
                <Link href="#architecture" onClick={() => setIsMobileMenuOpen(false)} className="py-3 px-4 hover:bg-slate-50 rounded-xl transition-colors flex items-center justify-between group">
                  <span>Architecture</span>
                  <ArrowRight size={16} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </Link>
                <Link href="#features" onClick={() => setIsMobileMenuOpen(false)} className="py-3 px-4 hover:bg-slate-50 rounded-xl transition-colors flex items-center justify-between group">
                  <span>Features</span>
                  <ArrowRight size={16} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </Link>
              </div>

              <div className="mt-auto pt-8 border-t border-slate-100 flex flex-col gap-4">
                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="w-full py-3.5 text-center font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-colors">
                  Log In
                </Link>
                <Link href="/signup" onClick={() => setIsMobileMenuOpen(false)} className="w-full py-3.5 text-center font-bold text-white bg-slate-900 rounded-xl shadow-lg shadow-slate-900/10 hover:bg-slate-800 transition-all active:scale-[0.98]">
                  Get Started
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* --- Sub-Components --- */

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="p-8 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group">
      <div className="h-12 w-12 bg-slate-50 rounded-xl flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

function ArchitectureItem({ title, desc }: { title: string, desc: string }) {
  return (
    <div className="flex gap-4">
      <div className="mt-1">
        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-blue-600" />
        </div>
      </div>
      <div>
        <h4 className="text-lg font-bold text-slate-900">{title}</h4>
        <p className="text-slate-500 text-sm leading-relaxed mt-1">{desc}</p>
      </div>
    </div>
  );
}