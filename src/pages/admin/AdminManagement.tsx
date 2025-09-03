import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';

interface Admin {
  walletAddress: string;
  name: string | null;
  email: string | null;
  permissions: string[];
  isPrimaryAdmin: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  addedBy?: string | null;
  lastLogin?: string | null;
}

const AdminManagement: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [newAdmin, setNewAdmin] = useState({
    walletAddress: '',
    name: '',
    email: '',
    permissions: [] as string[]
  });
  const [availablePermissions, setAvailablePermissions] = useState<string[]>([]);
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<Admin | null>(null);
  const [deletingAdmin, setDeletingAdmin] = useState(false);

  // Copy to clipboard function with toast notification
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyToast('Wallet address copied to clipboard!');
      setTimeout(() => setCopyToast(null), 3000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      setCopyToast('Failed to copy to clipboard');
      setTimeout(() => setCopyToast(null), 3000);
    }
  };

  // Fetch admins from backend
  const fetchAdmins = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('http://localhost:3000/api/admin-management/admins', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch admins');
      }

      const result = await response.json();
      setAdmins(result.data?.admins || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admins');
    } finally {
      setLoading(false);
    }
  };

  // Fetch available permissions from backend - API only, no fallback
  const fetchAvailablePermissions = async () => {
    try {
      setPermissionsLoading(true);
      setPermissionsError(null);
      const token = localStorage.getItem('adminToken');
      const response = await fetch('http://localhost:3000/api/admin-management/permissions', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data?.permissions) {
          setAvailablePermissions(result.data.permissions);
          console.log('Successfully loaded permissions from API:', result.data.permissions);
        } else {
          throw new Error('API returned success but no permissions data');
        }
      } else {
        throw new Error(`Failed to fetch permissions: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch permissions from API';
      console.error('Error fetching permissions:', errorMessage);
      setPermissionsError(errorMessage);
      setAvailablePermissions([]);
    } finally {
      setPermissionsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
    fetchAvailablePermissions();
  }, []);

  // Add new admin with toast validation
  const handleAddAdmin = async () => {
    if (addingAdmin) return; // Prevent double submission
    
    console.log('handleAddAdmin called');
    console.log('newAdmin data:', newAdmin);

    // Validation with toast notifications
    if (!newAdmin.walletAddress.trim()) {
      console.log('Validation failed: wallet address missing');
      setCopyToast('❌ Wallet address is required');
      setTimeout(() => setCopyToast(null), 3000);
      return;
    }

    if (!newAdmin.name.trim()) {
      console.log('Validation failed: name missing');
      setCopyToast('❌ Admin name is required');
      setTimeout(() => setCopyToast(null), 3000);
      return;
    }

    console.log('Validation passed, attempting to create admin...');
    setAddingAdmin(true);

    try {
      const token = localStorage.getItem('adminToken');
      console.log('Token found:', !!token);

      const requestBody = {
        walletAddress: newAdmin.walletAddress.trim(),
        name: newAdmin.name.trim(),
        email: newAdmin.email.trim() || null,
        permissions: newAdmin.permissions
      };
      console.log('Request body:', requestBody);

      const response = await fetch('http://localhost:3000/api/admin-management/admins', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      let result;
      try {
        result = await response.json();
        console.log('Response data:', result);
      } catch (parseError) {
        console.error('Failed to parse response JSON:', parseError);
        throw new Error('Invalid response from server');
      }

      if (!response.ok) {
        throw new Error(result?.message || `Server error: ${response.status} ${response.statusText}`);
      }

      if (!result.success) {
        throw new Error(result.message || 'Server returned failure status');
      }

      if (!result.data?.admin) {
        throw new Error('No admin data returned from server');
      }

      console.log('Admin created successfully:', result.data.admin);
      setAdmins([...admins, result.data.admin]);
      setShowAddModal(false);
      setNewAdmin({ walletAddress: '', name: '', email: '', permissions: [] });
      setCopyToast('✅ Admin added successfully!');
      setTimeout(() => setCopyToast(null), 3000);
    } catch (err) {
      console.error('Error creating admin:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setCopyToast(`❌ ${errorMessage}`);
      setTimeout(() => setCopyToast(null), 5000); // Show error longer
    } finally {
      setAddingAdmin(false);
    }
  };

  // Toggle admin status
  const toggleAdminStatus = async (walletAddress: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:3000/api/admin-management/admins/${walletAddress}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: !currentStatus })
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to update admin status');
      }

      setAdmins(admins.map(admin => 
        admin.walletAddress === walletAddress ? { ...admin, isActive: !currentStatus } : admin
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update admin status');
    }
  };

  // Update admin permissions
  const updateAdminPermissions = async () => {
    if (!selectedAdmin) return;

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:3000/api/admin-management/admins/${selectedAdmin.walletAddress}/permissions`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ permissions: selectedAdmin.permissions })
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to update permissions');
      }

      setAdmins(admins.map(admin => 
        admin.walletAddress === selectedAdmin.walletAddress ? selectedAdmin : admin
      ));
      setShowEditModal(false);
      setSelectedAdmin(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update permissions');
    }
  };

  // Show delete confirmation modal
  const showDeleteConfirmation = (admin: Admin) => {
    setAdminToDelete(admin);
    setShowDeleteModal(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!adminToDelete) return;

    setDeletingAdmin(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:3000/api/admin-management/admins/${adminToDelete.walletAddress}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to delete admin');
      }

      // Remove admin from the list (since it's a soft delete, it might not be shown anymore)
      setAdmins(admins.filter(admin => admin.walletAddress !== adminToDelete.walletAddress));
      setShowDeleteModal(false);
      setAdminToDelete(null);
      setCopyToast('✅ Admin deleted successfully!');
      setTimeout(() => setCopyToast(null), 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete admin';
      setCopyToast(`❌ ${errorMessage}`);
      setTimeout(() => setCopyToast(null), 5000);
    } finally {
      setDeletingAdmin(false);
    }
  };

  // Handle delete cancellation
  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setAdminToDelete(null);
  };

  const handlePermissionToggle = (permission: string, isEdit = false) => {
    if (isEdit && selectedAdmin) {
      const currentPermissions = selectedAdmin.permissions;
      const updatedPermissions = currentPermissions.includes(permission)
        ? currentPermissions.filter((p: string) => p !== permission)
        : [...currentPermissions, permission];
      
      setSelectedAdmin({ ...selectedAdmin, permissions: updatedPermissions });
    } else {
      const currentPermissions = newAdmin.permissions;
      const updatedPermissions = currentPermissions.includes(permission)
        ? currentPermissions.filter((p: string) => p !== permission)
        : [...currentPermissions, permission];
      
      setNewAdmin({ ...newAdmin, permissions: updatedPermissions });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
        <span className={`ml-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Loading admins...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className={`text-3xl font-bold mb-2 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Admin Management
          </h1>
          <p className={`text-lg ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Manage administrator accounts and permissions
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowAddModal(true)}
            disabled={!!permissionsError || availablePermissions.length === 0}
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add New Admin
          </button>
        </div>
      </motion.div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg border ${
            isDarkMode
              ? 'bg-red-900 border-red-700 text-red-300'
              : 'bg-red-50 border-red-200 text-red-600'
          }`}
        >
          {error}
          <button 
            onClick={() => setError(null)}
            className="ml-2 text-sm underline"
          >
            Dismiss
          </button>
        </motion.div>
      )}

      {/* Copy Toast Notification */}
      <AnimatePresence>
        {copyToast && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 20, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            className={`fixed top-4 left-1/2 z-50 px-4 py-2 rounded-lg shadow-lg ${
              isDarkMode
                ? 'bg-gray-800 border border-gray-600 text-green-300'
                : 'bg-white border border-gray-200 text-green-600'
            }`}
          >
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium">{copyToast}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admins Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className={`rounded-lg border ${
          isDarkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        } overflow-hidden`}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={`${
              isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
            }`}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Name
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Wallet Address
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Permissions
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Added By
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Last Login
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Status
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className={`${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            } divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {admins.map((admin) => (
                <tr key={admin.walletAddress}>
                  {/* Name Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className={`text-sm font-medium ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {admin.name || 'Unnamed Admin'}
                        {admin.isPrimaryAdmin && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Primary
                          </span>
                        )}
                      </div>
                      {admin.email && (
                        <div className={`text-sm ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          {admin.email}
                        </div>
                      )}
                    </div>
                  </td>
                  
                  {/* Wallet Address Column with Copy Button */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <div className={`text-xs font-mono ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {admin.walletAddress.slice(0, 16)}...
                      </div>
                      <button
                        onClick={() => copyToClipboard(admin.walletAddress)}
                        className={`p-1 rounded hover:bg-gray-100 ${
                          isDarkMode ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
                        } transition-colors`}
                        title="Copy wallet address"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                    <div className={`text-xs ${
                      isDarkMode ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      {admin.walletAddress}
                    </div>
                  </td>
                  
                  {/* Permissions Column */}
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {admin.permissions.slice(0, 3).map((permission) => (
                        <span
                          key={permission}
                          className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            isDarkMode
                              ? 'bg-blue-900 text-blue-200'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {permission.replace(/_/g, ' ')}
                        </span>
                      ))}
                      {admin.permissions.length > 3 && (
                        <span className={`text-xs ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          +{admin.permissions.length - 3} more
                        </span>
                      )}
                    </div>
                  </td>
                  
                  {/* Added By Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-900'
                    }`}>
                      {admin.addedBy || 'System'}
                    </div>
                  </td>
                  
                  {/* Last Login Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-900'
                    }`}>
                      {admin.lastLogin ? formatDate(admin.lastLogin) : 'Never'}
                    </div>
                  </td>
                  
                  {/* Status Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      admin.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {admin.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  
                  {/* Actions Column */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex flex-col space-y-1 min-w-max">
                      {/* Edit Permissions */}
                      <button
                        onClick={() => {
                          setSelectedAdmin(admin);
                          setShowEditModal(true);
                        }}
                        disabled={admin.isPrimaryAdmin || !!permissionsError || availablePermissions.length === 0}
                        className={`text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          admin.isPrimaryAdmin 
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-teal-600 hover:text-teal-900'
                        }`}
                        title={admin.isPrimaryAdmin ? 'Cannot edit primary admin permissions' : 'Edit Permissions'}
                      >
                        Edit Permissions
                      </button>
                      
                      {/* Activate/Deactivate */}
                      <button
                        onClick={() => toggleAdminStatus(admin.walletAddress, admin.isActive)}
                        disabled={admin.isPrimaryAdmin}
                        className={`text-left transition-colors ${
                          admin.isPrimaryAdmin 
                            ? 'text-gray-400 cursor-not-allowed'
                            : admin.isActive
                              ? 'text-orange-600 hover:text-orange-900'
                              : 'text-green-600 hover:text-green-900'
                        }`}
                        title={admin.isPrimaryAdmin ? 'Cannot modify primary admin' : admin.isActive ? 'Deactivate Admin' : 'Activate Admin'}
                      >
                        {admin.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      
                      {/* Delete */}
                      <button
                        onClick={() => showDeleteConfirmation(admin)}
                        disabled={admin.isPrimaryAdmin}
                        className={`text-left transition-colors ${
                          admin.isPrimaryAdmin 
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-red-600 hover:text-red-900'
                        }`}
                        title={admin.isPrimaryAdmin ? 'Cannot delete primary admin' : 'Delete Admin'}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Add Admin Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className={`max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-lg shadow-2xl ${
                isDarkMode ? 'bg-gray-800 border border-gray-600' : 'bg-white border border-gray-300'
              } p-6`}
              style={{
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)'
              }}
            >
              <h2 className={`text-xl font-bold mb-4 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Add New Admin
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Wallet Address *
                  </label>
                  <input
                    type="text"
                    value={newAdmin.walletAddress}
                    onChange={(e) => setNewAdmin({ ...newAdmin, walletAddress: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      isDarkMode
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="cosmos1..."
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Name *
                  </label>
                  <input
                    type="text"
                    value={newAdmin.name}
                    onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      isDarkMode
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="Admin Name"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Permissions
                  </label>
                  {permissionsLoading ? (
                    <div className="flex items-center justify-center p-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-500"></div>
                      <span className="ml-2 text-sm text-gray-500">Loading permissions...</span>
                    </div>
                  ) : permissionsError ? (
                    <div className={`p-4 rounded-lg border text-center ${
                      isDarkMode
                        ? 'bg-red-900 border-red-700 text-red-300'
                        : 'bg-red-50 border-red-200 text-red-600'
                    }`}>
                      <p className="text-sm mb-2">❌ Failed to load permissions</p>
                      <p className="text-xs mb-3">{permissionsError}</p>
                      <button
                        onClick={fetchAvailablePermissions}
                        className="text-xs underline hover:no-underline"
                      >
                        Retry loading permissions
                      </button>
                    </div>
                  ) : availablePermissions.length === 0 ? (
                    <div className={`p-4 rounded-lg border text-center ${
                      isDarkMode
                        ? 'bg-yellow-900 border-yellow-700 text-yellow-300'
                        : 'bg-yellow-50 border-yellow-200 text-yellow-600'
                    }`}>
                      <p className="text-sm">⚠️ No permissions available</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                      {availablePermissions.map((permission) => (
                        <label key={permission} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={newAdmin.permissions.includes(permission)}
                            onChange={() => handlePermissionToggle(permission)}
                            className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                          />
                          <span className={`text-sm ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>
                            {permission.replace(/_/g, ' ')}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNewAdmin({ walletAddress: '', name: '', email: '', permissions: [] });
                  }}
                  className={`px-4 py-2 border rounded-lg ${
                    isDarkMode
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddAdmin}
                  disabled={addingAdmin || !!permissionsError || availablePermissions.length === 0}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addingAdmin ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Adding...
                    </div>
                  ) : (
                    'Add Admin'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Permissions Modal */}
      <AnimatePresence>
        {showEditModal && selectedAdmin && (
          <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className={`max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-lg shadow-2xl ${
                isDarkMode ? 'bg-gray-800 border border-gray-600' : 'bg-white border border-gray-300'
              } p-6`}
              style={{
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)'
              }}
            >
              <h2 className={`text-xl font-bold mb-4 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Edit Permissions - {selectedAdmin.name || 'Unnamed Admin'}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Permissions
                  </label>
                  {permissionsLoading ? (
                    <div className="flex items-center justify-center p-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-500"></div>
                      <span className="ml-2 text-sm text-gray-500">Loading permissions...</span>
                    </div>
                  ) : permissionsError ? (
                    <div className={`p-4 rounded-lg border text-center ${
                      isDarkMode
                        ? 'bg-red-900 border-red-700 text-red-300'
                        : 'bg-red-50 border-red-200 text-red-600'
                    }`}>
                      <p className="text-sm mb-2">❌ Failed to load permissions</p>
                      <p className="text-xs mb-3">{permissionsError}</p>
                      <button
                        onClick={fetchAvailablePermissions}
                        className="text-xs underline hover:no-underline"
                      >
                        Retry loading permissions
                      </button>
                    </div>
                  ) : availablePermissions.length === 0 ? (
                    <div className={`p-4 rounded-lg border text-center ${
                      isDarkMode
                        ? 'bg-yellow-900 border-yellow-700 text-yellow-300'
                        : 'bg-yellow-50 border-yellow-200 text-yellow-600'
                    }`}>
                      <p className="text-sm">⚠️ No permissions available</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                      {availablePermissions.map((permission) => (
                        <label key={permission} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={selectedAdmin.permissions.includes(permission)}
                            onChange={() => handlePermissionToggle(permission, true)}
                            className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                          />
                          <span className={`text-sm ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>
                            {permission.replace(/_/g, ' ')}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedAdmin(null);
                  }}
                  className={`px-4 py-2 border rounded-lg ${
                    isDarkMode
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={updateAdminPermissions}
                  disabled={!!permissionsError || availablePermissions.length === 0}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Update Permissions
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && adminToDelete && (
          <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className={`max-w-md w-full rounded-lg shadow-2xl ${
                isDarkMode ? 'bg-gray-800 border border-gray-600' : 'bg-white border border-gray-300'
              } p-6`}
              style={{
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)'
              }}
            >
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className={`text-lg font-medium ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Delete Admin
                  </h3>
                </div>
              </div>

              <div className="mb-6">
                <p className={`text-sm ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  Are you sure you want to delete{' '}
                  <span className="font-medium text-red-600">
                    {adminToDelete.name || 'this admin'}
                  </span>
                  ? This action cannot be undone.
                </p>
                <div className={`mt-3 p-3 rounded-lg ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <div className={`text-xs font-mono ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Wallet: {adminToDelete.walletAddress}
                  </div>
                  {adminToDelete.email && (
                    <div className={`text-xs ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      Email: {adminToDelete.email}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleDeleteCancel}
                  disabled={deletingAdmin}
                  className={`flex-1 px-4 py-2 border rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDarkMode
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deletingAdmin}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingAdmin ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Deleting...
                    </div>
                  ) : (
                    'Delete Admin'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminManagement;
