'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Download, Play, Clock, Users, Globe } from 'lucide-react';
import { format } from 'date-fns';

interface Archive {
  id: string;
  tourName: string;
  date: string;
  durationMinutes: number;
  guestCount: number;
  languages: string[];
  questionCount: number;
}

export default function ArchivesPage() {
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data - replace with Supabase query
  const archives: Archive[] = [
    {
      id: '1',
      tourName: 'Maggie Comprehensive',
      date: '2024-12-30T09:00:00',
      durationMinutes: 285,
      guestCount: 12,
      languages: ['de', 'ja', 'zh', 'ko'],
      questionCount: 8,
    },
    {
      id: '2',
      tourName: 'Behind the Scenes',
      date: '2024-12-29T14:00:00',
      durationMinutes: 180,
      guestCount: 8,
      languages: ['de', 'fr'],
      questionCount: 5,
    },
    {
      id: '3',
      tourName: 'Maggie Highlights',
      date: '2024-12-28T10:00:00',
      durationMinutes: 150,
      guestCount: 15,
      languages: ['ja', 'ko', 'zh'],
      questionCount: 12,
    },
  ];

  const filteredArchives = archives.filter((a) =>
    a.tourName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Tour Archives</h1>
          <p className="text-gray-600 mt-1">Review past tours and transcripts</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tours..."
            className="input pl-10 w-full sm:w-64"
          />
        </div>
      </div>

      {/* Archives List */}
      <div className="space-y-4">
        {filteredArchives.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-500">No archives found</p>
          </div>
        ) : (
          filteredArchives.map((archive) => (
            <div key={archive.id} className="card hover:shadow-md transition-shadow">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex-1">
                  <Link
                    href={`/dashboard/archives/${archive.id}`}
                    className="text-lg font-medium text-gray-900 hover:text-primary-600"
                  >
                    {archive.tourName}
                  </Link>
                  <p className="text-gray-500 mt-1">
                    {format(new Date(archive.date), 'EEEE, MMMM d, yyyy • h:mm a')}
                  </p>

                  {/* Stats */}
                  <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{formatDuration(archive.durationMinutes)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>{archive.guestCount} guests</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Globe className="w-4 h-4" />
                      <span>{archive.languages.length} languages</span>
                    </div>
                    <div>
                      <span>{archive.questionCount} questions</span>
                    </div>
                  </div>

                  {/* Languages */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {archive.languages.map((lang) => (
                      <span
                        key={lang}
                        className="px-2 py-0.5 bg-gray-100 rounded text-xs font-medium text-gray-700"
                      >
                        {lang.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                  <Link
                    href={`/dashboard/archives/${archive.id}`}
                    className="btn btn-secondary"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    View
                  </Link>
                  <button className="btn btn-secondary">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
