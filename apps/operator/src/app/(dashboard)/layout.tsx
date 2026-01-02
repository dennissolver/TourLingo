'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import {
  Home,
  Map,
  Archive,
  Settings,
  Menu,
  X,
  LogOut,
  User,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Tours', href: '/dashboard/tours', icon: Map },
  { name: 'Archives', href: '/dashboard/archives', icon: Archive },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

// Create Supabase client for auth operations
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Sign out error:', error);
      }

      // Clear any local storage
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }

      // Redirect to login
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Failed to sign out:', error);
      // Force redirect anyway
      router.push('/login');
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">TL</span>
              </div>
              <span className="font-semibold text-gray-900">TourLingo</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-500"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`sidebar-link ${isActive ? 'active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-3 border-t border-gray-200">
            <div className="flex items-center space-x-3 px-3 py-2">
              <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  Operator
                </p>
                <p className="text-xs text-gray-500 truncate">
                  Tour Guide
                </p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="sidebar-link w-full mt-2 text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
            >
              <LogOut className="w-5 h-5" />
              <span>{isSigningOut ? 'Signing out...' : 'Sign out'}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-500 mr-4"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">
            {navigation.find((n) => pathname.startsWith(n.href))?.name || 'Dashboard'}
          </h1>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}