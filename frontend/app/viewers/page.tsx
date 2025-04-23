'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import Input from '@/app/components/ui/Input';
import { userApi } from '@/app/utils/api';

interface ViewerItem {
  viewer: {
    user_id: string;
    name: string;
    email: string;
    role: string;
  };
  access: {
    access_level: string;
    _id: string;
  };
}

export default function ViewersPage() {
  const [viewers, setViewers] = useState<ViewerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<{user_id: string; name: string; role: string} | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    user_id: '',
    name: '',
    email: '',
    password: ''
  });
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('financeTrackerUser');
    if (!storedUser) {
      router.push('/');
      return;
    }

    const userData = JSON.parse(storedUser);
    setUser(userData);

    // Viewers can't access this page
    if (userData.role === 'viewer') {
      router.push('/dashboard');
      return;
    }

    fetchViewers(userData.user_id);
  }, [router]);

  const fetchViewers = async (userId: string) => {
    try {
      setLoading(true);
      const data = await userApi.getViewers(userId);
      console.log('Fetched viewers:', data);
      setViewers(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching viewers:', err);
      setError('Failed to fetch viewers');
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreateViewer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.user_id || !formData.name || !formData.email || !formData.password) {
      setError('All fields are required');
      return;
    }

    try {
      console.log('Creating viewer...');
      await userApi.createViewer({
        user_id: formData.user_id,
        name: formData.name,
        email: formData.email,
        password: formData.password
      });

      console.log('Viewer created, now granting access...');

      // Grant access to the current user's data for the new viewer
      if (user) {
        try {
          await userApi.grantAccess(formData.user_id, user.user_id, {
            access_level: 'read'
          });
          console.log('Access granted successfully');
        } catch (accessErr) {
          console.error('Error granting access:', accessErr);
          setError('Viewer created but failed to grant access');
        }
      }

      // Reset form
      setFormData({
        user_id: '',
        name: '',
        email: '',
        password: ''
      });

      setShowCreateForm(false);

      // Refresh viewers
      if (user) {
        fetchViewers(user.user_id);
      }
    } catch (err: any) {
      console.error('Error creating viewer:', err);
      setError(err.message || 'Failed to create viewer');
    }
  };

  const handleRevokeAccess = async (viewerId: string) => {
    if (!user) return;

    if (!confirm('Are you sure you want to revoke access for this viewer?')) {
      return;
    }

    try {
      await userApi.revokeAccess(viewerId, user.user_id);

      // Refresh viewers
      fetchViewers(user.user_id);
    } catch (err) {
      setError('Failed to revoke access');
    }
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Viewers</h1>
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          variant={showCreateForm ? "secondary" : "primary"}
        >
          {showCreateForm ? 'Cancel' : 'Create Viewer'}
        </Button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {showCreateForm && (
        <Card className="mb-6">
          <h2 className="text-xl font-bold mb-4">Create New Viewer</h2>
          <form onSubmit={handleCreateViewer}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                id="user_id"
                name="user_id"
                label="User ID"
                value={formData.user_id}
                onChange={handleChange}
                required
              />

              <Input
                id="name"
                name="name"
                label="Full Name"
                value={formData.name}
                onChange={handleChange}
                required
              />

              <Input
                id="email"
                name="email"
                label="Email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
              />

              <Input
                id="password"
                name="password"
                label="Password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            <div className="flex justify-end mt-4">
              <Button type="submit" variant="primary">
                Create Viewer
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <h2 className="text-xl font-bold mb-4">Your Viewers</h2>

        {viewers.length === 0 ? (
          <p className="text-center py-4">You haven't granted access to any viewers yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Access Level
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {viewers.map((item) => (
                  <tr key={item.viewer.user_id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.viewer.user_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.viewer.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.viewer.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {item.access.access_level === 'read_write' ? 'Read & Write' : 'Read Only'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button
                        onClick={() => handleRevokeAccess(item.viewer.user_id)}
                        variant="danger"
                        className="text-xs py-1 px-2"
                      >
                        Revoke Access
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
