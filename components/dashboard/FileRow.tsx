import React from 'react';
import { Share2, RefreshCw, Loader2, Trash2 } from 'lucide-react';
import { FileIcon } from '@/components/ui/FileIcon';
import { FileItem } from '@/types';

interface FileRowProps {
    file: FileItem;
    isDeleting: boolean;
    isTrash: boolean;
    onDelete: (id: string, e: React.MouseEvent) => void;
    onRestore: (id: string, e: React.MouseEvent) => void;
    onShare: (id: string, e: React.MouseEvent) => void;
}

export function FileRow({ file, isDeleting, isTrash, onDelete, onRestore, onShare }: FileRowProps) {
    return (
        <div className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50 transition-colors group">
            <div className="col-span-8 md:col-span-6 flex items-center gap-3 font-medium text-slate-700 truncate">
                <FileIcon type={file.type} />
                <span className="truncate">{file.name}</span>
            </div>
            <div className="hidden md:block col-span-2 text-slate-500 text-sm font-mono">{file.size}</div>
            <div className="hidden md:block col-span-3 text-slate-500 text-sm font-mono">{file.date}</div>
            <div className="col-span-4 md:col-span-1 text-right flex justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                {!isTrash && (
                    <button onClick={(e) => onShare(file._id, e)} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Share">
                        <Share2 size={16} />
                    </button>
                )}
                {isTrash && (
                     <button onClick={(e) => onRestore(file._id, e)} className="p-2 text-slate-400 hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors" title="Restore">
                        <RefreshCw size={16} />
                    </button>
                )}
                <button 
                    onClick={(e) => onDelete(file._id, e)}
                    disabled={isDeleting}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title={isTrash ? "Delete Permanently" : "Move to Trash"}
                >
                    {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                </button>
            </div>
        </div>
    );
}
