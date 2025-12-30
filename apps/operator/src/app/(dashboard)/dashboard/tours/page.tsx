'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Play, Square, Trash2, QrCode, RefreshCw } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

interface Tour {
  id: string;
  name: string;
  access_code: string;
  status: 'created' | 'waiting' | 'live' | 'ended';
  max_guests: number;
  created_at: string;
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export default function ToursPage() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTours();
  }, []);

  const fetchTours = async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('tours')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTours(data || []);
    } catch (err: any) {
      console.error('Error fetching tours:', err);
      setError(err.message || 'Failed to load tours');
    } finally {
      setLoading(false);
    }
  };

  const deleteTour = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tour?')) return;

    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('tours')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setTours(tours.filter(t => t.id !== id));
    } catch (err: any) {
      console.error('Error deleting tour:', err);
      alert('Failed to delete tour');
    }
  };

  const updateTourStatus = async (id: string, status: string) => {
    try {
      const supabase = getSupabase();
      const updates: any = { status };

      if (status === 'live') {
        updates.started_at = new Date().toISOString();
      } else if (status === 'ended') {
        updates.ended_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('tours')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setTours(tours.map(t =>
        t.id === id ? { ...t, status: status as Tour['status'] } : t
      ));
    } catch (err: any) {
      console.error('Error updating tour:', err);
      alert('Failed to update tour');
    }
  };

  const getStatusBadge = (status: Tour['status']) => {
    const styles: Record<string, string> = {
      created: 'bg-gray-100 text-gray-700',
      waiting: 'bg-yellow-100 text-yellow-700',
      live: 'bg-green-100 text-green-700',
      ended: 'bg-gray-100 text-gray-500',
    };
    const labels: Record<string, string> = {
      created: 'Ready',
      waiting: 'Waiting',
      live: 'Live',
      ended: 'Ended',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.created}`}>
        {labels[status] || 'Ready'}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Tours</h1>
          <p className="text-gray-600 mt-1">Create and manage your tour sessions</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchTours}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <Link
            href="/dashboard/tours/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Tour
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchTours}
            className="mt-2 text-sm text-red-700 underline"
          >
            Try again
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {tours.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No tours yet</p>
            <Link
              href="/dashboard/tours/new"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create your first tour
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {tours.map((tour) => (
              <div
                key={tour.id}
                className="p-4 hover:bg-gray-50 flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3">
                    <h3 className="font-medium text-gray-900 truncate">
                      {tour.name}
                    </h3>
                    {getStatusBadge(tour.status)}
                  </div>
                  <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                    <span className="font-mono">Code: {tour.access_code}</span>
                    <span>Max: {tour.max_guests} guests</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {tour.status === 'created' && (
                    <>
                      <Link
                        href={`/dashboard/tours/${tour.id}/live`}
                        className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Start
                      </Link>
                      <button
                        onClick={() => deleteTour(tour.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete tour"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {tour.status === 'live' && (
                    <>
                      <Link
                        href={`/dashboard/tours/${tour.id}/live`}
                        className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
                      >
                        Open
                      </Link>
                      <button
                        onClick={() => updateTourStatus(tour.id, 'ended')}
                        className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
                      >
                        <Square className="w-4 h-4 mr-1" />
                        End
                      </button>
                    </>
                  )}
                  {tour.status === 'ended' && (
                    <span className="text-sm text-gray-400">Archived</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}