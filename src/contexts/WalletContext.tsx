import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Keplr wallet types
interface KeplrWindow extends Window {
  keplr?: {
    enable: (chainIds: string[]) => Promise<void>;
    getOfflineSigner: (chainId: string) => any;
    getKey: (chainId: string) => Promise<{
      name: string;
      algo: string;
      pubKey: Uint8Array;
      address: Uint8Array;
      bech32Address: string;
      isNanoLedger: boolean;
    }>;
    experimentalSuggestChain: (chainInfo: any) => Promise<void>;
  };
}

interface WalletContextType {
  isConnected: boolean;
  walletAddress: string | null;
  walletName: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  isLoading: boolean;
  error: string | null;
  connectionRejected: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionRejected, setConnectionRejected] = useState(false);

  // Chain ID for Cosmos Hub (you can change this to your preferred chain)
  const chainId = 'cosmoshub-4';

  // Check if wallet is already connected on component mount
  useEffect(() => {
    const savedAddress = localStorage.getItem('walletAddress');
    const savedName = localStorage.getItem('walletName');
    
    if (savedAddress && savedName) {
      setWalletAddress(savedAddress);
      setWalletName(savedName);
      setIsConnected(true);
    }
  }, []);

  // Wallet change detection effect - using Keplr events instead of polling
  useEffect(() => {
    if (!isConnected || connectionRejected) return;

    const handleKeplrKeystoreChange = async () => {
      console.log("Keplr keystore change event detected in context");
      try {
        const keplrWindow = window as KeplrWindow;
        if (!keplrWindow.keplr) return;

        // Force re-enable to ensure we have permission for current wallet
        await keplrWindow.keplr.enable([chainId]);
        const key = await keplrWindow.keplr.getKey(chainId);
        const currentAddress = key.bech32Address;
        const currentName = key.name;

        // If wallet has changed, update the context
        if (currentAddress !== walletAddress) {
          console.log("Wallet change confirmed via event in context, updating...");
          setWalletAddress(currentAddress);
          setWalletName(currentName);
          
          // Update localStorage
          localStorage.setItem('walletAddress', currentAddress);
          localStorage.setItem('walletName', currentName);
        }
      } catch (e: any) {
        // Check if user rejected the connection
        if (e.message && (e.message.includes('Request rejected') || e.message.includes('User rejected'))) {
          console.log("User rejected wallet connection, stopping attempts...");
          setConnectionRejected(true);
          disconnectWallet();
          return;
        }
        console.warn("Error handling Keplr keystore change in context:", e);
      }
    };

    // Listen for Keplr's keystore change events
    window.addEventListener("keplr_keystorechange", handleKeplrKeystoreChange);

    return () => {
      window.removeEventListener("keplr_keystorechange", handleKeplrKeystoreChange);
    };
  }, [isConnected, walletAddress, connectionRejected]);

  const connectWallet = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    setConnectionRejected(false); // Reset rejection state on new attempt

    try {
      const keplrWindow = window as KeplrWindow;
      
      if (!keplrWindow.keplr) {
        throw new Error('Keplr wallet is not installed. Please install Keplr extension.');
      }

      // Enable the chain
      await keplrWindow.keplr.enable([chainId]);

      // Get the wallet info
      const key = await keplrWindow.keplr.getKey(chainId);
      
      const address = key.bech32Address;
      const name = key.name;

      // Save to state
      setWalletAddress(address);
      setWalletName(name);
      setIsConnected(true);

      // Save to localStorage for persistence
      localStorage.setItem('walletAddress', address);
      localStorage.setItem('walletName', name);

    } catch (err: any) {
      console.error('Failed to connect wallet:', err);
      
      // Check if user rejected the connection
      if (err.message && (err.message.includes('Request rejected') || err.message.includes('User rejected'))) {
        setConnectionRejected(true);
        setError('Wallet connection was rejected by user');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to connect wallet');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWallet = (): void => {
    setWalletAddress(null);
    setWalletName(null);
    setIsConnected(false);
    setError(null);
    setConnectionRejected(false); // Reset rejection state on disconnect

    // Clear localStorage
    localStorage.removeItem('walletAddress');
    localStorage.removeItem('walletName');
  };

  const value: WalletContextType = {
    isConnected,
    walletAddress,
    walletName,
    connectWallet,
    disconnectWallet,
    isLoading,
    error,
    connectionRejected,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};
