'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Download, File as FileIcon, ShieldCheck, AlertTriangle, Loader2, Lock } from 'lucide-react';
import { hex2buf, decryptFile, KEY_LENGTH } from '@/lib/crypto';
import { ToastContainer, ToastMessage } from '@/components/ui/Toast';

export default function SharePage() {
    const params = useParams();
    const token = params.token as string;
    
    const [status, setStatus] = useState<'loading' | 'ready' | 'decrypting' | 'error'>('loading');
    const [fileMeta, setFileMeta] = useState<any>(null);
    const [error, setError] = useState('');
    const [limitReached, setLimitReached] = useState(false);
    
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const addToast = (type: 'success' | 'error', message: string) => {
        const id = Math.random().toString(36).substring(7);
        setToasts(prev => [...prev, { id, type, message }]);
    };
    const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

    useEffect(() => {
        const init = async () => {
            // 1. Check for Key in Hash
            const hash = window.location.hash;
            if (!hash || hash.length < 10) {
                setStatus('error');
                setError("Invalid Link: Decryption key missing from URL.");
                return;
            }

            try {
                // 2. Fetch Metadata from API (No Download URL yet)
                const res = await fetch(`/api/files/share/${token}`);
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || "Failed to load file");
                }
                
                const data = await res.json();
                setFileMeta(data.file);
                setLimitReached(data.limitReached);
                setStatus('ready');

            } catch (err: any) {
                console.error(err);
                setStatus('error');
                setError(err.message);
            }
        };

        if (token) init();
    }, [token]);

    const handleDownload = async () => {
        if (!fileMeta) return;
        if (limitReached) {
            addToast('error', "This link has reached its maximum download limit.");
            return;
        }

        try {
            setStatus('decrypting');

            // 1. Request Download URL (Increments Count)
            const dlRes = await fetch(`/api/files/share/${token}/download`, { method: 'POST' });
            if (!dlRes.ok) {
                const dlData = await dlRes.json();
                throw new Error(dlData.error || "Download limit reached or link expired");
            }
            const { downloadUrl } = await dlRes.json();

            // 2. Get Key from Hash
            const keyHex = window.location.hash.substring(1); // remove #
            const keyBuffer = hex2buf(keyHex);

            // 3. Import Key
            const fileKey = await crypto.subtle.importKey(
                "raw",
                keyBuffer,
                { name: "AES-GCM", length: KEY_LENGTH },
                false,
                ["decrypt"]
            );

            // 4. Download Encrypted Blob
            const res = await fetch(downloadUrl);
            if (!res.ok) throw new Error("Failed to download encrypted file");
            const encryptedBlob = await res.blob();

            // 5. Decrypt
            const decryptedBlob = await decryptFile(encryptedBlob, fileMeta.iv, fileKey);

            // 6. Trigger Download
            const url = URL.createObjectURL(decryptedBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileMeta.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            addToast('success', "File decrypted and downloaded!");
            setStatus('ready');

        } catch (err: any) {
            console.error("Download/Decrypt Error:", err);
            
            if (err.message.includes("limit reached")) {
                setLimitReached(true);
            }
            
            addToast('error', err.message || "Failed to decrypt file.");
            setStatus('ready'); 
        }
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
                <p className="text-slate-500 font-medium animate-pulse">Verifying Secure Link...</p>
            </div>
        );
    }

    if (status === 'error') {
        const isExpired = error.toLowerCase().includes('expired') || error.toLowerCase().includes('limit');
        
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 relative overflow-hidden">
                {/* Background Decoration */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                    <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] bg-red-50/40 rounded-full blur-3xl opacity-60"></div>
                    <div className="absolute -bottom-[20%] -left-[10%] w-[600px] h-[600px] bg-orange-50/40 rounded-full blur-3xl opacity-60"></div>
                </div>

                <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl shadow-red-900/5 max-w-md w-full text-center border border-white z-10 relative">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${isExpired ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'}`}>
                        {isExpired ? <ShieldCheck size={40} className="opacity-50" /> : <AlertTriangle size={36} />}
                        {isExpired && <div className="absolute"><Lock size={24} /></div>} 
                    </div>
                    
                    <h1 className="text-2xl font-bold text-slate-800 mb-3">
                        {isExpired ? 'Link Expired' : 'Access Denied'}
                    </h1>
                    
                    <p className="text-slate-500 mb-8 leading-relaxed">
                        {isExpired 
                            ? "This secure link is no longer active. It may have reached its download limit or passed its expiration date."
                            : error
                        }
                    </p>

                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-sm text-slate-600">
                        <p className="font-semibold mb-1">Need this file?</p>
                        <p>Contact the sender and ask them to generate a new secure link.</p>
                    </div>
                </div>
                
                <div className="mt-8 text-slate-400 text-sm font-medium flex items-center gap-2 z-10">
                    <Lock size={14} /> Secured by Zero-Knowledge Vault
                </div>
            </div>
        );
    }

    // READY or DECRYPTING
    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 relative overflow-hidden">
            <ToastContainer toasts={toasts} removeToast={removeToast} />
            
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] bg-blue-100/40 rounded-full blur-3xl opacity-60"></div>
                <div className="absolute -bottom-[20%] -left-[10%] w-[600px] h-[600px] bg-indigo-100/40 rounded-full blur-3xl opacity-60"></div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl shadow-blue-900/5 max-w-md w-full text-center border border-white z-10 relative">
                
                {/* Secure Badge */}
                <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-8 border border-green-100">
                    <ShieldCheck size={14} /> End-to-End Encrypted
                </div>

                {/* File Icon */}
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/20 text-white transform rotate-3">
                    <FileIcon size={40} />
                </div>

                <h1 className="text-xl font-bold text-slate-800 mb-1 break-words line-clamp-2">
                    {fileMeta.name}
                </h1>
                <p className="text-slate-500 font-medium mb-8">
                    {(fileMeta.size / 1024 / 1024).toFixed(2)} MB
                </p>

                <button 
                    onClick={handleDownload}
                    disabled={status === 'decrypting' || limitReached}
                    className={`
                        w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all transform active:scale-95
                        ${status === 'decrypting' || limitReached
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-600/20 hover:shadow-2xl hover:shadow-blue-600/30'
                        }
                    `}
                >
                    {status === 'decrypting' ? (
                        <>
                            <Loader2 className="animate-spin" size={24} />
                            Decrypting...
                        </>
                    ) : (
                        <>
                            <Download size={24} />
                            {limitReached ? "Download Limit Reached" : "Download File"}
                        </>
                    )}
                </button>

                <p className="mt-6 text-xs text-slate-400 max-w-[280px] mx-auto text-center leading-relaxed">
                    This file is encrypted. It is being decrypted directly in your browser using the key from the link.
                </p>
            </div>
            
            <div className="mt-8 text-slate-400 text-sm font-medium flex items-center gap-2 z-10">
                <Lock size={14} /> Secured by Zero-Knowledge Vault
            </div>
        </div>
    );
}
