# SecureStore - Zero Knowledge Cloud Storage

SecureStore is a secure, client-side encrypted file storage application built with Next.js 14. It ensures that only you have access to your files by encrypting them before they ever leave your device.

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

## Getting Started

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/yourusername/securestore.git
    cd securestore
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Environment Setup**:
    Create a `.env.local` file with the following variables:
    ```env
    MONGODB_URI=mongodb://localhost:27017/securestore
    NEXT_PUBLIC_APP_URL=http://localhost:3000
    RESEND_API_KEY=re_123456789
    EMAIL_FROM=onboarding@resend.dev
    JWT_SECRET=your-super-secret-jwt-key
    ```

4.  **Run the development server**:
    ```bash
    npm run dev
    ```

5.  **Open the app**:
    Visit [http://localhost:3000](http://localhost:3000).

## Architecture Highlights

-   **Client-Side Standard**: All encryption/decryption happens in the browser `Web Crypto API`.
-   **Key Management**: The master key is derived from your password and salt, never stored in plain text.
-   **Sidebar**: Responsive sidebar implementation with `framer-motion` for smooth mobile interactions.

## License

MIT
