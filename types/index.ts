export interface FileItem {
    id: string; // For UI mapping if needed, but usually _id is used
    _id: string;
    name: string;
    size: string;
    type: string;
    date: string;
    encryptedKey: string;
    iv: string;
    keyIv?: string;
}

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'success';
    date: string;
    read: boolean;
}
