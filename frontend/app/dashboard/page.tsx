'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { userApi, categoryApi, transactionApi } from '../utils/api';

interface CategorySummary {
  id: string;
  name: string;
  spent: number;
  limit: number;
  percentage: number;
  transactions: any[];
}

const Dashboard = () => {
  const { user, isAdmin, isViewer } = useAuth();
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [totalBudget, setTotalBudget] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessibleUsers, setAccessibleUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        if (isViewer && user) {
          // Fetch users the viewer has access to
          const accessData = await userApi.getViewerAccess(user.user_id);
          setAccessibleUsers(accessData);

          if (accessData.length > 0) {
            setSelectedUserId(accessData[0].targetUser.user_id);
          }
        } else if (user) {
          // For regular users and admins, load their own data
          setSelectedUserId(user.user_id);
        }

        setLoading(false);
      } catch (err) {
        setError('Failed to load dashboard data');
        setLoading(false);
        console.error(err);
      }
    };

    fetchData();
  }, [user, isViewer]);

  useEffect(() => {
    const fetchCategoryData = async () => {
      if (!selectedUserId) return;

      try {
        setLoading(true);
        const data = await categoryApi.getCategories(selectedUserId);

        let totalSpentAmount = 0;
        let totalBudgetAmount = 0;
        const categorySummaries: CategorySummary[] = [];

        // Process categories data
        Object.values(data.categories).forEach((category: any) => {
          const spent = category.Limit?.spent || 0;
          const limit = category.Limit?.limit || 0;

          totalSpentAmount += spent;
          totalBudgetAmount += limit;

          categorySummaries.push({
            id: category.CategoryData._id,
            name: category.CategoryData.category_name,
            spent,
            limit,
            percentage: limit > 0 ? (spent / limit) * 100 : 0,
            transactions: category.Transactions || []
          });
        });

        setCategories(categorySummaries);
        setTotalSpent(totalSpentAmount);
        setTotalBudget(totalBudgetAmount);
        setLoading(false);
      } catch (err) {
        setError('Failed to load category data');
        setLoading(false);
        console.error(err);
      }
    };

    fetchCategoryData();
  }, [selectedUserId]);

  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedUserId(e.target.value);
  };

  // Add category
  const handleAddCategory = async () => {
    if (!user || !selectedUserId || isViewer) return;

    const categoryName = prompt('Enter category name:');
    if (!categoryName) return;

    const categoryLimit = prompt('Enter monthly limit:');

    // Generate a random color if not provided
    const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16);

    try {
      await categoryApi.createCategory(selectedUserId, {
        category_name: categoryName,
        category_limit: parseFloat(categoryLimit || '0'),
        color: randomColor // Add the required color field
      });

      // Refresh data
      const data = await categoryApi.getCategories(selectedUserId);
      processCategories(data);
    } catch (err) {
      setError('Failed to create category');
      console.error(err);
    }
  };

  // Delete category
  const handleDeleteCategory = async (categoryId: string) => {
    if (!user || !selectedUserId || isViewer) return;

    if (!confirm('Are you sure you want to delete this category? All associated transactions will also be deleted.')) {
      return;
    }

    try {
      await categoryApi.deleteCategory(selectedUserId, categoryId);

      // Refresh data
      const data = await categoryApi.getCategories(selectedUserId);
      processCategories(data);
    } catch (err) {
      setError('Failed to delete category');
      console.error(err);
    }
  };

  // Add transaction
  const handleAddTransaction = async (categoryId: string) => {
    if (!user || !selectedUserId || isViewer) return;

    const amount = prompt('Enter amount:');
    if (!amount) return;

    const description = prompt('Enter description (optional):');

    try {
      await transactionApi.createTransaction(selectedUserId, {
        category_id: categoryId,
        amount: parseFloat(amount),
        description: description || ''
      });

      // Refresh data
      const data = await categoryApi.getCategories(selectedUserId);
      processCategories(data);
    } catch (err) {
      setError('Failed to create transaction');
      console.error(err);
    }
  };

  // Delete transaction
  const handleDeleteTransaction = async (transactionId: string) => {
    if (!user || !selectedUserId || isViewer) return;

    if (!confirm('Are you sure you want to delete this transaction?')) {
      return;
    }

    try {
      await transactionApi.deleteTransaction(selectedUserId, transactionId);

      // Refresh data
      const data = await categoryApi.getCategories(selectedUserId);
      processCategories(data);
    } catch (err) {
      setError('Failed to delete transaction');
      console.error(err);
    }
  };

  // Helper function to process category data
  const processCategories = (data: any) => {
    let totalSpentAmount = 0;
    let totalBudgetAmount = 0;
    const categorySummaries: CategorySummary[] = [];

    Object.values(data.categories).forEach((category: any) => {
      const spent = category.Limit?.spent || 0;
      const limit = category.Limit?.limit || 0;

      totalSpentAmount += spent;
      totalBudgetAmount += limit;

      categorySummaries.push({
        id: category.CategoryData._id,
        name: category.CategoryData.category_name,
        spent,
        limit,
        percentage: limit > 0 ? (spent / limit) * 100 : 0,
        transactions: category.Transactions || []
      });
    });

    setCategories(categorySummaries);
    setTotalSpent(totalSpentAmount);
    setTotalBudget(totalBudgetAmount);
  };

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

        {loading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        ) : (
          <>
            {isViewer && accessibleUsers.length > 0 && (
              <div className="mb-6">
                <label htmlFor="userSelect" className="block text-sm font-medium text-gray-700 mb-1">
                  Select User
                </label>
                <select
                  id="userSelect"
                  value={selectedUserId || ''}
                  onChange={handleUserChange}
                  className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  {accessibleUsers.map((access) => (
                    <option key={access.targetUser.user_id} value={access.targetUser.user_id}>
                      {access.targetUser.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-500">Total Balance</h3>
                  <p className="text-3xl font-bold text-gray-900">
                    ${user?.balance.toFixed(2) || '0.00'}
                  </p>
                </div>
              </Card>

              <Card>
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-500">Total Spent</h3>
                  <p className="text-3xl font-bold text-red-600">
                    ${totalSpent.toFixed(2)}
                  </p>
                </div>
              </Card>

              <Card>
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-500">Total Budget</h3>
                  <p className="text-3xl font-bold text-green-600">
                    ${totalBudget.toFixed(2)}
                  </p>
                </div>
              </Card>
            </div>

            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Categories</h2>
              {!isViewer && (
                <Button onClick={handleAddCategory} variant="primary">
                  Add Category
                </Button>
              )}
            </div>

            {categories.length === 0 ? (
              <Card>
                <p className="text-center text-gray-500 py-4">
                  No categories found. {!isViewer && 'Create a category to start tracking your expenses.'}
                </p>
              </Card>
            ) : (
              <div className="space-y-8">
                {categories.map((category) => (
                  <Card key={category.id}>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold">{category.name}</h3>
                      <div className="flex space-x-2">
                        {!isViewer && (
                          <>
                            <Button
                              onClick={() => handleAddTransaction(category.id)}
                              variant="secondary"
                              className="text-sm"
                            >
                              Add Transaction
                            </Button>
                            <Button
                              onClick={() => handleDeleteCategory(category.id)}
                              variant="danger"
                              className="text-sm"
                            >
                              Delete Category
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Budget Progress</span>
                        <span className="text-sm">
                          ${category.spent.toFixed(2)} / ${category.limit.toFixed(2)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full ${
                            category.percentage > 90
                              ? 'bg-red-600'
                              : category.percentage > 70
                              ? 'bg-yellow-500'
                              : 'bg-green-600'
                          }`}
                          style={{ width: `${Math.min(100, category.percentage)}%` }}
                        ></div>
                      </div>
                      <div className="text-right mt-1">
                        <span className="text-xs text-gray-500">
                          {category.percentage.toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    {/* Transactions */}
                    <div>
                      <h4 className="font-medium mb-2">Transactions</h4>
                      {category.transactions.length === 0 ? (
                        <p className="text-sm text-gray-500">No transactions in this category.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead>
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                {!isViewer && (
                                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {category.transactions.map((transaction: any) => (
                                <tr key={transaction._id} className="border-b border-gray-200">
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                    {new Date(transaction.time_stamp).toLocaleDateString()}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                    {transaction.description || '-'}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                    ${parseFloat(transaction.amount).toFixed(2)}
                                  </td>
                                  {!isViewer && (
                                    <td className="px-4 py-2 whitespace-nowrap text-right text-sm">
                                      <Button
                                        onClick={() => handleDeleteTransaction(transaction._id)}
                                        variant="danger"
                                        className="text-xs py-1 px-2"
                                      >
                                        Delete
                                      </Button>
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </ProtectedRoute>
  );
};

export default Dashboard;
