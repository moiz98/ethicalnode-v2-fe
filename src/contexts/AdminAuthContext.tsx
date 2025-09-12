import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { adminApiClient } from '../utils/adminApiClient';

// Toast notifications for user feedback
let showTokenExpiredToast: (() => void) | null = null;
let showReAuthSuccessToast: (() => void) | null = null;
let showReAuthFailedToast: (() => void) | null = null;

// Function to set toast handlers from ToastContext
export const setToastHandlers = (handlers: {
  showTokenExpiredToast: () => void;
  showReAuthSuccessToast: () => void;
  showReAuthFailedToast: () => void;
}) => {
  showTokenExpiredToast = handlers.showTokenExpiredToast;
  showReAuthSuccessToast = handlers.showReAuthSuccessToast;
  showReAuthFailedToast = handlers.showReAuthFailedToast;
};

interface AdminUser {
  id: string;
  walletAddress: string;
  name: string | null;
  email: string | null;
  permissions: string[];
  isPrimaryAdmin: boolean;
  isActive: boolean;
  lastLogin: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface AdminAuthContextType {
  isAuthenticated: boolean;
  adminUser: AdminUser | null;
  walletAddress: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  connectAndAuth: () => Promise<void>;
  reAuthenticate: () => Promise<void>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const useAdminAuth = (): AdminAuthContextType => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};

interface AdminAuthProviderProps {
  children: ReactNode;
}

export const AdminAuthProvider: React.FC<AdminAuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chainId = 'cosmoshub-4';

  const performAuthentication = async (address: string): Promise<void> => {
    // Create message in required format
    const timestamp = new Date().toISOString();
    const nonce = Math.random().toString(36).substr(2, 9);
    const message = `Login to EthicalNode v2 Admin Panel\n\nWallet: ${address}\nTimestamp: ${timestamp}\nNonce: ${nonce}`;

    // Sign the message
    const signatureResult = await (window.keplr as any).signArbitrary(chainId, address, message);

    // Extract base64 public key
    let publicKey = '';
    if (signatureResult.pub_key?.value) {
      publicKey = signatureResult.pub_key.value;
    } else if (signatureResult.pub_key) {
      publicKey = signatureResult.pub_key;
    }

    // Send to backend for verification
    const response = await fetch('http://localhost:3000/api/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: address,
        signature: signatureResult.signature,
        message,
        publicKey,
      }),
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Authentication failed');
    }

    // Store session data
    localStorage.setItem('adminToken', result.data.token);
    localStorage.setItem('adminUser', JSON.stringify(result.data.admin));

    setAdminUser(result.data.admin);
    setWalletAddress(result.data.admin.walletAddress);
    setIsAuthenticated(true);
  };

  const reAuthenticate = async (): Promise<void> => {
    console.log('🔄 Token expired, requesting re-authentication...');
    
    // Show user notification
    if (showTokenExpiredToast) {
      showTokenExpiredToast();
    }
    
    try {
      if (!window.keplr) {
        throw new Error('Keplr wallet is not installed');
      }

      // Use existing wallet address if available
      let address = walletAddress;
      
      if (!address) {
        // If no address stored, get it from Keplr
        await window.keplr.enable([chainId]);
        const key = await window.keplr.getKey(chainId);
        address = key.bech32Address;
      }

      if (!address) {
        throw new Error('Unable to get wallet address');
      }

      await performAuthentication(address);
      console.log('✅ Re-authentication successful');
      
      // Show success notification
      if (showReAuthSuccessToast) {
        showReAuthSuccessToast();
      }

    } catch (err) {
      console.error('❌ Re-authentication failed:', err);
      
      // Show failure notification
      if (showReAuthFailedToast) {
        showReAuthFailedToast();
      }
      
      // If re-auth fails, logout the user
      logout();
      throw err;
    }
  };

  const logout = (): void => {
    setIsAuthenticated(false);
    setAdminUser(null);
    setWalletAddress(null);
    setError(null);

    // Clear stored session
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
  };

  // Check for existing session on mount
  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    const adminUserData = localStorage.getItem('adminUser');
    
    if (adminToken && adminUserData) {
      try {
        const user = JSON.parse(adminUserData);
        setAdminUser(user);
        setWalletAddress(user.walletAddress);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error parsing stored admin user:', error);
        logout();
      }
    }
    
    setIsInitialized(true);
  }, []);

  // Set up API client token expiration handler
  useEffect(() => {
    adminApiClient.setTokenExpiredHandler(reAuthenticate);
  }, [reAuthenticate]);

  const connectAndAuth = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      if (!window.keplr) {
        throw new Error('Keplr wallet is not installed. Please install Keplr extension.');
      }

      // Enable the chain
      await window.keplr.enable([chainId]);

      // Get the wallet info
      const key = await window.keplr.getKey(chainId);
      const address = key.bech32Address;

      await performAuthentication(address);

    } catch (err) {
      console.error('Admin authentication failed:', err);
      setError(err instanceof Error ? err.message : 'Authentication failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const value: AdminAuthContextType = {
    isAuthenticated,
    adminUser,
    walletAddress,
    isLoading,
    isInitialized,
    error,
    connectAndAuth,
    reAuthenticate,
    logout,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};
