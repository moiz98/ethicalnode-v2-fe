import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
      setWalletAddress(address);

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
      setIsAuthenticated(true);

    } catch (err) {
      console.error('Admin authentication failed:', err);
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setIsLoading(false);
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

  const value: AdminAuthContextType = {
    isAuthenticated,
    adminUser,
    walletAddress,
    isLoading,
    isInitialized,
    error,
    connectAndAuth,
    logout,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};
