import { adminApiClient } from '../utils/adminApiClient';

/**
 * Custom hook for making authenticated admin API calls
 * Automatically handles token expiration and re-authentication
 */
export const useAdminApi = () => {
  return {
    // Generic API call methods
    get: adminApiClient.get.bind(adminApiClient),
    post: adminApiClient.post.bind(adminApiClient),
    put: adminApiClient.put.bind(adminApiClient),
    delete: adminApiClient.delete.bind(adminApiClient),
    patch: adminApiClient.patch.bind(adminApiClient),
    
    // Convenience methods for common admin operations
    
    // Validators
    getValidators: () => adminApiClient.get('/admin/validators'),
    createValidator: (data: any) => adminApiClient.post('/admin/validators', data),
    updateValidator: (id: string, data: any) => adminApiClient.put(`/admin/validators/${id}`, data),
    deleteValidator: (id: string) => adminApiClient.delete(`/admin/validators/${id}`),
    updateValidatorData: (id: string) => adminApiClient.post(`/admin/validators/${id}/update-data`),
    
    // Admin Management
    getAdmins: () => adminApiClient.get('/admin/admins'),
    createAdmin: (data: any) => adminApiClient.post('/admin/admins', data),
    updateAdmin: (id: string, data: any) => adminApiClient.put(`/admin/admins/${id}`, data),
    deleteAdmin: (id: string) => adminApiClient.delete(`/admin/admins/${id}`),
    toggleAdminStatus: (id: string) => adminApiClient.patch(`/admin/admins/${id}/toggle-status`),
    
    // Dashboard Stats
    getDashboardStats: () => adminApiClient.get('/admin/dashboard/stats'),
    
    // Activities
    getActivities: (page?: number, limit?: number) => {
      const params = new URLSearchParams();
      if (page) params.append('page', page.toString());
      if (limit) params.append('limit', limit.toString());
      const queryString = params.toString();
      return adminApiClient.get(`/admin/activities${queryString ? `?${queryString}` : ''}`);
    },
    exportActivities: () => adminApiClient.get('/admin/activities/export'),
    
    // Halal Screener
    getScreeners: (page?: number, limit?: number) => {
      const params = new URLSearchParams();
      if (page) params.append('page', page.toString());
      if (limit) params.append('limit', limit.toString());
      const queryString = params.toString();
      return adminApiClient.get(`/admin/halal-screener${queryString ? `?${queryString}` : ''}`);
    },
    createScreener: (data: any) => adminApiClient.post('/admin/halal-screener', data),
    updateScreener: (id: string, data: any) => adminApiClient.put(`/admin/halal-screener/${id}`, data),
    deleteScreener: (id: string) => adminApiClient.delete(`/admin/halal-screener/${id}`),
  };
};

export default useAdminApi;
