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
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<void> | null = null;

  constructor(baseUrl: string = 'http://localhost:3000/api') {
    this.baseUrl = baseUrl;
  }

  // Set the callback for when token expires
  setTokenExpiredHandler(handler: () => Promise<void>) {
    this.onTokenExpired = handler;
  }

  // Reset refresh state (useful for testing or manual reset)
  resetRefreshState() {
    this.isRefreshing = false;
    this.refreshPromise = null;
  }

  // Get the current token from localStorage
  private getToken(): string | null {
    return localStorage.getItem('adminToken');
  }

  // Check if error indicates token expiration
  private isTokenExpiredError(status: number, message?: string): boolean {
    // 401 is always unauthorized/token expired
    if (status === 401) {
      return true;
    }
    
    // 403 can be either token expiration or insufficient permissions
    // Only treat as token expiration if message specifically indicates token issues
    if (status === 403 && message) {
      const lowerMessage = message.toLowerCase();
      return (
        lowerMessage.includes('token expired') ||
        lowerMessage.includes('invalid token') ||
        lowerMessage.includes('jwt expired') ||
        lowerMessage.includes('token is invalid') ||
        lowerMessage.includes('session expired')
      );
    }
    
    // Check message-based token expiration indicators
    if (message) {
      const lowerMessage = message.toLowerCase();
      return (
        lowerMessage.includes('token expired') ||
        lowerMessage.includes('invalid token') ||
        lowerMessage.includes('unauthorized') ||
        lowerMessage.includes('jwt expired') ||
        lowerMessage.includes('token is invalid') ||
        lowerMessage.includes('session expired')
      );
    }
    
    return false;
  }

  // Handle token refresh with concurrency control
  private async handleTokenRefresh(): Promise<void> {
    // If already refreshing, wait for the existing refresh to complete
    if (this.isRefreshing && this.refreshPromise) {
      console.log('Token refresh already in progress, waiting...');
      return this.refreshPromise;
    }

    // Start new refresh process
    this.isRefreshing = true;
    this.refreshPromise = this.performTokenRefresh();
    
    try {
      await this.refreshPromise;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  // Perform the actual token refresh
  private async performTokenRefresh(): Promise<void> {
    console.log('Starting token refresh...');
    
    if (this.onTokenExpired) {
      try {
        await this.onTokenExpired();
        console.log('Token refresh completed successfully');
      } catch (reAuthError) {
        console.error('Re-authentication failed:', reAuthError);
        throw new Error('Session expired. Please log in again.');
      }
    } else {
      throw new Error('Session expired. Please log in again.');
    }
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
        console.log('Status:', response.status, 'Message:', result.message);
        
        try {
          // Use centralized token refresh handling
          await this.handleTokenRefresh();
          
          // After successful re-auth, retry the original request
          console.log('Retrying original request after token refresh...');
          return this.request<T>(endpoint, config);
        } catch (reAuthError) {
          console.error('Token refresh failed:', reAuthError);
          throw reAuthError;
        }
      }

      if (!response.ok) {
        // Log the error for debugging, but don't treat as token expiration
        console.log('API Error - Status:', response.status, 'Message:', result.message);
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
