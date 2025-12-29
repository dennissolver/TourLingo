'use client';

import Link from 'next/link';
import { Plus, Users, Clock, Globe, TrendingUp } from 'lucide-react';

export default function DashboardPage() {
  // Mock data - replace with real data from Supabase
  const stats = [
    { label: 'Tours This Month', value: '24', icon: Clock, change: '+12%' },
    { label: 'Total Guests', value: '312', icon: Users, change: '+8%' },
    { label: 'Languages Used', value: '9', icon: Globe, change: '+2' },
    { label: 'Avg. Satisfaction', value: '4.9', icon: TrendingUp, change: '+0.2' },
  ];

  const recentTours = [
    {
      id: '1',
      name: 'Sydney Harbour Morning',
      date: '2024-12-30',
      guests: 12,
      languages: ['de', 'ja', 'zh'],
    },
    {
      id: '2',
      name: 'Behind the Scenes',
      date: '2024-12-29',
      guests: 8,
      languages: ['de', 'fr'],
    },
    {
      id: '3',
      name: 'Maggie Comprehensive',
      date: '2024-12-28',
      guests: 15,
      languages: ['ja', 'ko', 'zh'],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/dashboard/tours/new"
          className="btn btn-primary btn-large flex-1 justify-center"
        >
          <Plus className="w-5 h-5 mr-2" />
          Start New Tour
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">
                  {stat.value}
                </p>
              </div>
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <stat.icon className="w-5 h-5 text-primary-600" />
              </div>
            </div>
            <p className="text-sm text-green-600 mt-2">{stat.change} from last month</p>
          </div>
        ))}
      </div>

      {/* Recent Tours */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Tours</h2>
          <Link
            href="/dashboard/archives"
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Tour Name
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Date
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Guests
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  Languages
                </th>
              </tr>
            </thead>
            <tbody>
              {recentTours.map((tour) => (
                <tr
                  key={tour.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-3 px-4">
                    <Link
                      href={`/dashboard/archives/${tour.id}`}
                      className="text-gray-900 hover:text-primary-600"
                    >
                      {tour.name}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{tour.date}</td>
                  <td className="py-3 px-4 text-gray-600">{tour.guests}</td>
                  <td className="py-3 px-4">
                    <div className="flex space-x-1">
                      {tour.languages.map((lang) => (
                        <span
                          key={lang}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                        >
                          {lang.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
