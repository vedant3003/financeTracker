'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="max-w-md w-full">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="mb-6">
            You don't have permission to access this page. Please contact an administrator if you believe this is an error.
          </p>
          <Button
            onClick={() => router.push('/dashboard')}
            variant="primary"
            fullWidth
          >
            Go to Dashboard
          </Button>
        </div>
      </Card>
    </div>
  );
}
