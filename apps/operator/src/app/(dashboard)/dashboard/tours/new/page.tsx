'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';

export default function NewTourPage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    maxGuests: 16,
  });

  // Get the authenticated user on mount
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
      } else {
        // Not logged in, redirect to login
        router.push('/login');
      }
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setIsCreating(true);

    try {
      const res = await fetch('/api/tours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          maxGuests: formData.maxGuests,
          operatorId: userId,  // Now using the real user ID
        }),
      });

      if (!res.ok) throw new Error('Failed to create tour');

      const { tour } = await res.json();
      router.push(`/dashboard/tours/${tour.id}/live`);
    } catch (error) {
      console.error('Error creating tour:', error);
      setIsCreating(false);
    }
  };

  const tourTemplates = [
    { name: 'Maggie Comprehensive', duration: '5 hours' },
    { name: 'Behind the Scenes', duration: '5 hours' },
    { name: 'Maggie Highlights', duration: '3 hours' },
    { name: 'Cruise Ship Special', duration: '4 hours' },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/tours"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Tours
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">Create New Tour</h1>
        <p className="text-gray-600 mt-1">Set up a new tour session for your guests</p>
      </div>

      {/* Quick Templates */}
      <div className="card mb-6">
        <h2 className="text-sm font-medium text-gray-700 mb-3">Quick Start</h2>
        <div className="grid grid-cols-2 gap-3">
          {tourTemplates.map((template) => (
            <button
              key={template.name}
              onClick={() => setFormData({ ...formData, name: template.name })}
              className={`p-3 text-left border rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors ${
                formData.name === template.name
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200'
              }`}
            >
              <p className="font-medium text-gray-900">{template.name}</p>
              <p className="text-sm text-gray-500">{template.duration}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="card space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Tour Name
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Morning Harbour Tour"
            className="input"
            required
          />
        </div>

        <div>
          <label htmlFor="maxGuests" className="block text-sm font-medium text-gray-700 mb-1">
            Maximum Guests
          </label>
          <select
            id="maxGuests"
            value={formData.maxGuests}
            onChange={(e) =>
              setFormData({ ...formData, maxGuests: parseInt(e.target.value) })
            }
            className="input"
          >
            <option value={8}>8 guests (Mercedes Sprinter)</option>
            <option value={16}>16 guests (Iveco Shuttle)</option>
          </select>
        </div>

        <div className="flex space-x-3 pt-4">
          <Link href="/dashboard/tours" className="btn btn-secondary flex-1">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={!formData.name || isCreating}
            className="btn btn-primary flex-1"
          >
            {isCreating ? 'Creating...' : 'Create Tour'}
          </button>
        </div>
      </form>
    </div>
  );
}
