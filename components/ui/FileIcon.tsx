import React from 'react';
import { File, FileText, Folder, Video, Image as ImageIcon } from 'lucide-react';

export function FileIcon({ type, size = 24, className = "" }: { type: string, size?: number, className?: string }) {
  const iconProps = { size, strokeWidth: 1.5 };
  let icon = <File {...iconProps} className="text-slate-400" />;
  let bg = "bg-slate-100";
  if (type === 'pdf') { icon = <FileText {...iconProps} className="text-red-500" />; bg = "bg-red-50"; } 
  else if (type === 'zip') { icon = <Folder {...iconProps} className="text-yellow-600" />; bg = "bg-yellow-50"; } 
  else if (type === 'video') { icon = <Video {...iconProps} className="text-purple-500" />; bg = "bg-purple-50"; } 
  else if (type === 'image') { icon = <ImageIcon {...iconProps} className="text-blue-500" />; bg = "bg-blue-50"; }
  
  return <div className={`rounded-xl flex items-center justify-center ${bg} ${className}`} style={{ width: size * 1.6, height: size * 1.6 }}>{icon}</div>;
}
