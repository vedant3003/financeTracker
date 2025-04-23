'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';

const Navbar: React.FC = () => {
  const { user, logout, isAuthenticated, isAdmin, isViewer } = useAuth();
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path ? 'bg-blue-700' : '';
  };

  return (
    <nav className="bg-blue-600 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold">Finance Tracker</span>
            </Link>
          </div>

          {isAuthenticated && (
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/dashboard')}`}
              >
                Dashboard
              </Link>

              {!isViewer && (
                <Link
                  href="/categories"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/categories')}`}
                >
                  Categories
                </Link>
              )}

              {!isViewer && (
                <Link
                  href="/transactions"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/transactions')}`}
                >
                  Transactions
                </Link>
              )}

              {isAdmin && (
                <Link
                  href="/admin"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/admin')}`}
                >
                  Admin Panel
                </Link>
              )}

              {!isViewer && (
                <Link
                  href="/viewers"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/viewers')}`}
                >
                  Viewers
                </Link>
              )}

              {isViewer && (
                <Link
                  href="/access"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/access')}`}
                >
                  My Access
                </Link>
              )}

              <div className="border-l border-blue-500 h-6 mx-2"></div>

              <div className="text-sm font-medium">
                {user?.name} ({user?.role})
              </div>

              <button
                onClick={logout}
                className="px-3 py-2 rounded-md text-sm font-medium bg-red-500 hover:bg-red-600"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
