import React from 'react';
import { UploadCloud } from 'lucide-react';

interface UsageWidgetProps {
    storageUsage: number;
    storageLimit: number;
}

export function UsageWidget({ storageUsage, storageLimit }: UsageWidgetProps) {
    return (
        <div className="p-4 m-4 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Storage</p>
              <p className="font-bold text-lg text-slate-800">
                {(storageUsage / 1024 / 1024).toFixed(1)} MB <span className="text-sm font-medium text-slate-400">/ 1 GB</span>
              </p>
            </div>
            <div className={`p-1.5 rounded-lg transition-colors ${storageUsage > storageLimit * 0.9 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-700'}`}>
                <UploadCloud size={16} />
            </div>
          </div>
          <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
            <div 
                className={`h-full rounded-full transition-all duration-1000 ease-out ${storageUsage > storageLimit * 0.9 ? 'bg-red-500' : 'bg-blue-600'}`} 
                style={{ width: `${Math.min((storageUsage / storageLimit) * 100, 100)}%` }} 
            />
          </div>
        </div>
    );
}
