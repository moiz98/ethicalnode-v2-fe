interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
}

class AdminApiClient {
  private baseUrl: string;
  private onTokenExpired?: () => Promise<void>;

  constructor(baseUrl: string = 'http://localhost:3000/api') {
    this.baseUrl = baseUrl;
  }

  // Set the callback for when token expires
  setTokenExpiredHandler(handler: () => Promise<void>) {
    this.onTokenExpired = handler;
  }

  // Get the current token from localStorage
  private getToken(): string | null {
    return localStorage.getItem('adminToken');
  }

  // Check if error indicates token expiration
  private isTokenExpiredError(status: number, message?: string): boolean {
    return (
      status === 401 || 
      status === 403 ||
      !!(message && (
        message.toLowerCase().includes('token expired') ||
        message.toLowerCase().includes('invalid token') ||
        message.toLowerCase().includes('unauthorized') ||
        message.toLowerCase().includes('jwt expired')
      ))
    );
  }

  // Make API request with automatic token handling
  async request<T = any>(endpoint: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    const token = this.getToken();
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...config.headers,
    };

    try {
      const response = await fetch(url, {
        method: config.method || 'GET',
        headers,
        body: config.body ? JSON.stringify(config.body) : undefined,
      });

      const result: ApiResponse<T> = await response.json();

      // Check for token expiration
      if (!response.ok && this.isTokenExpiredError(response.status, result.message)) {
        console.warn('Admin token has expired, triggering re-authentication...');
        
        if (this.onTokenExpired) {
          try {
            await this.onTokenExpired();
            // After successful re-auth, retry the original request
            return this.request<T>(endpoint, config);
          } catch (reAuthError) {
            console.error('Re-authentication failed:', reAuthError);
            throw new Error('Session expired. Please log in again.');
          }
        } else {
          throw new Error('Session expired. Please log in again.');
        }
      }

      if (!response.ok) {
        throw new Error(result.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error or unexpected response format');
    }
  }

  // Convenience methods
  async get<T = any>(endpoint: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET', headers });
  }

  async post<T = any>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'POST', body, headers });
  }

  async put<T = any>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PUT', body, headers });
  }

  async delete<T = any>(endpoint: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE', headers });
  }

  async patch<T = any>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PATCH', body, headers });
  }
}

// Create singleton instance
export const adminApiClient = new AdminApiClient();

export default adminApiClient;
