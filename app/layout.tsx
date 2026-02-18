import { Manrope } from "next/font/google"; // 1. Import the font
import "./globals.css";
import { Metadata } from "next";

// 2. Configure the font
const primaryFont = Manrope({ 
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SafeCloud - Zero Knowledge Cloud Storage",
  description: "Secure, client-side encrypted file storage.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      {/* 3. Apply the font class directly to the body */}
      <body className={`${primaryFont.className} bg-white text-slate-900 antialiased`}>
        {children}
      </body>
    </html>
  );
}