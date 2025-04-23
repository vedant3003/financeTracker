'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import { categoryApi, transactionApi } from '@/app/utils/api';

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Transaction {
  _id: string;
  time_stamp: string;
  amount: number;
  description?: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<{user_id: string; name: string; role: string} | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
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

    fetchData(userData.user_id);
  }, [router]);

  const fetchData = async (userId: string) => {
    try {
      setLoading(true);

      // Fetch categories first
      const categoryData = await categoryApi.getCategories(userId);

      // Format categories for dropdown
      const formattedCategories = Object.values(categoryData.categories).map((category: any) => ({
        id: category.CategoryData._id,
        name: category.CategoryData.category_name,
        color: category.CategoryData.color
      }));

      setCategories(formattedCategories);

      // Collect all transactions from all categories
      const allTransactions: Transaction[] = [];

      Object.values(categoryData.categories).forEach((category: any) => {
        const categoryId = category.CategoryData._id;
        const categoryName = category.CategoryData.category_name;
        const categoryColor = category.CategoryData.color;

        category.Transactions.forEach((transaction: any) => {
          allTransactions.push({
            ...transaction,
            categoryId,
            categoryName,
            categoryColor
          });
        });
      });

      // Sort transactions by date (newest first)
      allTransactions.sort((a, b) => new Date(b.time_stamp).getTime() - new Date(a.time_stamp).getTime());

      setTransactions(allTransactions);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch data');
      setLoading(false);
    }
  };

  const handleAddTransaction = async () => {
    if (!user || categories.length === 0) return;

    // Create a list of categories for selection

    // Use a more sophisticated prompt with HTML
    const categoryId = prompt(`Select category:\n${categories.map((cat, index) => `${index + 1}. ${cat.name}`).join('\n')}\n\nEnter the number or category name:`);

    if (!categoryId) return;

    // Find the selected category
    let selectedCategoryObj;

    // Try to find by number
    const categoryIndex = parseInt(categoryId) - 1;
    if (!isNaN(categoryIndex) && categoryIndex >= 0 && categoryIndex < categories.length) {
      selectedCategoryObj = categories[categoryIndex];
    } else {
      // Try to find by name
      selectedCategoryObj = categories.find(cat =>
        cat.name.toLowerCase() === categoryId.toLowerCase()
      );

      // Try to find by ID
      if (!selectedCategoryObj) {
        selectedCategoryObj = categories.find(cat => cat.id === categoryId);
      }
    }

    if (!selectedCategoryObj) {
      alert('Invalid category selection');
      return;
    }

    const amount = prompt('Enter amount:');
    if (!amount) return;

    const description = prompt('Enter description (optional):');

    try {
      await transactionApi.createTransaction(user.user_id, {
        category_id: selectedCategoryObj.id,
        amount: parseFloat(amount),
        description: description || ''
      });

      // Refresh data
      fetchData(user.user_id);
    } catch (err) {
      setError('Failed to create transaction');
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!user) return;

    if (!confirm('Are you sure you want to delete this transaction?')) {
      return;
    }

    try {
      await transactionApi.deleteTransaction(user.user_id, transactionId);

      // Refresh data
      fetchData(user.user_id);
    } catch (err) {
      setError('Failed to delete transaction');
    }
  };

  const filteredTransactions = selectedCategory === 'all'
    ? transactions
    : transactions.filter(t => t.categoryId === selectedCategory);

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <Button onClick={handleAddTransaction} variant="primary">
          Add Transaction
        </Button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Filter by Category:
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="ml-2 border border-gray-300 rounded px-2 py-1"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filteredTransactions.length === 0 ? (
        <Card>
          <p className="text-center py-4">No transactions found.</p>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(transaction.time_stamp).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <div
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: transaction.categoryColor }}
                        ></div>
                        {transaction.categoryName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${transaction.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button
                        onClick={() => handleDeleteTransaction(transaction._id)}
                        variant="danger"
                        className="text-xs py-1 px-2"
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
