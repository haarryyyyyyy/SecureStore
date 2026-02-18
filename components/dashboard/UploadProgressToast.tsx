import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud } from 'lucide-react';

interface UploadProgressToastProps {
    isUploading: boolean;
    uploadProgress: number;
}

export function UploadProgressToast({ isUploading, uploadProgress }: UploadProgressToastProps) {
    return (
        <AnimatePresence>
            {isUploading && (
                <motion.div 
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.9 }}
                    className="fixed bottom-6 right-6 bg-white rounded-2xl shadow-2xl border border-slate-100 p-5 z-50 w-80"
                >
                    <div className="flex items-center gap-4 mb-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg animate-bounce">
                            <UploadCloud size={20} />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 text-sm">Uploading File...</h4>
                            <p className="text-xs text-slate-500">Encrypting & Syncing</p>
                        </div>
                        <span className="ml-auto font-mono font-bold text-blue-600 text-sm">{uploadProgress}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-blue-600 transition-all duration-300 ease-out" 
                            style={{ width: `${uploadProgress}%` }} 
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
