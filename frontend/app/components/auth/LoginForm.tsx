'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import Input from '@/app/components/ui/Input';
import Button from '@/app/components/ui/Button';
import Card from '@/app/components/ui/Card';

const LoginForm: React.FC = () => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');

  const { login, loading, error } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!userId || !password) {
      setFormError('Please enter both user ID and password');
      return;
    }

    try {
      await login(userId, password);
      router.push('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-center mb-6">Login to Finance Tracker</h2>

      <form onSubmit={handleSubmit}>
        {(error || formError) && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {formError || error}
          </div>
        )}

        <Input
          id="userId"
          label="User ID"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          required
        />

        <Input
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <Button
          type="submit"
          variant="primary"
          disabled={loading}
          fullWidth
          className="mt-4 mb-4"
        >
          {loading ? 'Logging in...' : 'Login'}
        </Button>

        <div className="text-center">
          Don't have an account?{' '}
          <Link href="/register" className="text-blue-500 hover:text-blue-700">
            Register
          </Link>
        </div>
      </form>
    </Card>
  );
};

export default LoginForm;
