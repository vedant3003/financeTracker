'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import Input from '@/app/components/ui/Input';

export default function CreateUserPage() {
  const [formData, setFormData] = useState({
    user_id: '',
    name: '',
    email: '',
    password: '',
    role: 'user',
    balance: '0'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Check if user is admin
  useEffect(() => {
    const storedUser = localStorage.getItem('financeTrackerUser');
    if (!storedUser) {
      router.push('/');
      return;
    }

    const userData = JSON.parse(storedUser);
    if (userData.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate form
    if (!formData.user_id || !formData.name || !formData.email || !formData.password) {
      setError('All fields are required');
      return;
    }

    try {
      setLoading(true);

      const credentialsStr = localStorage.getItem('financeTrackerCredentials');
      if (!credentialsStr) {
        throw new Error('No credentials found. Please log in again.');
      }
      const credentials = JSON.parse(credentialsStr);

      let endpoint = 'http://localhost:5000/users';
      if (formData.role === 'viewer') {
        endpoint = 'http://localhost:5000/users/viewer';
      } else if (formData.role === 'admin') {
        endpoint = 'http://localhost:5000/users/admin';
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user_id': credentials.user_id,
          'password': credentials.password
        },
        body: JSON.stringify({
          user_id: formData.user_id,
          name: formData.name,
          email: formData.email,
          password: formData.password,
          balance: parseFloat(formData.balance) || 0
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }

      // User created successfully
      alert('User created successfully');
      router.push('/admin');
    } catch (err: any) {
      setError(err.message || 'An error occurred during user creation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Create New User</h1>
        <Button onClick={() => router.push('/admin')} variant="secondary">
          Back to Admin Panel
        </Button>
      </div>

      <Card>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
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

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="role">
                Role
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="user">Regular User</option>
                <option value="admin">Admin</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>

            {formData.role !== 'viewer' && (
              <Input
                id="balance"
                name="balance"
                label="Initial Balance ($)"
                type="number"
                value={formData.balance}
                onChange={handleChange}
              />
            )}
          </div>

          <div className="flex justify-end mt-6">
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
            >
              {loading ? 'Creating User...' : 'Create User'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
