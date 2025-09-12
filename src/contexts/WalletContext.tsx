import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface WalletContextType {
  isConnected: boolean;
  keplrConnected: boolean;
  namadaConnected: boolean;
  keplrAddress: string | null;
  keplrName: string | null;
  keplrPublicKey: string | null;
  namadaAddress: string | null;
  namadaAlias: string | null;
  connectWallets: () => Promise<void>;
  disconnectWallet: () => void;
  isLoading: boolean;
  error: string | null;
  connectionRejected: boolean;
  namadaNotAvailable: boolean;
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
  const [keplrConnected, setKeplrConnected] = useState(false);
  const [namadaConnected, setNamadaConnected] = useState(false);
  const [keplrAddress, setKeplrAddress] = useState<string | null>(null);
  const [keplrName, setKeplrName] = useState<string | null>(null);
  const [keplrPublicKey, setKeplrPublicKey] = useState<string | null>(null);
  const [namadaAddress, setNamadaAddress] = useState<string | null>(null);
  const [namadaAlias, setNamadaAlias] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionRejected, setConnectionRejected] = useState(false);
  const [namadaNotAvailable, setNamadaNotAvailable] = useState(false);

  // Chain ID for Cosmos Hub (you can change this to your preferred chain)
  const chainId = 'cosmoshub-4';

  // Check if wallets are already connected on component mount
  useEffect(() => {
    const savedKeplrAddress = localStorage.getItem('keplrAddress');
    const savedKeplrName = localStorage.getItem('keplrName');
    const savedKeplrPublicKey = localStorage.getItem('keplrPublicKey');
    const savedNamadaAddress = localStorage.getItem('namadaAddress');
    const savedNamadaAlias = localStorage.getItem('namadaAlias');
    
    if (savedKeplrAddress && savedKeplrName) {
      setKeplrAddress(savedKeplrAddress);
      setKeplrName(savedKeplrName);
      setKeplrPublicKey(savedKeplrPublicKey);
      setKeplrConnected(true);
    }
    
    if (savedNamadaAddress) {
      setNamadaAddress(savedNamadaAddress);
      setNamadaAlias(savedNamadaAlias || 'Namada Account');
      setNamadaConnected(true);
    }
    
    if (savedKeplrAddress || savedNamadaAddress) {
      setIsConnected(true);
    }
  }, []);

  // Wallet change detection effect - using Keplr events instead of polling
  useEffect(() => {
    if (!isConnected || connectionRejected) return;

    const handleKeplrKeystoreChange = async () => {
      console.log("Keplr keystore change event detected in context");
      try {
        const keplrWindow = window;
        if (!keplrWindow.keplr) return;

        // Force re-enable to ensure we have permission for current wallet
        await keplrWindow.keplr.enable([chainId]);
        const key = await keplrWindow.keplr.getKey(chainId);
        const currentAddress = key.bech32Address;
        const currentName = key.name;

        // If wallet has changed, update the context
        if (currentAddress !== keplrAddress) {
          console.log("Wallet change confirmed via event in context, updating...");
          setKeplrAddress(currentAddress);
          setKeplrName(currentName);
          
          // Update localStorage
          localStorage.setItem('keplrAddress', currentAddress);
          localStorage.setItem('keplrName', currentName);
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
  }, [isConnected, keplrAddress, connectionRejected]);

  // Send wallet data to backend
  const sendWalletDataToBackend = async (keplrPubKey: string | null, namadaAddr: string | null) => {
    console.log('🌐 === Sending wallet data to backend ===');
    console.log('📦 Payload data:');
    console.log('  - Keplr Public Key:', keplrPubKey);
    console.log('  - Namada Address:', namadaAddr);

    if (!keplrPubKey) {
      console.warn('⚠️ No Keplr public key to send to backend');
      return;
    }

    try {
      const payload: { KeplrPublicAddress: string; namadaWalletAddress?: string } = {
        KeplrPublicAddress: keplrPubKey
      };

      // Only include namadaWalletAddress if it's available
      if (namadaAddr) {
        payload.namadaWalletAddress = namadaAddr;
      }

      console.log('📡 Making POST request to investor API...');
      console.log('📡 Full payload being sent:', JSON.stringify(payload, null, 2));
      
      const response = await fetch('http://localhost:3000/api/investors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response ok:', response.ok);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Backend response successful:', result);
        
        if (result.warning) {
          console.warn('⚠️ Backend warning:', result.warning);
        }
        
        if (result.data?.isNewInvestor) {
          console.log('🎉 New investor profile created!');
        } else {
          console.log('🔄 Existing investor profile updated');
        }
      } else {
        const errorResult = await response.json();
        console.error('❌ Backend response error:', response.status, response.statusText);
        console.error('❌ Error details:', errorResult);
        
        if (errorResult.errors) {
          errorResult.errors.forEach((error: any) => {
            console.error(`❌ ${error.field}: ${error.message}`);
          });
        }
      }
    } catch (error) {
      console.error('❌ Network error sending to backend:', error);
    }
  };

  const connectKeplr = async (): Promise<{ address: string; name: string; publicKey: string }> => {
    console.log('🔗 Starting Keplr connection...');
    
    try {
      const keplrWindow = window;
      
      if (!keplrWindow.keplr) {
        throw new Error('Keplr wallet is not installed. Please install Keplr extension.');
      }

      // Enable the chain
      await keplrWindow.keplr.enable([chainId]);

      // Get the wallet info
      const key = await keplrWindow.keplr.getKey(chainId);
      
      const address = key.bech32Address;
      const name = key.name;
      const publicKey = Array.from(key.pubKey).map(byte => byte.toString(16).padStart(2, '0')).join('');

      // Save to state
      setKeplrAddress(address);
      setKeplrName(name);
      setKeplrPublicKey(publicKey);
      setKeplrConnected(true);

      // Save to localStorage
      localStorage.setItem('keplrAddress', address);
      localStorage.setItem('keplrName', name);
      localStorage.setItem('keplrPublicKey', publicKey);

      console.log('✅ Keplr wallet connected successfully:', {
        address,
        name,
        publicKey: publicKey.substring(0, 20) + '...'
      });

      return { address, name, publicKey };
    } catch (error: any) {
      console.error('❌ Failed to connect Keplr wallet:', error);
      throw error;
    }
  };

  const connectNamada = async (): Promise<{ address: string; alias: string }> => {
    console.log('🔗 Starting Namada connection...');
    
    if (!window.namada) {
      console.warn('⚠️ Namada wallet extension not found. Please install Namada extension.');
      throw new Error('Namada wallet extension not installed');
    }

    try {
      // First call connect() to show the popup and get authorization
      if (typeof window.namada.connect === 'function') {
        console.log('🔗 Calling window.namada.connect() - this will show popup and wait...');
        await window.namada.connect();
        console.log('✅ Namada connect() completed - user responded to popup');
      }
      
      // Now get accounts - this should be quick since connect() handled authorization
      console.log('🔥 Now calling accounts() to get account list...');
      const accounts = await window.namada.accounts();
      console.log('🎯 Namada accounts() returned:', accounts);
        
      if (accounts && Array.isArray(accounts) && accounts.length > 0) {
        const account = accounts[0];
        console.log('✅ First Namada account:', account);
        
        if (account && account.address) {
          const address = account.address;
          const alias = account.alias || 'Namada Account';

          setNamadaAddress(address);
          setNamadaAlias(alias);
          setNamadaConnected(true);

          // Save to localStorage
          localStorage.setItem('namadaAddress', address);
          localStorage.setItem('namadaAlias', alias);

          console.log('✅ Namada wallet connected successfully:', {
            address,
            alias
          });

          return { address, alias };
        } else {
          throw new Error('No valid account data received from Namada');
        }
      } else {
        throw new Error('No accounts returned from Namada wallet');
      }
    } catch (error: any) {
      console.error('❌ Failed to connect Namada wallet:', error);
      throw error;
    }
  };

  const connectWallets = async (): Promise<void> => {
    console.log('🚀 ============ STARTING WALLET CONNECTION PROCESS ============');
    setIsLoading(true);
    setError(null);
    setConnectionRejected(false);
    setNamadaNotAvailable(false); // Reset flag

    try {
      // Step 1: Connect Keplr first
      console.log('📱 Step 1: Connecting Keplr wallet...');
      const keplrData = await connectKeplr();
      console.log('✅ Step 1 complete: Keplr connected');

      // Step 2: Check if Namada is available and connect
      console.log('📱 Step 2: Checking Namada availability...');
      if (!window.namada) {
        console.warn('⚠️ Namada wallet extension not found. Continuing with Keplr only.');
        setNamadaNotAvailable(true);
        
        // Step 3a: Send only Keplr data to backend
        console.log('📱 Step 3a: Sending only Keplr data to backend...');
        await sendWalletDataToBackend(keplrData.publicKey, null);
        console.log('✅ Step 3a complete: Backend request sent with Keplr only');
      } else {
        console.log('📱 Step 2: Connecting Namada wallet...');
        try {
          const namadaData = await connectNamada();
          console.log('✅ Step 2 complete: Namada connected');
          
          // Step 3b: Send data to backend with both wallets
          console.log('📱 Step 3b: Sending wallet data to backend...');
          await sendWalletDataToBackend(keplrData.publicKey, namadaData.address);
          console.log('✅ Step 3b complete: Backend request sent');
        } catch (namadaError: any) {
          console.error('❌ Failed to connect Namada:', namadaError);
          console.log('📱 Continuing with Keplr only...');
          setNamadaNotAvailable(true);
          
          // Step 3c: Send only Keplr data to backend
          console.log('📱 Step 3c: Sending only Keplr data to backend...');
          await sendWalletDataToBackend(keplrData.publicKey, null);
          console.log('✅ Step 3c complete: Backend request sent with Keplr only');
        }
      }

      // Mark as connected (either with both wallets or just Keplr)
      setIsConnected(true);
      console.log('🎉 ============ WALLET CONNECTION PROCESS COMPLETE ============');

    } catch (err: any) {
      console.error('❌ Failed to connect wallets:', err);
      
      if (err.message && (err.message.includes('Request rejected') || err.message.includes('User rejected'))) {
        setConnectionRejected(true);
        setError('Wallet connection was rejected by user');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to connect wallets');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWallet = (): void => {
    // Clear all wallet states
    setKeplrAddress(null);
    setKeplrName(null);
    setKeplrPublicKey(null);
    setKeplrConnected(false);
    setNamadaAddress(null);
    setNamadaAlias(null);
    setNamadaConnected(false);
    setIsConnected(false);
    setError(null);
    setConnectionRejected(false);
    setNamadaNotAvailable(false);

    // Clear localStorage
    localStorage.removeItem('keplrAddress');
    localStorage.removeItem('keplrName');
    localStorage.removeItem('keplrPublicKey');
    localStorage.removeItem('namadaAddress');
    localStorage.removeItem('namadaAlias');
  };

  const value: WalletContextType = {
    isConnected,
    keplrConnected,
    namadaConnected,
    keplrAddress,
    keplrName,
    keplrPublicKey,
    namadaAddress,
    namadaAlias,
    connectWallets,
    disconnectWallet,
    isLoading,
    error,
    connectionRejected,
    namadaNotAvailable,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};
