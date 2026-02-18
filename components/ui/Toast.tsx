'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} removeToast={removeToast} />
        ))}
      </AnimatePresence>
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; removeToast: (id: string) => void }> = ({ toast, removeToast }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      removeToast(toast.id);
    }, 3000); 
    return () => clearTimeout(timer);
  }, [toast.id, removeToast]);

  const styles = {
    success: {
      icon: <CheckCircle size={20} className="text-white" />,
      bg: 'bg-emerald-500', // Solid bright color for icon container
      gradient: 'from-emerald-50 to-white', // Subtle gradient for body
      border: 'border-emerald-100',
      text: 'text-emerald-900',
      progress: 'bg-emerald-500'
    },
    error: {
      icon: <AlertCircle size={20} className="text-white" />,
      bg: 'bg-rose-500',
      gradient: 'from-rose-50 to-white',
      border: 'border-rose-100',
      text: 'text-rose-900',
      progress: 'bg-rose-500'
    },
    info: {
      icon: <Info size={20} className="text-white" />,
      bg: 'bg-blue-500',
      gradient: 'from-blue-50 to-white',
      border: 'border-blue-100',
      text: 'text-blue-900',
      progress: 'bg-blue-500'
    }
  };

  const style = styles[toast.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 100, scale: 0.9 }} // Slide in from right
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className={`
        pointer-events-auto relative flex items-center gap-4 p-4 pr-12 rounded-2xl shadow-xl 
        border ${style.border} bg-gradient-to-br ${style.gradient} backdrop-blur-xl
        min-w-[340px] max-w-md overflow-hidden group
      `}
    >
      {/* Icon Bubble */}
      <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${style.bg} animate-pulse-slow`}>
        {style.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className={`font-bold text-sm capitalize mb-0.5 ${style.text}`}>{toast.type}</h4>
        <p className="text-sm font-medium text-slate-600 leading-snug break-words">{toast.message}</p>
      </div>

      {/* Close Button */}
      <button 
        onClick={() => removeToast(toast.id)} 
        className="absolute top-4 right-4 text-slate-300 hover:text-slate-500 transition-colors bg-transparent hover:bg-slate-100/50 rounded-full p-1"
      >
        <X size={16} />
      </button>

      {/* Progress Bar (Thinner & placed at bottom edge) */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100/50">
          <motion.div 
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: 3, ease: "linear" }}
            className={`h-full ${style.progress} opacity-70`}
          />
      </div>
    </motion.div>
  );
};
