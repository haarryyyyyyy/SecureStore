import React from 'react';

export function NavItem({ icon, label, active, onClick, variant = 'default' }: any) {
  const activeClass = variant === 'danger' 
    ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
    : 'bg-blue-600 text-white shadow-lg shadow-blue-600/30';

  return (
    <button 
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200
        ${active 
          ? activeClass
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
        }
      `}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
