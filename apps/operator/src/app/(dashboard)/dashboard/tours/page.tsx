'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Play, Square, Trash2, QrCode } from 'lucide-react';

interface Tour {
  id: string;
  name: string;
  accessCode: string;
  status: 'created' | 'waiting' | 'live' | 'ended';
  guestCount: number;
  createdAt: string;
}

export default function ToursPage() {
  // Mock data - replace with Supabase query
  const [tours, setTours] = useState<Tour[]>([
    {
      id: '1',
      name: 'Maggie Comprehensive',
      accessCode: 'ABC123',
      status: 'created',
      guestCount: 0,
      createdAt: '2024-12-30T09:00:00',
    },
    {
      id: '2',
      name: 'Behind the Scenes',
      accessCode: 'XYZ789',
      status: 'live',
      guestCount: 8,
      createdAt: '2024-12-30T08:30:00',
    },
  ]);

  const getStatusBadge = (status: Tour['status']) => {
    const styles = {
      created: 'bg-gray-100 text-gray-700',
      waiting: 'bg-yellow-100 text-yellow-700',
      live: 'bg-green-100 text-green-700',
      ended: 'bg-gray-100 text-gray-500',
    };
    const labels = {
      created: 'Ready',
      waiting: 'Waiting',
      live: 'Live',
      ended: 'Ended',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Tours</h1>
          <p className="text-gray-600 mt-1">Create and manage your tour sessions</p>
        </div>
        <Link href="/dashboard/tours/new" className="btn btn-primary">
          <Plus className="w-5 h-5 mr-2" />
          New Tour
        </Link>
      </div>

      {/* Tours List */}
      <div className="card overflow-hidden p-0">
        {tours.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No tours yet</p>
            <Link href="/dashboard/tours/new" className="btn btn-primary">
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
                    <span>Code: {tour.accessCode}</span>
                    {tour.guestCount > 0 && (
                      <span>{tour.guestCount} guests</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {tour.status === 'created' && (
                    <Link
                      href={`/dashboard/tours/${tour.id}/live`}
                      className="btn btn-primary"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Start
                    </Link>
                  )}
                  {tour.status === 'live' && (
                    <>
                      <Link
                        href={`/dashboard/tours/${tour.id}/live`}
                        className="btn btn-primary"
                      >
                        Open
                      </Link>
                      <button className="btn btn-danger">
                        <Square className="w-4 h-4 mr-2" />
                        End
                      </button>
                    </>
                  )}
                  {tour.status === 'created' && (
                    <>
                      <button className="btn btn-secondary">
                        <QrCode className="w-4 h-4" />
                      </button>
                      <button className="btn btn-secondary text-red-600 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
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
