'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '../components/ui/Card';

export default function ViewerAccessPage() {
  const [accessList, setAccessList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in and is a viewer
    const storedUser = localStorage.getItem('financeTrackerUser');
    if (!storedUser) {
      router.push('/');
      return;
    }

    const userData = JSON.parse(storedUser);
    if (userData.role !== 'viewer') {
      router.push('/dashboard');
      return;
    }

    fetchAccessList(userData.user_id);
  }, [router]);

  const fetchAccessList = async (viewerId) => {
    try {
      setLoading(true);
      const credentials = JSON.parse(localStorage.getItem('financeTrackerCredentials'));
      const response = await fetch(`http://localhost:5000/users/access/viewer/${viewerId}`, {
        headers: {
          'user_id': credentials.user_id,
          'password': credentials.password
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch access list');
      }

      const data = await response.json();
      setAccessList(data);
      setLoading(false);
    } catch (err) {
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">My Access</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {accessList.length === 0 ? (
        <Card>
          <p className="text-center py-4">You don't have access to any user's data yet.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {accessList.map((item) => (
            <Card key={item.access._id}>
              <h2 className="text-xl font-bold mb-2">{item.targetUser.name}</h2>
              <p className="text-gray-900 mb-1">User ID: {item.targetUser.user_id}</p>
              <p className="text-gray-900 mb-1">Email: {item.targetUser.email}</p>
              <p className="text-gray-900 mb-4">
                Access Level: {item.access.access_level === 'read_write' ? 'Read & Write' : 'Read Only'}
              </p>

              <div className="mt-2">
                <button
                  onClick={() => router.push(`/dashboard?userId=${item.targetUser.user_id}`)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                >
                  View Data
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
