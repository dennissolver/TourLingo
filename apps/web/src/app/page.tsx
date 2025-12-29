'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Globe, Headphones, MessageCircle } from 'lucide-react';

export default function HomePage() {
  const [tourCode, setTourCode] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleJoin = (e: React.FormEvent) => {
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
    
    router.push(`/join/${code}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-primary-600 text-white py-6 px-4">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold">TourLingo</h1>
          <p className="text-primary-100 mt-1">Hear your guide in your language</p>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Join Form */}
          <div className="card mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Join a Tour</h2>
            
            <form onSubmit={handleJoin}>
              <div className="mb-4">
                <label htmlFor="tourCode" className="block text-sm font-medium text-gray-700 mb-1">
                  Enter tour code
                </label>
                <input
                  type="text"
                  id="tourCode"
                  value={tourCode}
                  onChange={(e) => {
                    setTourCode(e.target.value.toUpperCase());
                    setError('');
                  }}
                  placeholder="ABC123"
                  maxLength={6}
                  className="input text-center text-2xl tracking-widest uppercase"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="characters"
                />
                {error && (
                  <p className="mt-1 text-sm text-red-600">{error}</p>
                )}
              </div>
              
              <button type="submit" className="btn btn-primary btn-large w-full">
                Join Tour
              </button>
            </form>
            
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-500">
                Or scan the QR code from your tour guide
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-4">
            <Feature
              icon={<Globe className="w-6 h-6" />}
              title="Multiple Languages"
              description="Hear your guide in your preferred language"
            />
            <Feature
              icon={<Headphones className="w-6 h-6" />}
              title="Use Your Own Earphones"
              description="Connect any earphones or earbuds"
            />
            <Feature
              icon={<MessageCircle className="w-6 h-6" />}
              title="Ask Questions"
              description="Speak and everyone hears you translated"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 px-6 text-center text-sm text-gray-500">
        <p>No download required. Works in your browser.</p>
      </footer>
    </div>
  );
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start space-x-3">
      <div className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center text-primary-600">
        {icon}
      </div>
      <div>
        <h3 className="font-medium text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </div>
  );
}
