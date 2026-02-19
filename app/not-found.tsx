import Link from 'next/link';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-8">
        
        {/* Logo */}
        <div className="flex justify-center mb-8">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <BrandLogo size={64} />
            </div>
        </div>

        <div className="space-y-4">
            <h1 className="text-9xl font-bold text-slate-900 tracking-tighter">404</h1>
            <h2 className="text-2xl font-bold text-slate-800">Page Not Found</h2>
            <p className="text-slate-500 max-w-sm mx-auto">
                The page you are looking for doesn't exist or has been moved.
            </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <Link href="/dashboard">
                <Button leftIcon={<Home size={18} />}>
                    Go to Dashboard
                </Button>
            </Link>
            <Link href="/">
                <Button variant="outline" leftIcon={<ArrowLeft size={18} />}>
                    Back Home
                </Button>
            </Link>
        </div>

        <p className="text-xs text-slate-400 mt-12">
            &copy; {new Date().getFullYear()} SafeCloud Inc.
        </p>
      </div>
    </div>
  );
}
