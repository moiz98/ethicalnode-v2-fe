import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { useWallet } from '../../contexts/WalletContext';

const ALLOWED_CHAIN_IDS = ["cosmoshub-4", "fetchhub-4", "akashnet-2", "agoric-3"];

const allowedChains = [
  { chain_id: "cosmoshub-4", chain_name: "Cosmos Hub", bech32_prefix: "cosmos" },
  { chain_id: "fetchhub-4", chain_name: "Fetch.AI", bech32_prefix: "fetch" },
  { chain_id: "akashnet-2", chain_name: "Akash Network", bech32_prefix: "akash" },
  { chain_id: "agoric-3", chain_name: "Agoric", bech32_prefix: "agoric" },
];

interface ChainKeyInfo {
  chain_name: string;
  bech32_prefix: string;
  bech32Address: string;
  pubKey: Uint8Array;
}

const InvestorPortfolio: React.FC = () => {
  const { isDarkMode } = useTheme();
  const { isConnected, walletAddress } = useWallet();
  const [chainKeys, setChainKeys] = useState<Record<string, ChainKeyInfo>>({});
  const [walletFp, setWalletFp] = useState<string>("");
  const [keplrError, setKeplrError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [lastCheckedWallet, setLastCheckedWallet] = useState<string>("");
  const [connectionRejected, setConnectionRejected] = useState<boolean>(false);

  const bytesToHex = (bytes: Uint8Array): string => {
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const ensureKeplr = async () => {
    if (!window.keplr) {
      throw new Error("Keplr wallet not found. Please install Keplr extension.");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const forceRefresh = async () => {
    console.log("Manual refresh triggered...");
    setLastCheckedWallet(""); // Reset to force refresh
    await approveAndFetchAll();
  };

  const approveAndFetchAll = async () => {
    setKeplrError("");
    setLoading(true);
    setConnectionRejected(false); // Reset rejection state
    try {
      await ensureKeplr();
      if (!window.keplr) {
        throw new Error("Keplr wallet not available");
      }
      
      await window.keplr.enable(ALLOWED_CHAIN_IDS);
      const next: Record<string, ChainKeyInfo> = {};
      for (const id of ALLOWED_CHAIN_IDS) {
        try {
          const key = await window.keplr.getKey(id);
          const meta = allowedChains.find((c) => c.chain_id === id);
          if (!meta) continue;
          next[id] = {
            chain_name: meta.chain_name,
            bech32_prefix: meta.bech32_prefix,
            bech32Address: key.bech32Address || "",
            pubKey: key.pubKey,
          };
        } catch (_) {}
      }
      setChainKeys(next);
      const idsWithKeys = Object.keys(next);
      if (idsWithKeys.length > 0) {
        const pref = idsWithKeys.includes("cosmoshub-4") ? "cosmoshub-4" : idsWithKeys[0];
        const pk = next[pref]?.pubKey;
        if (pk) {
          const currentWalletFp = bytesToHex(pk);
          setWalletFp(currentWalletFp);
          setLastCheckedWallet(currentWalletFp);
        }
      }
    } catch (e: any) {
      // Check if user rejected the connection
      if (e.message && (e.message.includes('Request rejected') || e.message.includes('User rejected'))) {
        setConnectionRejected(true);
        setKeplrError("Wallet connection was rejected by user");
      } else {
        setKeplrError(String(e?.message || e));
      }
    } finally {
      setLoading(false);
    }
  };

  const checkForWalletChanges = async () => {
    try {
      if (!window.keplr || !isConnected || connectionRejected) return;
      
      // Check if Keplr is still available and get current key without re-enabling first
      let currentKey;
      try {
        currentKey = await window.keplr.getKey("cosmoshub-4");
      } catch (keyError) {
        // If getKey fails, try re-enabling
        console.log("Re-enabling Keplr due to key access error...");
        await window.keplr.enable(ALLOWED_CHAIN_IDS);
        currentKey = await window.keplr.getKey("cosmoshub-4");
      }
      
      const currentWalletFp = bytesToHex(currentKey.pubKey);
      console.log(`Wallet check - Current: ${currentWalletFp.slice(0, 16)}..., Last: ${lastCheckedWallet.slice(0, 16)}...`);
      
      // If wallet has changed, refresh all data
      if (currentWalletFp !== lastCheckedWallet && lastCheckedWallet !== "") {
        console.log("Wallet change detected, refreshing data...");
        setLastCheckedWallet(currentWalletFp); // Update immediately to prevent multiple calls
        await approveAndFetchAll();
      } else if (lastCheckedWallet === "") {
        console.log("Setting initial wallet fingerprint...");
        setLastCheckedWallet(currentWalletFp);
      }
    } catch (e: any) {
      // Check if user rejected the connection
      if (e.message && (e.message.includes('Request rejected') || e.message.includes('User rejected'))) {
        console.log("User rejected wallet connection, stopping checks...");
        setConnectionRejected(true);
        return;
      }
      // Silently handle other errors in background checks
      console.warn("Error checking for wallet changes:", e);
    }
  };

  // Wallet change detection effect - using Keplr events instead of polling
  useEffect(() => {
    if (!isConnected || connectionRejected) return;

    const handleKeplrKeystoreChange = async () => {
      console.log("Keplr keystore change event detected in Portfolio");
      try {
        if (!window.keplr) return;
        
        // Always refresh all wallet data when keystore changes
        console.log("Refreshing portfolio data due to wallet change...");
        setLastCheckedWallet(""); // Reset to force refresh
        await approveAndFetchAll();
      } catch (e: any) {
        console.warn("Error handling Keplr keystore change in Portfolio:", e);
        if (e.message && (e.message.includes('Request rejected') || e.message.includes('User rejected'))) {
          setConnectionRejected(true);
        }
      }
    };

    // Listen for Keplr's keystore change events
    window.addEventListener("keplr_keystorechange", handleKeplrKeystoreChange);

    // Initial check when component mounts
    const initialCheck = async () => {
      try {
        await checkForWalletChanges();
      } catch (e) {
        console.warn("Error in initial wallet check:", e);
      }
    };
    initialCheck();

    return () => {
      window.removeEventListener("keplr_keystorechange", handleKeplrKeystoreChange);
    };
  }, [isConnected, connectionRejected]);

  // Watch for wallet address changes from WalletContext
  useEffect(() => {
    if (isConnected && walletAddress) {
      console.log("WalletContext address changed, refreshing Portfolio data...");
      setLastCheckedWallet(""); // Reset to force refresh
      approveAndFetchAll();
    }
  }, [walletAddress]);

  useEffect(() => {
    if (isConnected) {
      approveAndFetchAll();
    }
  }, [isConnected]);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-3xl font-bold mb-2 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Investor Dashboard
            </h1>
            <p className={`text-lg ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Your connected wallet information.
            </p>
          </div>
          <button
            onClick={forceRefresh}
            disabled={loading}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isDarkMode
                ? 'bg-teal-600 hover:bg-teal-700 text-white disabled:bg-gray-600'
                : 'bg-teal-600 hover:bg-teal-700 text-white disabled:bg-gray-400'
            } disabled:cursor-not-allowed`}
          >
            {loading ? 'Refreshing...' : 'Refresh Wallet'}
          </button>
        </div>
      </motion.div>

      {/* Wallet Information Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className={`p-8 rounded-xl border ${
          isDarkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        } shadow-lg`}
      >
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <div className={`p-4 rounded-lg ${
              isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
            }`}>
              <svg className={`w-8 h-8 ${
                isDarkMode ? 'text-teal-400' : 'text-teal-600'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h2 className={`text-2xl font-bold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Connected Wallet
              </h2>
              <p className={`text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Cosmos Network Wallet
              </p>
            </div>
          </div>

          <div className="grid gap-6">
            {/* Public Key - Hex Format */}
            <div className={`p-4 rounded-lg border ${
              isDarkMode 
                ? 'bg-gray-700 border-gray-600' 
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <label className={`block text-sm font-medium mb-1 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Public Key (Hex)
                  </label>
                  <p className={`text-lg font-mono break-all ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {walletFp || 'Not Connected'}
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(walletFp || '')}
                  className={`ml-4 p-2 rounded-lg transition-colors ${
                    isDarkMode 
                      ? 'hover:bg-gray-600 text-gray-400 hover:text-white' 
                      : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'
                  }`}
                  title="Copy public key (hex)"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Chain Addresses */}
            {Object.entries(chainKeys).map(([chainId, chainInfo]) => (
              <div key={chainId} className={`p-4 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600' 
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <label className={`block text-sm font-medium mb-1 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {chainInfo.chain_name} ({chainInfo.bech32_prefix})
                    </label>
                    <p className={`text-lg font-mono break-all ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {chainInfo.bech32Address}
                    </p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(chainInfo.bech32Address)}
                    className={`ml-4 p-2 rounded-lg transition-colors ${
                      isDarkMode 
                        ? 'hover:bg-gray-600 text-gray-400 hover:text-white' 
                        : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'
                    }`}
                    title={`Copy ${chainInfo.chain_name} address`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>
            ))}

            {/* Loading State */}
            {loading && (
              <div className={`p-4 rounded-lg border text-center ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600' 
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <p className={`text-lg ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Loading chain information...
                </p>
              </div>
            )}

            {/* Error State */}
            {keplrError && (
              <div className={`p-4 rounded-lg border ${
                isDarkMode 
                  ? 'bg-red-900 border-red-700' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <p className={`text-lg ${
                  isDarkMode ? 'text-red-300' : 'text-red-700'
                }`}>
                  Error: {keplrError}
                </p>
              </div>
            )}

            {/* Not Connected State */}
            {!isConnected && !loading && (
              <div className={`p-4 rounded-lg border text-center ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600' 
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <p className={`text-lg ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Please connect your wallet to view chain information.
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default InvestorPortfolio;
