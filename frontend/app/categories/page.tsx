'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import { categoryApi } from '@/app/utils/api';

interface Category {
  id: string;
  name: string;
  color: string;
  limit: number;
  spent: number;
  transactionCount: number;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<{user_id: string; name: string; role: string} | null>(null);
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

    fetchCategories(userData.user_id);
  }, [router]);

  const fetchCategories = async (userId: string) => {
    try {
      setLoading(true);
      const data = await categoryApi.getCategories(userId);

      const formattedCategories = Object.values(data.categories).map((category: any) => ({
        id: category.CategoryData._id,
        name: category.CategoryData.category_name,
        color: category.CategoryData.color,
        limit: category.Limit?.limit || 0,
        spent: category.Limit?.spent || 0,
        transactionCount: category.Transactions?.length || 0
      }));

      setCategories(formattedCategories);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch categories');
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!user) return;

    const categoryName = prompt('Enter category name:');
    if (!categoryName) return;

    const categoryLimit = prompt('Enter monthly limit:');
    if (categoryLimit === null) return; // User cancelled

    // Generate a random color
    const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16);

    try {
      await categoryApi.createCategory(user.user_id, {
        category_name: categoryName,
        category_limit: parseFloat(categoryLimit || '0'),
        color: randomColor
      });

      // Refresh categories
      fetchCategories(user.user_id);
    } catch (err) {
      setError('Failed to create category');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!user) return;

    if (!confirm('Are you sure you want to delete this category? All associated transactions will also be deleted.')) {
      return;
    }

    try {
      await categoryApi.deleteCategory(user.user_id, categoryId);

      // Refresh categories
      fetchCategories(user.user_id);
    } catch (err) {
      setError('Failed to delete category');
    }
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Categories</h1>
        <Button onClick={handleAddCategory} variant="primary">
          Add Category
        </Button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {categories.length === 0 ? (
        <Card>
          <p className="text-center py-4">No categories found. Create a category to start tracking your expenses.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <Card key={category.id}>
              <div className="flex items-center mb-2">
                <div
                  className="w-4 h-4 rounded-full mr-2"
                  style={{ backgroundColor: category.color }}
                ></div>
                <h3 className="text-lg font-bold">{category.name}</h3>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1 text-gray-900">
                  <span>Budget:</span>
                  <span>${category.limit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm mb-1 text-gray-900">
                  <span>Spent:</span>
                  <span>${category.spent.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-900">
                  <span>Transactions:</span>
                  <span>{category.transactionCount}</span>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => handleDeleteCategory(category.id)}
                  variant="danger"
                  className="text-sm"
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
