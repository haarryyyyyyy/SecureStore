'use client';

import { ToastContainer, ToastMessage } from '@/components/ui/Toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  LayoutGrid, Share2, Trash2, Search, Plus, LogOut, 
  ShieldCheck, Lock, User as UserIcon, X, Loader2, Copy, CheckCircle, Save, Menu
} from 'lucide-react';
import { 
  generateFileKey, encryptFile, wrapFileKey, unwrapFileKey, buf2hex
} from '@/lib/crypto';
import { motion, AnimatePresence } from 'framer-motion';

// --- Components ---
import { FileRow } from '@/components/dashboard/FileRow';
import { SecuritySettings } from '@/components/dashboard/SecuritySettings';
import { UploadDragOverlay } from '@/components/dashboard/UploadDragOverlay';
import { UsageWidget } from '@/components/dashboard/UsageWidget';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { NavItem } from '@/components/dashboard/NavItem';
import { UploadProgressToast } from '@/components/dashboard/UploadProgressToast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';

// --- Types ---
import { FileItem } from '@/types';

type Tab = 'files' | 'shared' | 'trash' | 'profile' | 'security';

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('files');
  const [isDragOver, setIsDragOver] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile Sidebar State

  // Profile State
  const [profileForm, setProfileForm] = useState({ name: '', email: '', country: '', dob: '' });
  const [initialProfileForm, setInitialProfileForm] = useState({ name: '', email: '', country: '', dob: '' });
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  
  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cachedMasterKey, setCachedMasterKey] = useState<CryptoKey | null>(null);
  
  // Loading States
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);

  // --- TOAST STATE ---
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const addToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { id, type, message }]);
  }, []);
  
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // --- CONFIRM MODAL STATE ---
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive?: boolean;
    isLoading?: boolean;
    confirmText?: string; 
    cancelText?: string;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const closeConfirm = () => setConfirmState(prev => ({ ...prev, isOpen: false }));

  // --- MOCK DATA / SKELETONS ---
  const SkeletonRow = () => (
    <div className="grid grid-cols-12 gap-4 p-4 items-center animate-pulse">
        <div className="col-span-6 flex items-center gap-4">
            <div className="h-10 w-10 bg-slate-200 rounded-xl"></div>
            <div className="h-4 w-32 bg-slate-200 rounded"></div>
        </div>
        <div className="col-span-2 h-4 w-16 bg-slate-200 rounded"></div>
        <div className="col-span-3 h-4 w-24 bg-slate-200 rounded"></div>
        <div className="col-span-1 h-8 w-8 bg-slate-200 rounded-lg ml-auto"></div>
    </div>
  );

  const [isLearnMoreOpen, setIsLearnMoreOpen] = useState(false);

  // --- INIT ---
  useEffect(() => {
    // 1. Fetch User Profile on Mount
    const fetchUser = async () => {
        try {
            const res = await fetch(`/api/user/me?t=${Date.now()}`);
            if(res.ok) {
                const { user } = await res.json();
                const fetchedData = { 
                    name: user.name || '', 
                    email: user.email || '',
                    country: user.country || '', 
                    dob: user.dob ? user.dob.split('T')[0] : '' 
                };
                setProfileForm(fetchedData);
                setInitialProfileForm(fetchedData);
            }
        } catch(e) { console.error('Failed to fetch user', e); }
    };
    fetchUser();

    // 2. Load Cached Master Key
    const loadCachedKey = async () => {
        try {
            const storedKey = sessionStorage.getItem("vault_key");
            if (storedKey) {
                const jwk = JSON.parse(storedKey);
                const key = await crypto.subtle.importKey(
                    "jwk", 
                    jwk, 
                    { name: "AES-GCM", length: 256 }, 
                    true, 
                    ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
                );
                setCachedMasterKey(key);
            }
        } catch (e) {
            console.error("Failed to load session key", e);
        }
    };
    loadCachedKey();

  }, []);
  
  // Files State
  const [files, setFiles] = useState<FileItem[]>([]);
  const [storageUsage, setStorageUsage] = useState(0);
  const STORAGE_LIMIT = 1 * 1024 * 1024 * 1024; // 1 GB

  // Shared Links State
  const [sharedLinks, setSharedLinks] = useState<any[]>([]);
  const [isLoadingShared, setIsLoadingShared] = useState(false);

  useEffect(() => {
    const fetchFiles = async () => {
      if (activeTab === 'files' || activeTab === 'trash') {
          setIsLoadingFiles(true);
          const isTrash = activeTab === 'trash';
          try {
            const res = await fetch(`/api/files/list?trash=${isTrash}&t=${Date.now()}`, { cache: 'no-store' });
            if (res.ok) {
              const data = await res.json();
              if (data.files.length === 0) await new Promise(r => setTimeout(r, 500)); 
              
              if (!isTrash) {
                 const totalBytes = data.files.reduce((acc: number, f: any) => acc + f.size, 0);
                 setStorageUsage(totalBytes);
              }
    
              const mappedFiles = data.files.map((f: any) => ({
                id: f._id,
                name: f.name,
                size: (f.size / 1024 / 1024).toFixed(2) + ' MB',
                type: f.mimeType,
                date: new Date(f.createdAt).toLocaleDateString(),
                encryptedKey: f.encryptedKey,
                iv: f.iv,
                keyIv: f.keyIv
              }));
              setFiles(mappedFiles);
            }
          } catch (e) { console.error("Failed to load files", e); }
          finally { setIsLoadingFiles(false); }
      } else if (activeTab === 'shared') {
          setIsLoadingShared(true);
          try {
              const res = await fetch(`/api/files/shared-links?t=${Date.now()}`, { cache: 'no-store' });
              if (res.ok) {
                  const data = await res.json();
                  setSharedLinks(data.links);
              }
          } catch (e) { console.error("Failed to load shared links", e); }
          finally { setIsLoadingShared(false); }
      }
    };
    fetchFiles();
  }, [activeTab]);

  // --- LOGOUT FUNCTION ---
  const handleLogout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch (e) {}
    localStorage.clear();
    sessionStorage.clear();
    document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    window.location.href = '/login';
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsUpdatingProfile(true);
      try {
          const res = await fetch('/api/user/update', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(profileForm)
          });
          if (!res.ok) throw new Error('Update failed');
          addToast('success', 'Profile details updated!');
      } catch(e) {
          addToast('error', 'Failed to update profile.');
      }
      setIsUpdatingProfile(false);
      setIsEditingProfile(false);
      setInitialProfileForm(profileForm);
  };

  const handleCancelEdit = () => {
      setProfileForm(initialProfileForm);
      setIsEditingProfile(false);
  };

  // --- CORE UPLOAD LOGIC ---
  const performUpload = async (file: File, key: CryptoKey) => {
      setIsUploading(true);
      setUploadProgress(10);
      try {
          const fileKey = await generateFileKey();
          const { encryptedBlob, iv: fileIv } = await encryptFile(file, fileKey);
          setUploadProgress(60); 

          const { wrappedKey, iv: keyIv } = await wrapFileKey(fileKey, key);
          
          const formData = new FormData();
          formData.append('file', encryptedBlob);
          formData.append('metadata', JSON.stringify({
              name: file.name,
              size: file.size,
              mimeType: file.type, 
              encryptedKey: wrappedKey, 
              iv: fileIv,
              keyIv: keyIv 
          }));

          setUploadProgress(80); 

          const res = await fetch('/api/files/upload', {
              method: 'POST',
              body: formData
          });

          if (!res.ok) {
              const err = await res.json();
              throw new Error(err.error || 'Upload failed');
          }

          setUploadProgress(100);
          addToast('success', 'File encrypted and uploaded successfully!');
          
          setTimeout(() => window.location.reload(), 1000); 

      } catch (err: any) {
          console.error(err);
          addToast('error', 'Upload failed: ' + err.message);
      } finally {
          setIsUploading(false);
          setUploadProgress(0);
      }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setSelectedFile(file);

          if (cachedMasterKey) {
              performUpload(file, cachedMasterKey);
          } else {
              addToast('error', "Encryption Key missing. Please login again.");
              handleLogout();
          }
      }
  };

  // Global Drag & Drop Events
  useEffect(() => {
    const handleWindowDragOver = (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(true);
    };

    const handleWindowDragLeave = (e: DragEvent) => {
        if (e.clientX === 0 && e.clientY === 0) setIsDragOver(false);
    };

    const handleWindowDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      
      if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
          const file = e.dataTransfer.files[0];
          setSelectedFile(file);
          
          if (cachedMasterKey) {
              performUpload(file, cachedMasterKey);
          } else {
             addToast('error', "Encryption Key missing. Please login again.");
             handleLogout();
          }
      }
    };

    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('dragleave', handleWindowDragLeave);
    window.addEventListener('drop', handleWindowDrop);

    return () => {
        window.removeEventListener('dragover', handleWindowDragOver);
        window.removeEventListener('dragleave', handleWindowDragLeave);
        window.removeEventListener('drop', handleWindowDrop);
    };
  }, [cachedMasterKey, addToast]);

  // --- ACTIONS ---
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleDelete = (fileId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const isTrash = activeTab === 'trash';
      const title = isTrash ? "Delete Permanently?" : "Move to Trash?";
      const message = isTrash 
          ? "This action cannot be undone. The file will be lost forever."
          : "The file will be moved to trash and deleted automatically after 30 days.";
      
      setConfirmState({
          isOpen: true, title, message, isDestructive: true,
          onConfirm: async () => {
              setConfirmState(prev => ({ ...prev, isLoading: true }));
              setIsDeleting(fileId);
              try {
                  const url = `/api/files/delete?id=${fileId}${isTrash ? '&permanent=true' : ''}`;
                  const res = await fetch(url, { method: 'DELETE' });
                  
                  if (res.ok) {
                      setFiles(current => current.filter(f => f.id !== fileId));
                      if (isTrash) {
                          fetch('/api/files/list').then(r => r.json()).then(data => {
                              const total = data.files.reduce((acc: number, f: any) => acc + f.size, 0);
                              setStorageUsage(total);
                          });
                      }
                      addToast('success', isTrash ? "File permanently deleted." : "File moved to trash.");
                      closeConfirm();
                  } else {
                      addToast('error', "Failed to delete file.");
                      setConfirmState(prev => ({ ...prev, isLoading: false }));
                  }
              } catch (err) {
                  console.error(err);
                  addToast('error', "Error deleting file.");
                  setConfirmState(prev => ({ ...prev, isLoading: false }));
              } finally {
                  setIsDeleting(null);
                  if(!isTrash) closeConfirm();
              }
          }
      });
  };

  const handleRestore = async (fileId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setIsDeleting(fileId);
      try {
          const res = await fetch(`/api/files/delete?id=${fileId}&restore=true`, { method: 'DELETE' });
          if (res.ok) {
              setFiles(current => current.filter(f => f.id !== fileId));
              addToast('success', "File restored to My Files.");
          } else {
              addToast('error', "Failed to restore file.");
          }
      } catch (err) {
          console.error(err);
      } finally {
          setIsDeleting(null);
      }
  };

  const handleEmptyTrash = () => {
    if (files.length === 0) return;

    setConfirmState({
        isOpen: true,
        title: "Empty Trash?",
        message: "All files in the trash will be permanently deleted. This action cannot be undone.",
        isDestructive: true,
        confirmText: "Empty Trash",
        onConfirm: async () => {
            setConfirmState(prev => ({ ...prev, isLoading: true }));
            try {
                const res = await fetch('/api/files/delete?emptyTrash=true', { method: 'DELETE' });
                if (res.ok) {
                    setFiles([]); 
                    addToast('success', "Trash emptied successfully.");
                    closeConfirm();
                } else {
                    const data = await res.json();
                    addToast('error', data.message || "Failed to empty trash.");
                    setConfirmState(prev => ({ ...prev, isLoading: false }));
                }
            } catch (error) {
                console.error(error);
                addToast('error', "An error occurred.");
                setConfirmState(prev => ({ ...prev, isLoading: false }));
            }
        }
    });
  };

  // --- SHARE MODAL ---
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentFileId, setCurrentFileId] = useState<string | null>(null);
  const [shareConfig, setShareConfig] = useState<{ maxDownloads: string, expiresIn: string, customDate: string }>({ maxDownloads: '', expiresIn: '', customDate: '' });

  const handleShare = async (fileId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setShareLink('');
      setShareModalOpen(true);
      setCopied(false);
      setShareConfig({ maxDownloads: '', expiresIn: '', customDate: '' });
      setCurrentFileId(fileId); 

      if (!cachedMasterKey) {
          addToast('error', "Encryption Key missing. Please login again.");
          setShareModalOpen(false);
          return;
      }
  };

  const generateShareLink = async () => {
      if (!currentFileId || !cachedMasterKey) return;
      
      setIsGeneratingLink(true);
      try {
          const fileToShare = files.find(f => f.id === currentFileId);
          if (!fileToShare) throw new Error("File not found");

          const ivToUse = fileToShare.keyIv || fileToShare.iv; 
          const fileKey = await unwrapFileKey(fileToShare.encryptedKey, ivToUse, cachedMasterKey);
          
          const rawKeyBuffer = await crypto.subtle.exportKey("raw", fileKey);
          const rawKeyHex = buf2hex(rawKeyBuffer);

          const finalExpiresIn = shareConfig.expiresIn === 'custom' ? shareConfig.customDate : shareConfig.expiresIn;

          const res = await fetch('/api/files/share', { 
              method: 'POST',
              body: JSON.stringify({ 
                  fileId: currentFileId,
                  maxDownloads: shareConfig.maxDownloads,
                  expiresIn: finalExpiresIn
              }),
              headers: { 'Content-Type': 'application/json' }
          });
          
          if (!res.ok) throw new Error("Failed to generate share link");
          
          const { token } = await res.json();
          const url = `${window.location.origin}/share/${token}#${rawKeyHex}`;
          setShareLink(url);

      } catch (err) {
          console.error(err);
          addToast('error', "Failed to generate secure link.");
      } finally {
          setIsGeneratingLink(false);
      }
  };

  const handleDeleteLink = (linkId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setConfirmState({
          isOpen: true, 
          title: "Revoke Link?", 
          message: "The recipient will no longer be able to access the file. This cannot be undone.",
          isDestructive: true,
          confirmText: "Revoke",
          onConfirm: async () => {
              setConfirmState(prev => ({ ...prev, isLoading: true }));
              try {
                  const res = await fetch(`/api/files/share?id=${linkId}`, { method: 'DELETE' });
                  if(res.ok) {
                      setSharedLinks(prev => prev.filter(link => link._id !== linkId));
                      addToast('success', "Link revoked successfully.");
                      closeConfirm();
                  } else {
                      addToast('error', "Failed to revoke link.");
                      setConfirmState(prev => ({ ...prev, isLoading: false }));
                  }
              } catch(err) {
                  console.error(err);
                  addToast('error', "Error revoking link.");
                  setConfirmState(prev => ({ ...prev, isLoading: false }));
              }
          }
      });
  };

  const copyToClipboard = () => {
      navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredSharedLinks = sharedLinks.filter(l => (l.file?.name || '').toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-900 font-sans overflow-hidden">
      
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <ConfirmModal 
        isOpen={confirmState.isOpen}
        onClose={closeConfirm}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        isDestructive={confirmState.isDestructive}
        isLoading={confirmState.isLoading}
      />

      {/* UPLOAD TOAST */}
      <UploadProgressToast isUploading={isUploading} uploadProgress={uploadProgress} />

      {/* GLOBAL DRAG OVERLAY */}
      <UploadDragOverlay isDragOver={isDragOver} />

      {/* SHARE MODAL */}
      <AnimatePresence>
          {shareModalOpen && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                onClick={() => setShareModalOpen(false)}
              >
                  <motion.div 
                    initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                    className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl"
                    onClick={e => e.stopPropagation()}
                  >
                      <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xl font-bold flex items-center gap-2">
                              <Share2 className="text-blue-600" /> Secure Sharing
                          </h3>
                          <button onClick={() => setShareModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                              <X size={24} />
                          </button>
                      </div>
                      
                      <p className="text-slate-500 mb-6 text-sm">
                          This link contains a <strong>secret decryption key</strong>. Anyone with this link can download and view this file. The server <strong>cannot</strong> read the file.
                      </p>

                      {/* LIMITS CONFIGURATION */}
                      {!shareLink && !isGeneratingLink && (
                          <div className="mb-6 space-y-4">
                              <Input
                                  label="Max Downloads (Optional)"
                                  type="number"
                                  placeholder="Unlimited"
                                  value={shareConfig.maxDownloads}
                                  onChange={(e) => setShareConfig({...shareConfig, maxDownloads: e.target.value})}
                              />

                              <div>
                                  <label className="block text-sm font-bold text-slate-700 mb-2">Expires In</label>
                                  <select 
                                      value={shareConfig.expiresIn}
                                      onChange={(e) => setShareConfig({...shareConfig, expiresIn: e.target.value})}
                                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all font-medium text-slate-700"
                                  >
                                      <option value="">Never</option>
                                      <option value="1h">1 Hour</option>
                                      <option value="1d">1 Day</option>
                                      <option value="7d">7 Days</option>
                                      <option value="custom">Custom Date</option>
                                  </select>
                                  
                                  {shareConfig.expiresIn === 'custom' && (
                                      <div className="mt-2">
                                          <Input 
                                              type="datetime-local" 
                                              value={shareConfig.customDate}
                                              onChange={(e) => setShareConfig({...shareConfig, customDate: e.target.value})}
                                              min={new Date().toISOString().slice(0, 16)}
                                          />
                                      </div>
                                  )}
                              </div>

                              <Button 
                                  onClick={generateShareLink}
                                  className="w-full"
                              >
                                  Generate Secure Link
                              </Button>
                          </div>
                      )}

                      {/* LOADING STATE */}
                      {isGeneratingLink && (
                          <div className="flex flex-col items-center justify-center py-8">
                              <Loader2 className="animate-spin text-blue-600 mb-2" size={32} />
                              <p className="text-sm text-slate-500">Generating Secure Link...</p>
                          </div>
                      )}

                      {/* RESULT LINK */}
                      {shareLink && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-2">
                              <div className="flex-1 font-mono text-xs text-slate-600 truncate bg-white border border-slate-200 p-2 rounded">
                                  {shareLink}
                              </div>
                              <button 
                                onClick={copyToClipboard}
                                className={`p-2 rounded-lg transition-all ${copied ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}
                              >
                                  {copied ? <CheckCircle size={20} /> : <Copy size={20} />}
                              </button>
                          </div>
                      )}
                  </motion.div>
              </motion.div>
          )}
      </AnimatePresence>
      
        {/* SHARED INFO MODAL */}
      <AnimatePresence>
        {isLearnMoreOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setIsLearnMoreOpen(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
             />
             <motion.div 
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 z-10"
             >
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
                        <Share2 size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Secure Encrypted Sharing</h2>
                        <p className="text-sm text-slate-500">How it works</p>
                    </div>
                    <button onClick={() => setIsLearnMoreOpen(false)} className="ml-auto p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="space-y-4 text-slate-600 text-sm leading-relaxed mb-8">
                    <p>
                        Normally, cloud storage providers can see your files. We do things differently.
                    </p>
                    <ul className="space-y-3">
                        <li className="flex gap-3">
                            <ShieldCheck size={18} className="text-green-500 shrink-0 mt-0.5" />
                            <span><strong>Zero Knowledge:</strong> Files are encrypted on your device <em>before</em> they are uploaded. We never see the data.</span>
                        </li>
                        <li className="flex gap-3">
                            <Lock size={18} className="text-green-500 shrink-0 mt-0.5" />
                            <span><strong>Key Exchange:</strong> When you share a file, we use Public Key Cryptography (RSA) to securely exchange the encryption key with the recipient only.</span>
                        </li>
                    </ul>
                </div>

                <Button onClick={() => setIsLearnMoreOpen(false)} variant="secondary" className="w-full">
                    Got it
                </Button>
             </motion.div>
          </div>
        )}
      </AnimatePresence>



      <aside className="hidden md:flex w-64 flex-col justify-between bg-white border-r border-slate-200 z-10 relative">
        <div className="flex-1 flex flex-col min-h-0">
          {/* Logo Area */}
          <div className="h-16 flex items-center px-6 border-b border-slate-100">
             <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-600/20">
                <ShieldCheck size={24} strokeWidth={2.5} />
                </div>
                <div>
                <h1 className="font-bold text-lg tracking-tight">Vault<span className="text-blue-600">App</span></h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Zero Knowledge</p>
                </div>
             </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            <NavItem icon={<LayoutGrid size={20} />} label="My Files" active={activeTab === 'files'} onClick={() => setActiveTab('files')} />
            <NavItem icon={<Share2 size={20} />} label="Shared" active={activeTab === 'shared'} onClick={() => setActiveTab('shared')} />
            <NavItem icon={<Trash2 size={20} />} label="Trash" active={activeTab === 'trash'} onClick={() => setActiveTab('trash')} variant="danger" />
            
            <div className="pt-6 pb-2 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Account</div>
            <NavItem icon={<UserIcon size={20} />} label="Profile" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
            <NavItem icon={<Lock size={20} />} label="Security" active={activeTab === 'security'} onClick={() => setActiveTab('security')} />
          </nav>
        </div>

        {/* Storage Widget */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
            <UsageWidget storageUsage={storageUsage} storageLimit={STORAGE_LIMIT} />
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* Top Header */}
        <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-4 md:px-6 z-10 sticky top-0">
          
          {/* Mobile Menu Button */}
          <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg mr-2">
            <Menu size={24} />
          </button>

          {/* Search Bar */}
          <div className="flex-1 max-w-md">
            <Input 
              placeholder="Search..." 
              icon={<Search size={18} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="py-2.5"
            />
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            {/* LOGOUT BUTTON */}
            <Button 
                onClick={handleLogout}
                variant="ghost"
                leftIcon={<LogOut size={18} />}
                className="text-slate-600 hover:text-red-600"
            >
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 scrollbar-hide">
          <div className="max-w-6xl mx-auto space-y-8">
            
            {/* FILES TAB */}
            {activeTab === 'files' && (
              <>
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">My Files</h2>
                    <p className="text-slate-500">Securely stored in the cloud • Encrypted Client-side</p>
                  </div>
                  <Button 
                    onClick={() => fileInputRef.current?.click()}
                    leftIcon={<Plus size={20} />}
                  >
                    Upload File
                  </Button>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    className="hidden" 
                    onChange={handleFileSelect}
                  />
                </div>
              </>
            )}

            {(activeTab === 'files' || activeTab === 'trash') && (
                <>
                    {/* ACTION BAR */}
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-slate-700 text-lg">
                            {activeTab === 'trash' ? 'Deleted Files' : 'Recent Uploads'}
                        </h3>

                        {activeTab === 'trash' && files.length > 0 && (
                            <Button 
                                onClick={handleEmptyTrash}
                                variant="danger"
                                size="sm"
                                leftIcon={<Trash2 size={18} />}
                            >
                                Empty Trash
                            </Button>
                        )}
                    </div>

                    {/* FILE LIST */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="grid grid-cols-12 gap-4 p-4 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                            <div className="col-span-8 md:col-span-6 pl-2">Name</div>
                            <div className="hidden md:block col-span-2">Size</div>
                            <div className="hidden md:block col-span-3">Date Uploaded</div>
                            <div className="col-span-4 md:col-span-1 text-right pr-2">Actions</div>
                        </div>

                        <div className="divide-y divide-slate-50">
                            {isLoadingFiles ? (
                                <>
                                    <SkeletonRow />
                                    <SkeletonRow />
                                    <SkeletonRow />
                                </>
                            ) : filteredFiles.length > 0 ? (
                                filteredFiles.map(file => (
                                    <FileRow 
                                        key={file._id} 
                                        file={file} 
                                        isDeleting={isDeleting === file._id}
                                        isTrash={activeTab === 'trash'}
                                        onDelete={handleDelete}
                                        onRestore={handleRestore}
                                        onShare={handleShare}
                                    />
                                ))
                            ) : (
                                <EmptyState isTrash={activeTab === 'trash'} />
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* SHARED TAB */}
            {activeTab === 'shared' && (
                <>
                    <div className="mb-8">
                        <h3 className="font-bold text-slate-700 text-lg mb-4">Active Shared Links</h3>
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="grid grid-cols-12 gap-4 p-4 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                                <div className="col-span-7 md:col-span-5 pl-2">File Name</div>
                                <div className="hidden md:block col-span-2 text-center">Views</div>
                                <div className="hidden md:block col-span-2 text-center">Downloads</div>
                                <div className="hidden md:block col-span-2 text-center">Expires At</div>
                                <div className="col-span-5 md:col-span-1 text-right pr-2">Action</div>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {isLoadingShared ? (
                                    <div className="p-8 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2"/> Loading links...</div>
                                ) : filteredSharedLinks.length > 0 ? (
                                    filteredSharedLinks.map(link => (
                                        <div key={link._id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50 transition-colors group">
                                            <div className="col-span-7 md:col-span-5 flex items-center gap-3 font-medium text-slate-700 truncate">
                                                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Share2 size={16} /></div>
                                                <span className="truncate">{link.file?.name || 'Unknown File'}</span>
                                            </div>
                                            <div className="hidden md:block col-span-2 text-center text-slate-500 text-sm font-mono">{link.views}</div>
                                            <div className="hidden md:block col-span-2 text-center text-slate-500 text-sm font-mono">
                                                {link.downloads} / {link.maxDownloads || '∞'}
                                            </div>
                                            <div className="hidden md:block col-span-2 text-center text-xs font-bold text-slate-500 bg-slate-100 py-1 px-2 rounded-lg inline-block w-fit mx-auto">
                                                {link.expiresAt ? new Date(link.expiresAt).toLocaleString() : 'Never'}
                                            </div>
                                            <div className="col-span-5 md:col-span-1 text-right">
                                                <button 
                                                    onClick={(e) => handleDeleteLink(link._id, e)}
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-20 text-center text-slate-400">
                                        <Share2 size={48} className="mx-auto mb-4 opacity-20" />
                                        <p>No active shared links found.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
                <div className="max-w-2xl mx-auto">
                    <Card noPadding>
                        <CardHeader className="bg-slate-50 px-8 py-6 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-lg text-slate-800">Personal Information</h3>
                                <p className="text-sm text-slate-500">Manage your account details</p>
                            </div>
                            {!isEditingProfile && (
                                <button onClick={() => setIsEditingProfile(true)} className="text-blue-600 font-bold text-sm hover:underline">
                                    Edit Profile
                                </button>
                            )}
                        </CardHeader>
                        
                        <div className="p-8">
                            <form onSubmit={handleProfileUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="col-span-2 flex items-center gap-6 mb-4">
                                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 text-2xl font-bold border-4 border-white shadow-lg">
                                        {profileForm.name ? profileForm.name.charAt(0) : <UserIcon size={32} />}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg text-slate-800">{profileForm.name || 'User'}</h4>
                                        <p className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded inline-block mt-1">Verified Account</p>
                                    </div>
                                </div>

                                <div className="col-span-2 md:col-span-1">
                                    <Input 
                                        label="Full Name"
                                        disabled={!isEditingProfile}
                                        placeholder="Enter your name"
                                        value={profileForm.name}
                                        onChange={e => setProfileForm({...profileForm, name: e.target.value})}
                                    />
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <Input 
                                        label="Email Address"
                                        disabled={true}
                                        value={profileForm.email}
                                        readOnly
                                    />
                                </div>

                                <div className="col-span-2 md:col-span-1">
                                    <Input 
                                        label="My Country"
                                        disabled={true}
                                        value={(() => {
                                            const code = (profileForm.country || '').toLowerCase().trim();
                                            const countries: Record<string, string> = {
                                                'us': 'United States', 'usa': 'United States',
                                                'uk': 'United Kingdom', 'gb': 'United Kingdom', 'gbr': 'United Kingdom',
                                                'in': 'India', 'ca': 'Canada', 'au': 'Australia', 'de': 'Germany', 
                                                'fr': 'France', 'it': 'Italy', 'es': 'Spain', 'jp': 'Japan', 
                                                'cn': 'China', 'br': 'Brazil', 'mx': 'Mexico', 'ru': 'Russia', 
                                                'za': 'South Africa', 'ng': 'Nigeria', 'ar': 'Argentina', 
                                                'sa': 'Saudi Arabia', 'ae': 'United Arab Emirates',
                                                'kr': 'South Korea', 'ot': 'Other'
                                            };
                                            return countries[code] || profileForm.country;
                                        })()}
                                        readOnly
                                    />
                                </div>

                                <div>
                                    <Input 
                                        label="Date of Birth"
                                        type="date"
                                        disabled={!isEditingProfile} 
                                        value={profileForm.dob}
                                        onChange={e => setProfileForm({...profileForm, dob: e.target.value})}
                                    />
                                </div>

                                <AnimatePresence>
                                    {isEditingProfile && (
                                        <motion.div 
                                            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                            className="col-span-2 flex gap-3 pt-4 border-t border-slate-100 mt-2"
                                        >
                                            <Button 
                                                type="submit" 
                                                isLoading={isUpdatingProfile}
                                                leftIcon={!isUpdatingProfile && <Save size={18} />}
                                                className="flex-1"
                                                variant="secondary"
                                            >
                                                Save Changes
                                            </Button>
                                            <Button 
                                                type="button" 
                                                onClick={handleCancelEdit}
                                                variant="outline"
                                                className="flex-1"
                                            >
                                                Cancel
                                            </Button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </form>
                        </div>
                    </Card>
                </div>
            )}

            {/* SECURITY TAB */}
            {activeTab === 'security' && (
                <SecuritySettings 
                    files={files} 
                    cachedMasterKey={cachedMasterKey} 
                    setCachedMasterKey={setCachedMasterKey}
                    addToast={addToast}
                />
            )}

          </div>
        </div>
      </main>

      <AnimatePresence>
        {isSidebarOpen && (
          <>
            {/* Overlay */}
            <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }}
               className="fixed inset-0 z-[50] bg-black/60 backdrop-blur-sm md:hidden"
               onClick={() => setIsSidebarOpen(false)}
            />
            
            {/* Drawer */}
            <motion.div 
               initial={{ x: "-100%" }} 
               animate={{ x: 0 }} 
               exit={{ x: "-100%" }}
               transition={{ type: "spring", damping: 25, stiffness: 200 }}
               className="fixed inset-y-0 left-0 w-72 bg-white flex flex-col z-[51] md:hidden shadow-2xl"
            >
              <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                      <div className="bg-blue-600 p-2 rounded-xl text-white">
                          <ShieldCheck size={20} strokeWidth={2.5} />
                      </div>
                      <span className="font-bold text-lg">SecureStore</span>
                  </div>
                  <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full">
                      <X size={24} />
                  </button>
              </div>

              <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                  <NavItem icon={<LayoutGrid size={20} />} label="My Files" active={activeTab === 'files'} onClick={() => { setActiveTab('files'); setIsSidebarOpen(false); }} />
                  <NavItem icon={<Share2 size={20} />} label="Shared" active={activeTab === 'shared'} onClick={() => { setActiveTab('shared'); setIsSidebarOpen(false); }} />
                  <NavItem icon={<Trash2 size={20} />} label="Trash" active={activeTab === 'trash'} onClick={() => { setActiveTab('trash'); setIsSidebarOpen(false); }} variant="danger" />
                  
                  <div className="pt-6 pb-2 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Account</div>
                  <NavItem icon={<UserIcon size={20} />} label="Profile" active={activeTab === 'profile'} onClick={() => { setActiveTab('profile'); setIsSidebarOpen(false); }} />
                  <NavItem icon={<Lock size={20} />} label="Security" active={activeTab === 'security'} onClick={() => { setActiveTab('security'); setIsSidebarOpen(false); }} />
              </nav>

              <div className="p-4 border-t border-slate-100 bg-slate-50">
                  <UsageWidget storageUsage={storageUsage} storageLimit={STORAGE_LIMIT} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
