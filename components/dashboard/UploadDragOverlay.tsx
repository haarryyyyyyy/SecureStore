import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud } from 'lucide-react';

export function UploadDragOverlay({ isDragOver }: { isDragOver: boolean }) {
    return (
        <AnimatePresence>
            {isDragOver && (
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-blue-600/90 flex flex-col items-center justify-center text-white backdrop-blur-sm"
                >
                    <div className="bg-white/10 p-8 rounded-full mb-8 animate-bounce">
                        <UploadCloud size={64} />
                    </div>
                    <h2 className="text-4xl font-bold mb-4">Drop files to upload</h2>
                    <p className="text-blue-100 text-lg">Your files will be encrypted automatically.</p>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
