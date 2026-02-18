import React from 'react';
import { Trash2, Folder } from 'lucide-react';

interface EmptyStateProps {
    isTrash: boolean;
}

export function EmptyState({ isTrash }: EmptyStateProps) {
    return (
        <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="bg-slate-50 p-6 rounded-full mb-4">
                {isTrash ? <Trash2 size={48} className="text-slate-300" /> : <Folder size={48} className="text-slate-300" />}
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-1">
                {isTrash ? 'Trash is Empty' : 'No files found'}
            </h3>
            <p className="text-slate-400 max-w-xs mx-auto text-sm">
                {isTrash 
                    ? "Items moved to the trash will be deleted forever after 30 days." 
                    : "Upload your first file to get started with zero-knowledge encryption."}
            </p>
        </div>
    );
}
