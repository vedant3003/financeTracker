'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { userApi, categoryApi, transactionApi } from '../utils/api';

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState('users'); // 'users', 'categories', 'transactions'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    // Check if user is logged in and is admin
    const storedUser = localStorage.getItem('financeTrackerUser');
    if (!storedUser) {
      router.push('/');
      return;
    }

    const userData = JSON.parse(storedUser);
    if (userData.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    fetchUsers();
  }, [router]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await userApi.getAllUsers();
      setUsers(data);

      // If we have a selected user, refresh their data
      if (selectedUser) {
        fetchUserData(selectedUser.user_id);
      } else if (data.length > 0) {
        // Select the first user by default
        setSelectedUser(data[0]);
        fetchUserData(data[0].user_id);
      }

      setLoading(false);
    } catch (err) {
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  const fetchUserData = async (userId) => {
    try {
      setLoading(true);

      // Fetch categories and transactions for the selected user
      const categoryData = await categoryApi.getCategories(userId);

      // Format categories
      const formattedCategories = Object.values(categoryData.categories).map((category: any) => ({
        id: category.CategoryData._id,
        name: category.CategoryData.category_name,
        color: category.CategoryData.color,
        limit: category.Limit?.limit || 0,
        spent: category.Limit?.spent || 0,
        transactions: category.Transactions || []
      }));

      setCategories(formattedCategories);

      // Collect all transactions
      const allTransactions = [];

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
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    const userId = prompt('Enter user ID:');
    if (!userId) return;

    const name = prompt('Enter name:');
    if (!name) return;

    const email = prompt('Enter email:');
    if (!email) return;

    const password = prompt('Enter password:');
    if (!password) return;

    const role = prompt('Enter role (admin, user, or viewer):');
    if (!['admin', 'user', 'viewer'].includes(role)) {
      alert('Invalid role. Must be admin, user, or viewer.');
      return;
    }

    const balance = prompt('Enter initial balance (for user and admin only):');

    try {
      const credentials = JSON.parse(localStorage.getItem('financeTrackerCredentials'));

      let endpoint = 'http://localhost:5000/users';
      if (role === 'viewer') {
        endpoint = 'http://localhost:5000/users/viewer';
      } else if (role === 'admin') {
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
          user_id: userId,
          name,
          email,
          password,
          role,
          balance: parseFloat(balance || '0')
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }

      alert('User created successfully');
      fetchUsers();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm(`Are you sure you want to delete user ${userId}?`)) {
      return;
    }

    try {
      const credentials = JSON.parse(localStorage.getItem('financeTrackerCredentials'));
      const response = await fetch(`http://localhost:5000/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'user_id': credentials.user_id,
          'password': credentials.password
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user');
      }

      alert('User deleted successfully');
      fetchUsers();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleManageViewerAccess = async (viewerId) => {
    const targetUserId = prompt('Enter user ID to grant access to:');
    if (!targetUserId) return;

    try {
      const credentials = JSON.parse(localStorage.getItem('financeTrackerCredentials'));
      const response = await fetch(`http://localhost:5000/users/access/${viewerId}/${targetUserId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user_id': credentials.user_id,
          'password': credentials.password
        },
        body: JSON.stringify({
          access_level: 'read'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to grant access');
      }

      alert('Access granted successfully');
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <div className="flex space-x-2">
          <Button onClick={() => router.push('/admin/create-user')} variant="primary">
            Create User (Form)
          </Button>
          <Button onClick={handleCreateUser} variant="secondary">
            Quick Create
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`py-2 px-4 font-medium ${activeTab === 'users' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
        <button
          className={`py-2 px-4 font-medium ${activeTab === 'categories' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('categories')}
        >
          Categories
        </button>
        <button
          className={`py-2 px-4 font-medium ${activeTab === 'transactions' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('transactions')}
        >
          Transactions
        </button>
      </div>

      {/* User selector (for categories and transactions tabs) */}
      {activeTab !== 'users' && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select User:
            <select
              value={selectedUser?.user_id || ''}
              onChange={(e) => {
                const userId = e.target.value;
                const user = users.find(u => u.user_id === userId);
                setSelectedUser(user);
                if (user) {
                  fetchUserData(user.user_id);
                }
              }}
              className="ml-2 border border-gray-300 rounded px-2 py-1"
            >
              {users.map(user => (
                <option key={user.user_id} value={user.user_id}>
                  {user.name} ({user.user_id})
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <Card>
          <h2 className="text-xl font-bold mb-4">User Management</h2>

          {users.length === 0 ? (
            <p>No users found.</p>
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
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Balance
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.user_id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {user.user_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.role === 'admin'
                              ? 'bg-purple-100 text-purple-800'
                              : user.role === 'viewer'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.role !== 'viewer' ? `$${user.balance.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <Button
                            onClick={() => {
                              setSelectedUser(user);
                              fetchUserData(user.user_id);
                              setActiveTab('categories');
                            }}
                            variant="secondary"
                            className="px-2 py-1 text-xs"
                          >
                            View Data
                          </Button>
                          {user.role === 'viewer' && (
                            <Button
                              onClick={() => handleManageViewerAccess(user.user_id)}
                              variant="secondary"
                              className="px-2 py-1 text-xs"
                            >
                              Grant Access
                            </Button>
                          )}
                          <Button
                            onClick={() => handleDeleteUser(user.user_id)}
                            variant="danger"
                            className="px-2 py-1 text-xs"
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && selectedUser && (
        <Card>
          <h2 className="text-xl font-bold mb-4">
            Categories for {selectedUser.name} ({selectedUser.user_id})
          </h2>

          {categories.length === 0 ? (
            <p>No categories found for this user.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => (
                <Card key={category.id} className="border border-gray-200">
                  <div className="flex items-center mb-2">
                    <div
                      className="w-4 h-4 rounded-full mr-2"
                      style={{ backgroundColor: category.color }}
                    ></div>
                    <h3 className="text-lg font-bold">{category.name}</h3>
                  </div>

                  <div className="mb-4 text-gray-900">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Budget:</span>
                      <span>${category.limit.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Spent:</span>
                      <span>${category.spent.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Transactions:</span>
                      <span>{category.transactions.length}</span>
                    </div>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                    <div
                      className={`h-2.5 rounded-full ${
                        category.limit > 0 && (category.spent / category.limit) > 0.9
                          ? 'bg-red-600'
                          : category.limit > 0 && (category.spent / category.limit) > 0.7
                          ? 'bg-yellow-500'
                          : 'bg-green-600'
                      }`}
                      style={{ width: `${category.limit > 0 ? Math.min(100, (category.spent / category.limit) * 100) : 0}%` }}
                    ></div>
                  </div>

                  <Button
                    onClick={() => {
                      setActiveTab('transactions');
                      // Could filter transactions by category here if desired
                    }}
                    variant="secondary"
                    className="w-full text-sm"
                  >
                    View Transactions
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && selectedUser && (
        <Card>
          <h2 className="text-xl font-bold mb-4">
            Transactions for {selectedUser.name} ({selectedUser.user_id})
          </h2>

          {transactions.length === 0 ? (
            <p>No transactions found for this user.</p>
          ) : (
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
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((transaction) => (
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
