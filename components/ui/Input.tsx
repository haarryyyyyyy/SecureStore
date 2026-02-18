import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, rightElement, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-bold text-slate-700 mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`
              w-full bg-slate-50 border border-slate-200 rounded-xl 
              focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none 
              transition-all font-medium text-slate-700 placeholder:text-slate-400
              disabled:opacity-60 disabled:cursor-not-allowed
              ${icon ? 'pl-11' : 'pl-4'}
              ${rightElement ? 'pr-12' : 'pr-4'}
              py-3 ${error ? 'border-red-300 focus:ring-red-100' : ''}
              ${className}
            `}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              {rightElement}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1.5 text-xs font-bold text-red-500 flex items-center gap-1">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
