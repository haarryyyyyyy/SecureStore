# SafeCloud - Zero Knowledge Cloud Storage

SafeCloud is a secure, client-side encrypted file storage application built with Next.js 14. It ensures that only you have access to your files by encrypting them before they ever leave your device.

## Features

-   **Zero-Knowledge Encryption**: Files are encrypted on your device using AES-GCM (256-bit) before upload. The server never sees your raw data or your password.
-   **Secure Authentication**: PBKDF2-based password hashing and key derivation.
-   **File Management**: Upload, download, rename, and delete files.
-   **Drag & Drop**: Intuitive drag-and-drop interface for uploads.
-   **Trash & Recovery**: Soft delete with restore functionality.
-   **Secure Sharing**: Share files via encrypted, time-limited links with password protection options.
-   **Responsive Design**: Fully responsive UI for Desktop and Mobile (Dashboard & Landing Page).
-   **Identity Verification**: Email OTP verification for new accounts.

## Tech Stack

-   **Framework**: Next.js 14 (App Router)
-   **Language**: TypeScript
-   **Styling**: Tailwind CSS
-   **Database**: MongoDB (via Mongoose)
-   **Animations**: Framer Motion
-   **Email**: Resend (Transactional API)
-   **Icons**: Lucide React


## License

MIT
