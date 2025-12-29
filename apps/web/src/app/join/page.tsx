'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Globe, ArrowLeft, QrCode } from 'lucide-react';

export default function JoinPage() {
  const [tourCode, setTourCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = tourCode.trim().toUpperCase();
    
    if (!code) {
      setError('Please enter a tour code');
      return;
    }
    
    if (code.length !== 6) {
      setError('Tour code must be 6 characters');
      return;
    }

    setLoading(true);
    setError('');

    // Validate tour code exists
    try {
      const res = await fetch(`/api/tours?code=${code}`);
      if (!res.ok) {
        setError('Tour not found. Check your code and try again.');
        setLoading(false);
        return;
      }
      
      router.push(`/join/${code}`);
    } catch (err) {
      setError('Unable to connect. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center">
          <Link href="/" className="text-gray-500 hover:text-gray-700 mr-4">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center space-x-2">
            <Globe className="w-6 h-6 text-primary-600" />
            <span className="font-bold text-gray-900">TourLingo</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Join Form */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Globe className="w-8 h-8 text-primary-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Join a Tour</h1>
              <p className="text-gray-500 mt-2">
                Enter the 6-character code from your tour guide
              </p>
            </div>
            
            <form onSubmit={handleJoin}>
              <div className="mb-6">
                <input
                  type="text"
                  id="tourCode"
                  value={tourCode}
                  onChange={(e) => {
                    setTourCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                    setError('');
                  }}
                  placeholder="ABC123"
                  maxLength={6}
                  className="input text-center text-3xl tracking-[0.3em] uppercase font-mono py-4"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="characters"
                  disabled={loading}
                />
                {error && (
                  <p className="mt-2 text-sm text-red-600 text-center">{error}</p>
                )}
              </div>
              
              <button 
                type="submit" 
                className="btn btn-primary btn-large w-full"
                disabled={loading || tourCode.length !== 6}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Joining...
                  </span>
                ) : (
                  'Join Tour'
                )}
              </button>
            </form>
            
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="flex items-center justify-center text-gray-500 text-sm">
                <QrCode className="w-4 h-4 mr-2" />
                <span>Or scan the QR code from your guide</span>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              No account needed. Works in your browser.
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Make sure you have earphones connected 🎧
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 px-6 text-center">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to TourLingo
        </Link>
      </footer>
    </div>
  );
}
