const API_URL = 'http://localhost:5000';

// Helper function to get auth headers
export const getAuthHeaders = () => {
  const credentials = localStorage.getItem('financeTrackerCredentials');
  if (!credentials) {
    console.warn('No credentials found in localStorage');
    return {};
  }

  try {
    const { user_id, password } = JSON.parse(credentials);
    return {
      'user_id': user_id,
      'password': password,
      'Content-Type': 'application/json'
    };
  } catch (err) {
    console.error('Error parsing credentials:', err);
    return {};
  }
};

// User API
export const userApi = {
  // Get all users (admin only)
  getAllUsers: async () => {
    const response = await fetch(`${API_URL}/users`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }

    return response.json();
  },

  // Get user by ID
  getUserById: async (userId: string) => {
    const response = await fetch(`${API_URL}/users/${userId}`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user');
    }

    return response.json();
  },

  // Create a new user
  createUser: async (userData: any) => {
    const response = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(userData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create user');
    }

    return response.json();
  },

  // Create a viewer user
  createViewer: async (viewerData: any) => {
    console.log('Creating viewer with data:', viewerData);
    const headers = getAuthHeaders();
    console.log('Using headers:', headers);

    const response = await fetch(`${API_URL}/users/viewer`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(viewerData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to create viewer:', errorData);
      throw new Error(errorData.error || 'Failed to create viewer');
    }

    const result = await response.json();
    console.log('Viewer created successfully:', result);
    return result;
  },

  // Grant viewer access
  grantAccess: async (viewerId: string, targetUserId: string, accessData: any) => {
    const response = await fetch(`${API_URL}/users/access/${viewerId}/${targetUserId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(accessData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to grant access');
    }

    return response.json();
  },

  // Revoke viewer access
  revokeAccess: async (viewerId: string, targetUserId: string) => {
    const response = await fetch(`${API_URL}/users/access/${viewerId}/${targetUserId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to revoke access');
    }

    return response.json();
  },

  // Get viewers for a user
  getViewers: async (userId: string) => {
    const response = await fetch(`${API_URL}/users/access/target/${userId}`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch viewers');
    }

    return response.json();
  },

  // Get users a viewer has access to
  getViewerAccess: async (viewerId: string) => {
    const response = await fetch(`${API_URL}/users/access/viewer/${viewerId}`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch viewer access');
    }

    return response.json();
  },

  // Delete a user
  deleteUser: async (userId: string) => {
    const response = await fetch(`${API_URL}/users/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete user');
    }

    return response.json();
  }
};

// Category API
export const categoryApi = {
  // Get categories for a user
  getCategories: async (userId: string) => {
    const response = await fetch(`${API_URL}/categories/${userId}`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch categories');
    }

    return response.json();
  },

  // Create a new category
  createCategory: async (userId: string, categoryData: any) => {
    const response = await fetch(`${API_URL}/categories/${userId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(categoryData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create category');
    }

    return response.json();
  },

  // Delete a category
  deleteCategory: async (userId: string, categoryId: string) => {
    const response = await fetch(`${API_URL}/categories/${userId}/${categoryId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete category');
    }

    return response.json();
  }
};

// Transaction API
export const transactionApi = {
  // Get transactions for a user
  getTransactions: async (userId: string, categoryId?: string) => {
    const url = categoryId
      ? `${API_URL}/transactions/${userId}?category_id=${categoryId}`
      : `${API_URL}/transactions/${userId}`;

    const response = await fetch(url, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch transactions');
    }

    return response.json();
  },

  // Create a new transaction
  createTransaction: async (userId: string, transactionData: any) => {
    const response = await fetch(`${API_URL}/transactions/${userId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(transactionData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create transaction');
    }

    return response.json();
  },

  // Delete a transaction
  deleteTransaction: async (userId: string, transactionId: string) => {
    const response = await fetch(`${API_URL}/transactions/${userId}/${transactionId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete transaction');
    }

    return response.json();
  }
};
