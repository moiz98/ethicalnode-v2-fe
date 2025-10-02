import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, X, ExternalLink, CheckCircle, XCircle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useWallet } from '../../contexts/WalletContext';
import { assetLists, chains } from 'chain-registry';
import { Decimal } from '@cosmjs/math';
import { useToast } from '../../components/common/ToastProvider';
import { NamadaWalletManager } from '../../utils/namada';

interface Validator {
  _id: string;
  chainId: string;
  chainName: string;
  prettyName: string;
  validatorAddress: string;
  defaultReferralReward: number;
  validatorName: string;
  validatorCommission: number;
  validatorAPR: number;
  validatorPower: number;
  validatorUnbondingPeriod: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Transaction Result Modal Component
interface TransactionResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  success: boolean;
  txHash?: string;
  chainName?: string;
  amount?: string;
  tokenSymbol?: string;
  validatorName?: string;
  errorMessage?: string;
}

const TransactionResultModal: React.FC<TransactionResultModalProps> = ({
  isOpen,
  onClose,
  success,
  txHash,
  chainName,
  amount,
  tokenSymbol,
  validatorName,
  errorMessage
}) => {
  const { isDarkMode } = useTheme();
  const [copied, setCopied] = useState(false);

  const copyTxHash = () => {
    if (txHash) {
      navigator.clipboard.writeText(txHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getExplorerUrl = (txHash: string, chainName: string) => {
    // Map chain names to explorer URLs
    const explorerUrls: { [key: string]: string } = {
      'Cosmos Hub': `https://www.mintscan.io/cosmos/txs/${txHash}`,
      'Akash Network': `https://www.mintscan.io/akash/txs/${txHash}`,
      'Fetch.ai': `https://www.mintscan.io/fetchai/txs/${txHash}`,
      'Osmosis': `https://www.mintscan.io/osmosis/txs/${txHash}`,
      // Add more chains as needed
    };
    
    return explorerUrls[chainName] || `https://www.mintscan.io/cosmos/txs/${txHash}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <motion.div
          className="fixed inset-0 bg-opacity-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />
        <motion.div
          className={`relative z-50 w-full max-w-md mx-4 rounded-lg shadow-xl ${
            isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
          }`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              {success ? (
                <CheckCircle className="w-8 h-8 text-green-500" />
              ) : (
                <XCircle className="w-8 h-8 text-red-500" />
              )}
              <h2 className="text-xl font-semibold">
                {success ? 'Transaction Successful!' : 'Transaction Failed'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg hover:${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} transition-colors`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {success ? (
              <>
                <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
                  <p className={`text-sm ${isDarkMode ? 'text-green-400' : 'text-green-800'}`}>
                    Successfully staked <strong>{amount} {tokenSymbol}</strong> to validator <strong>{validatorName}</strong> on {chainName}
                  </p>
                </div>

                {txHash && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium opacity-70">Transaction Hash:</label>
                    <div className={`flex items-center gap-2 p-3 rounded-lg border ${
                      isDarkMode ? 'border-gray-700 bg-gray-700/50' : 'border-gray-200 bg-gray-50'
                    }`}>
                      <code className="flex-1 text-sm font-mono break-all">
                        {txHash}
                      </code>
                      <button
                        onClick={copyTxHash}
                        className={`p-2 rounded-lg hover:${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'} transition-colors`}
                        title="Copy transaction hash"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {txHash && chainName && (
                  <div className="pt-2">
                    <a
                      href={getExplorerUrl(txHash, chainName)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isDarkMode 
                          ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                          : 'bg-blue-500 hover:bg-blue-600 text-white'
                      }`}
                    >
                      View in Explorer
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                )}
              </>
            ) : (
              <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-red-900/30' : 'bg-red-50'}`}>
                <p className={`text-sm ${isDarkMode ? 'text-red-400' : 'text-red-800'}`}>
                  {errorMessage || 'An error occurred while processing your transaction. Please try again.'}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isDarkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
              }`}
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  validator: Validator | null;
  action: 'stake';
  onConfirm: (amount: string) => void;
}

const ActionModal: React.FC<ActionModalProps> = ({
  isOpen,
  onClose,
  validator,
  action,
  onConfirm
}) => {
  const { isDarkMode } = useTheme();
  const { isConnected } = useWallet();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [availableBalance, setAvailableBalance] = useState<string>('0');

  // Function to get available balance from backend API
  const getAvailableBalance = async (chainName: string, chainId: string) => {
    console.log('=== Starting balance fetch ===');
    console.log('Chain Name:', chainName, 'Chain ID:', chainId);
    
    try {
      // Check if it's a Namada chain
      if (chainName.toLowerCase().includes('namada') || chainId.includes('namada')) {
        console.log('Detected Namada chain');
        
        // Get Namada wallet address
        if (window.namada) {
          try {
            const accounts = await window.namada.accounts();
            if (accounts && accounts.length > 0) {
              const walletAddress = accounts[0].address;
              console.log('Namada wallet address:', walletAddress);
              
              // Call backend API for Namada balance directly
              const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/investors/getNamadaBalance/${walletAddress}`);
              
              if (response.ok) {
                const result = await response.json();
                console.log('Namada backend API response:', result);
                
                if (result.success && result.data?.balance) {
                  const balance = result.data.balance.amount;
                  // Convert from namnam to NAM (1 NAM = 1,000,000 namnam)
                  const displayBalance = (parseFloat(balance) / 1000000).toFixed(6);
                  console.log('Namada balance found:', displayBalance, 'NAM');
                  return displayBalance;
                } else {
                  console.warn('No balance data in backend response');
                  return '0';
                }
              } else {
                console.error('Backend API response not ok:', response.status);
                const errorText = await response.text();
                console.error('Backend error:', errorText);
                return '0';
              }
            }
          } catch (error) {
            console.error('Failed to fetch Namada balance from backend:', error);
            return '0';
          }
        } else {
          console.warn('Namada wallet not available');
          return '0';
        }
      } else {
        console.log('Processing Cosmos chain with backend API');
        
        // Get Keplr wallet address
        const keplrWindow = window as any;
        if (keplrWindow.keplr) {
          try {
            console.log('Keplr wallet detected, enabling chain...');
            await keplrWindow.keplr.enable([chainId]);
            console.log('Chain enabled successfully');
            
            const key = await keplrWindow.keplr.getKey(chainId);
            const walletAddress = key.bech32Address;
            console.log('Keplr wallet address:', walletAddress);
            
            // Call backend API for Cosmos balance
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/investors/getCosmosBalance/${chainId}/${walletAddress}`);
            
            if (response.ok) {
              const result = await response.json();
              console.log('Cosmos backend API response:', result);
              
              if (result.success && result.data?.balance) {
                const balance = result.data.balance.amount;
                
                // Get chain registry data for decimal conversion
                const chainRegistryData = assetLists.find(a => a.chainName === chainName);
                if (chainRegistryData && chainRegistryData.assets.length > 0) {
                  const stakeCurrency = chainRegistryData.assets[0];
                  const exponent = stakeCurrency.denomUnits?.find(unit => unit.denom === stakeCurrency.display)?.exponent || 6;
                  
                  const displayBalance = (parseFloat(balance) / Math.pow(10, exponent)).toFixed(6);
                  console.log('Cosmos balance found:', displayBalance);
                  return displayBalance;
                }
              }
            } else {
              console.error('Cosmos backend API response not ok:', response.status);
            }
            
          } catch (error) {
            console.error('Failed to fetch Cosmos balance from backend:', error);
            return '0';
          }
        } else {
          console.warn('Keplr wallet not available');
          return '0';
        }
      }
      
      return '0';
    } catch (error) {
      console.error('Error fetching balance:', error);
      return '0';
    }
  };

  // Fetch available balance when modal opens for stake action
  useEffect(() => {
    if (isOpen && action === 'stake' && validator && isConnected) {
      getAvailableBalance(validator.chainName, validator.chainId)
        .then(balance => setAvailableBalance(balance))
        .catch(err => {
          console.error('Failed to fetch balance:', err);
          setAvailableBalance('0');
        });
    } else {
      setAvailableBalance('0');
    }
  }, [isOpen, action, validator, isConnected]);

  const handleMaxClick = () => {
    setAmount(availableBalance);
  };

  const handleSubmit = async () => {
    if (!amount) return;
    
    setLoading(true);
    try {
      await onConfirm(amount);
      onClose();
    } catch (error) {
      console.error('Stake action failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = () => {
    return 'bg-green-600 hover:bg-green-700';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-opacity-50"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            className={`relative z-10 w-full max-w-md mx-4 p-6 rounded-lg shadow-xl ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
          >
            {/* Header with Chain Logo */}
            <div className="flex items-center gap-3 mb-4">
              {(() => {
                const chainData = getChainData(validator?.chainName || '');
                return chainData.logoUrl ? (
                  <img 
                    src={chainData.logoUrl} 
                    alt={`${validator?.prettyName || validator?.chainName} logo`}
                    className="w-10 h-10 rounded-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) {
                        fallback.classList.remove('hidden');
                      }
                    }}
                  />
                ) : null;
              })()}
              {/* Fallback chain logo */}
              <div className={`w-10 h-10 rounded-full ${
                isDarkMode ? "bg-gray-700" : "bg-gray-100"
              } flex items-center justify-center text-sm font-bold ${
                isDarkMode ? "text-white" : "text-gray-900"
              } ${getChainData(validator?.chainName || '').logoUrl ? 'hidden' : ''}`}>
                {(validator?.prettyName || validator?.chainName || 'CH').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className={`text-xl font-bold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {action.charAt(0).toUpperCase() + action.slice(1)} {validator?.validatorName}
                </h3>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {validator?.prettyName || validator?.chainName}
                </p>
              </div>
            </div>
            
            <div className={`mb-4 p-3 rounded-lg ${
              isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
            }`}>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Chain: {validator?.prettyName || validator?.chainName}
              </p>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                APR: {validator?.validatorAPR ? `${validator.validatorAPR.toFixed(2)}%` : 'N/A'}
              </p>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Commission: {validator?.validatorCommission ? `${(validator.validatorCommission * 100).toFixed(1)}%` : 'N/A'}
              </p>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Referral Reward: {validator?.defaultReferralReward ? `${validator.defaultReferralReward.toFixed(2)}%` : 'N/A'}
              </p>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Unbonding Period: {validator?.validatorUnbondingPeriod || 'N/A'}
              </p>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className={`block text-sm font-medium ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Amount to Stake
                </label>
                {isConnected && (
                  <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Available: {availableBalance} {getChainData(validator?.chainName || '').chainSymbol || 'tokens'}
                  </div>
                )}
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount to stake"
                  className={`w-full px-3 py-2 pr-16 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                />
                {isConnected && parseFloat(availableBalance) > 0 && (
                  <button
                    type="button"
                    onClick={handleMaxClick}
                    className={`absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1 text-xs font-medium rounded ${
                      isDarkMode 
                        ? 'bg-teal-600 hover:bg-teal-700 text-white' 
                        : 'bg-teal-500 hover:bg-teal-600 text-white'
                    } transition-colors`}
                  >
                    MAX
                  </button>
                )}
              </div>
              {parseFloat(amount) > parseFloat(availableBalance) && (
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                  Insufficient balance
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className={`flex-1 px-4 py-2 border rounded-lg font-medium transition-colors ${
                  isDarkMode 
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={
                  loading || 
                  !amount ||
                  parseFloat(amount) > parseFloat(availableBalance)
                }
                className={`flex-1 px-4 py-2 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  getActionColor()
                }`}
              >
                {loading ? 'Processing...' : 'Confirm Stake'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Copy Button Component
const CopyButton: React.FC<{ text: string; displayText: string }> = ({ text, displayText }) => {
  const { isDarkMode } = useTheme();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs font-mono ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        {displayText}
      </span>
      <button
        onClick={handleCopy}
        className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${
          copied ? 'text-green-500' : isDarkMode ? 'text-gray-400' : 'text-gray-500'
        }`}
        title="Copy address"
      >
        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      </button>
    </div>
  );
};

// Helper function to get chain data from chain registry
const getChainData = (chainName: string) => {
  
  console.log('Looking for chain data for:', chainName);
  const asset = assetLists.find(a => a.chainName === chainName);
  const chainSymbol = asset?.assets[0]?.symbol; // Assuming the first asset represents the chain's symbol
  const logoUrl = asset?.assets[0]?.logoURIs?.png || asset?.assets[0]?.logoURIs?.svg; // Use PNG or SVG logo URI
  
  return {
    chainSymbol,
    logoUrl,
  };
};

const Validators: React.FC = () => {
  const { isDarkMode } = useTheme();
  const { isConnected } = useWallet();
  const { showToast } = useToast();
  const [validators, setValidators] = useState<Validator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    validator: Validator | null;
    action: 'stake';
  }>({
    isOpen: false,
    validator: null,
    action: 'stake'
  });
  const [transactionResultModal, setTransactionResultModal] = useState<{
    isOpen: boolean;
    success: boolean;
    txHash?: string;
    chainName?: string;
    amount?: string;
    tokenSymbol?: string;
    validatorName?: string;
    errorMessage?: string;
  }>({
    isOpen: false,
    success: false
  });
  const hasInitialized = useRef(false);
  
  // Create Namada wallet manager instance
  const namadaWallet = useRef<NamadaWalletManager | null>(null);

  const fetchValidators = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching validators...');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/validators`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch validators');
      }
      
      const result = await response.json();
      console.log('Validators API Response:', result);
      
      if (result.success && result.data?.validators) {
        setValidators(result.data.validators);
      } else {
        throw new Error('No validator data available');
      }
    } catch (err) {
      console.error('Error fetching validators:', err);
      setError('Failed to load validator data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasInitialized.current) {
      return;
    }
    
    hasInitialized.current = true;
    fetchValidators();
  }, []);

  const handleAction = (validator: Validator) => {
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    setModalState({
      isOpen: true,
      validator,
      action: 'stake'
    });
  };

  const closeModal = () => {
    setModalState({
      isOpen: false,
      validator: null,
      action: 'stake'
    });
  };

  const closeTransactionResultModal = () => {
    setTransactionResultModal({
      isOpen: false,
      success: false
    });
  };

  // Function to create transaction record in backend
  const createTransactionRecord = async (transactionData: {
    txHash: string;
    userPublicAddress: string;
    chainId: string;
    chainName: string;
    type: 'delegate';
    amount: string;
    tokenSymbol: string;
    tokenDenom: string;
    validatorAddress: string;
    status: 'success' | 'failed' | 'pending';
    errorMessage?: string;
    rawTx?: any;
  }) => {
    try {
      console.log('=== CREATING TRANSACTION RECORD ===');
      
      // Create a serializable version of the transaction data
      const serializableData = {
        ...transactionData,
        // Convert rawTx to a serializable format by removing BigInt values
        rawTx: transactionData.rawTx ? {
          transactionHash: transactionData.rawTx.transactionHash,
          code: transactionData.rawTx.code,
          height: transactionData.rawTx.height?.toString(), // Convert BigInt to string
          gasUsed: transactionData.rawTx.gasUsed?.toString(), // Convert BigInt to string
          gasWanted: transactionData.rawTx.gasWanted?.toString(), // Convert BigInt to string
          events: transactionData.rawTx.events || [],
          rawLog: transactionData.rawTx.rawLog || ''
        } : undefined
      };
      
      console.log('📝 Creating transaction record with data:', JSON.stringify(serializableData, null, 2));
      console.log('🌐 Making POST request to:', `${import.meta.env.VITE_API_BASE_URL}/api/transactions`);
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serializableData)
      });

      console.log('📈 Response status:', response.status);
      console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));

      const result = await response.json();
      console.log('Backend transaction record response:', JSON.stringify(result, null, 2));

      if (!result.success) {
        console.warn('⚠️ Failed to create transaction record:', result.message);
        console.warn('Backend errors:', result.errors);
        // Don't throw error here as the blockchain transaction was successful
      } else {
        console.log('✅ Transaction record created successfully!');
      }
    } catch (error) {
      console.error('❌ Error creating transaction record:', error);
      const err = error as any;
      console.error('Error details:', {
        message: err?.message,
        stack: err?.stack
      });
      // Don't throw error here as the blockchain transaction was successful
    }
  };

  const handleConfirmAction = async (amount: string) => {
    const { validator } = modalState;
    if (!validator) return;

    try {
      console.log('Stake action for validator:', validator.validatorName, 'Amount:', amount);
      
      // Check if it's a Namada chain
      if (validator.chainName.toLowerCase().includes('namada') || validator.chainId.includes('namada')) {
        // Handle Namada transactions
        if (window.namada) {
          try {
            // Initialize Namada wallet manager if not already done
            if (!namadaWallet.current) {
              namadaWallet.current = new NamadaWalletManager();
            }

            // Get working RPC endpoints from backend API for Namada
            let workingRpc = null;
            try {
              console.log('Fetching Namada RPC endpoints from backend for chain:', validator.chainId);
              const apiResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/apis/${validator.chainId}`);
              
              if (apiResponse.ok) {
                const apiData = await apiResponse.json();
                console.log('Backend API response for Namada RPCs:', apiData);
                
                if (apiData.success && apiData.data && apiData.data.rpc && apiData.data.rpc.length > 0) {
                  // Test RPC endpoints to find working one
                  for (const rpcEndpoint of apiData.data.rpc) {
                    try {
                      console.log(`Testing Namada RPC endpoint: ${rpcEndpoint.address}`);
                      const testResponse = await fetch(`${rpcEndpoint.address}/status`, {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' },
                        signal: AbortSignal.timeout(5000) // 5 second timeout
                      });
                      
                      if (testResponse.ok) {
                        workingRpc = rpcEndpoint.address;
                        console.log(`Found working Namada RPC: ${workingRpc}`);
                        break;
                      }
                    } catch (rpcTest) {
                      console.warn(`Namada RPC ${rpcEndpoint.address} not responding`);
                      continue;
                    }
                  }
                }
              }
            } catch (apiError) {
              console.warn('Failed to fetch Namada RPC from backend, using fallback:', apiError);
            }

            // If no working RPC found from backend, use fallback
            if (!workingRpc) {
              const fallbackRpc = 'https://namada-mainnet-rpc.mellifera.network:443';
              try {
                console.log(`Testing Namada fallback RPC: ${fallbackRpc}`);
                const testResponse = await fetch(`${fallbackRpc}/status`, {
                  signal: AbortSignal.timeout(5000) // 5 second timeout
                });
                if (testResponse.ok) {
                  workingRpc = fallbackRpc;
                  console.log(`Using Namada fallback RPC: ${workingRpc}`);
                } else {
                  console.warn('Namada fallback RPC not responding, proceeding anyway');
                  workingRpc = fallbackRpc; // Use fallback even if test fails
                }
              } catch (err) {
                console.warn(`Namada fallback RPC test failed, using anyway:`, err);
                workingRpc = fallbackRpc; // Use fallback even if test fails
              }
            }

            console.log('Using Namada RPC endpoint:', workingRpc);
            
            // Connect to Namada wallet
            const connected = await namadaWallet.current.connect(validator.chainId, workingRpc);
            if (!connected) {
              throw new Error('Failed to connect to Namada wallet');
            }

            const userAddress = namadaWallet.current.getAddress();
            console.log('Connected Namada address:', userAddress);

            // Convert amount from display units to smallest denomination
            // amount is in NAM, need to convert to namnam (1 NAM = 1,000,000 namnam)
            const amountInNamnam = (parseFloat(amount) * 1000000).toString();
            
            console.log('Initiating Namada stake transaction...');
            console.log('Validator:', validator.validatorAddress);
            console.log('Amount:', amountInNamnam, 'namnam');

            // Show wallet prompt notification
            showToast({
              type: 'info',
              title: 'Wallet Action Required',
              message: 'Please confirm the transaction in your Namada wallet...',
              duration: 8000
            });

            // Delegate tokens using the Namada wallet manager
            const result = await namadaWallet.current.delegate(
              validator.validatorAddress,
              amountInNamnam,
              workingRpc,
              `Staking ${amount} NAM via EthicalNode`
            );

            console.log('Namada transaction result:', result);

            // Create transaction record in backend
            await createTransactionRecord({
              txHash: result.hash || '',
              userPublicAddress: userAddress,
              chainId: validator.chainId,
              chainName: validator.chainName,
              type: 'delegate',
              amount: amountInNamnam,
              tokenSymbol: 'NAM',
              tokenDenom: 'nam',
              validatorAddress: validator.validatorAddress,
              status: 'success',
              rawTx: result
            });

            console.log('Namada staking transaction completed successfully!');
            closeModal();
            setTransactionResultModal({
              isOpen: true,
              success: true,
              txHash: result.hash,
              chainName: validator.chainName,
              amount: amount,
              tokenSymbol: 'NAM',
              validatorName: validator.validatorName
            });

            // Show success toast
            showToast({
              type: 'success',
              title: 'Staking Successful!',
              message: `Successfully staked ${amount} NAM to ${validator.validatorName}`
            });

          } catch (error: any) {
            console.error('Namada transaction failed:', error);
            closeModal();
            setTransactionResultModal({
              isOpen: true,
              success: false,
              chainName: validator.chainName,
              amount: amount,
              tokenSymbol: 'NAM',
              validatorName: validator.validatorName,
              errorMessage: error.message || 'Namada transaction failed. Please try again or check your wallet connection.'
            });

            // Show error toast
            showToast({
              type: 'error',
              title: 'Staking Failed',
              message: error.message || 'Transaction failed. Please try again.'
            });
          }
        } else {
          closeModal();
          setTransactionResultModal({
            isOpen: true,
            success: false,
            chainName: validator.chainName,
            amount: amount,
            tokenSymbol: 'NAM',
            validatorName: validator.validatorName,
            errorMessage: 'Please install Namada wallet extension to stake on Namada network.'
          });
        }
      } else {
        // Handle Cosmos chains with Keplr using Amino signing for better UX
        if (window.keplr) {
          // Get chain registry data for gas and denomination info (outside try-catch for error handling access)
          const chainRegistryData = assetLists.find(a => a.chainName === validator.chainName);
          const chainData = chains.find(c => c.chainName === validator.chainName);
          
          if (!chainRegistryData || !chainData) {
            closeModal();
            setTransactionResultModal({
              isOpen: true,
              success: false,
              chainName: validator.chainName,
              amount: amount,
              tokenSymbol: 'TOKEN',
              validatorName: validator.validatorName,
              errorMessage: 'This chain is not yet supported for staking.'
            });
            return;
          }
          
          const stakeCurrency = chainRegistryData.assets[0];
          
          try {
            // Enable the chain
            await window.keplr.enable([validator.chainId]);
            
            console.log('Chain data found:', {
              chainName: validator.chainName,
              chainData: chainData,
              assetData: chainRegistryData
            });
            
            const baseDenom = stakeCurrency.base;
            const exponent = stakeCurrency.denomUnits?.find(unit => unit.denom === stakeCurrency.display)?.exponent || 6;
            
            // Convert amount from display units to base units
            const amountInBaseUnits = Decimal.fromUserInput(amount, exponent).atomics;

            // Calculate gas fee using chain registry data
            let gasAmount = "600000"; // Standard gas limit for delegation
            let feeAmount = "3600"; // Default fallback
            
            // Get fee information from chain data
            if (chainData.fees && chainData.fees.feeTokens && chainData.fees.feeTokens.length > 0) {
              const feeToken = chainData.fees.feeTokens.find(token => token.denom === baseDenom) || chainData.fees.feeTokens[0];
              
              if (feeToken) {
                // Use average gas price if available, otherwise use fixed min gas price
                let gasPrice = feeToken.averageGasPrice || feeToken.fixedMinGasPrice || feeToken.lowGasPrice || 0.005;
                
                // Calculate fee amount based on gas limit and gas price
                // Gas price is usually in display units, so convert to base units
                const feeInBaseUnits = Math.ceil(parseInt(gasAmount) * gasPrice);
                feeAmount = feeInBaseUnits.toString();
                
                console.log(`Using chain registry fee data for ${validator.chainName}:`, {
                  gasPrice,
                  gasAmount,
                  feeAmount,
                  baseDenom,
                  exponent,
                  feeToken
                });
              }
            }
            
            // Get additional gas limit from chain data if available
            if (chainData.staking && chainData.staking.stakingTokens && chainData.staking.stakingTokens.length > 0) {
              const stakingToken = chainData.staking.stakingTokens.find(token => token.denom === baseDenom);
              if (stakingToken) {
                console.log('Found staking token data:', stakingToken);
              }
            }

            const fee = {
              gas: gasAmount,
              amount: [{
                denom: baseDenom,
                amount: feeAmount
              }]
            };

            // Get working RPC endpoints from backend API (silently)
            let workingRpc = null;
            try {
              console.log('Fetching RPC endpoints from backend for chain:', validator.chainId);
              const apiResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/apis/${validator.chainId}`);
              
              if (apiResponse.ok) {
                const apiData = await apiResponse.json();
                console.log('Backend API response for RPCs:', apiData);
                
                if (apiData.success && apiData.data && apiData.data.apis && apiData.data.apis.length > 0) {
                  // Test RPC endpoints to find working one (silently)
                  for (const rpcEndpoint of apiData.data.apis) {
                    try {
                      console.log(`Testing RPC endpoint: ${rpcEndpoint}`);
                      const testResponse = await fetch(`${rpcEndpoint}/status`, {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' },
                        signal: AbortSignal.timeout(5000) // 5 second timeout
                      });
                      
                      if (testResponse.ok) {
                        workingRpc = rpcEndpoint;
                        console.log(`Found working RPC: ${workingRpc}`);
                        break;
                      }
                    } catch (rpcTest) {
                      console.warn(`RPC ${rpcEndpoint} not responding`);
                      continue;
                    }
                  }
                }
              }
            } catch (apiError) {
              console.warn('Failed to fetch RPC from backend, using fallbacks:', apiError);
            }

            // If no working RPC found from backend, use fallbacks (silently)
            if (!workingRpc) {
              const fallbackRpcs = [
                `https://rpc-cosmoshub.blockapsis.com`,
                `https://cosmos-rpc.polkachu.com`,
                `https://rpc.cosmos.network`,
                `https://cosmoshub.validator.network/rpc`
              ];
              
              for (const fallbackRpc of fallbackRpcs) {
                try {
                  console.log(`Testing fallback RPC: ${fallbackRpc}`);
                  const testResponse = await fetch(`${fallbackRpc}/status`, {
                    signal: AbortSignal.timeout(5000) // 5 second timeout
                  });
                  if (testResponse.ok) {
                    workingRpc = fallbackRpc;
                    console.log(`Found working fallback RPC: ${workingRpc}`);
                    break;
                  }
                } catch (err) {
                  console.warn(`Fallback RPC ${fallbackRpc} failed:`, err);
                  continue;
                }
              }
            }

            console.log('Using RPC endpoint:', workingRpc);

            // Show wallet prompt notification
            showToast({
              type: 'info',
              title: 'Wallet Action Required',
              message: 'Please confirm the transaction in your Keplr wallet...',
              duration: 8000 // Keep it longer since user needs time to sign
            });

            // Get offline signer for transaction signing
            const offlineSigner = window.keplr.getOfflineSignerOnlyAmino(validator.chainId);
            const accounts = await offlineSigner.getAccounts();
            
            if (!accounts || accounts.length === 0) {
              throw new Error('No accounts found in Keplr wallet');
            }

            const signerAddress = accounts[0].address;
            console.log('Signer address:', signerAddress);

            // Use CosmJS SigningStargateClient for proper delegation (recommended approach)
            if (!workingRpc) {
              throw new Error('No working RPC endpoint available for broadcasting');
            }

            console.log('Using SigningStargateClient to delegate tokens...');
            
            // Import SigningStargateClient and assertIsDeliverTxSuccess
            const { SigningStargateClient, assertIsDeliverTxSuccess } = await import('@cosmjs/stargate');
            
            // Connect signing client to RPC endpoint
            const client = await SigningStargateClient.connectWithSigner(
              workingRpc,
              offlineSigner as any // Cast to any to avoid TypeScript issues with Keplr's signer
            );

            // Create coin object for delegation
            const coin = {
              denom: baseDenom,
              amount: amountInBaseUnits
            };

            console.log('Delegating tokens:', {
              delegator: signerAddress,
              validator: validator.validatorAddress,
              amount: coin,
              fee: fee
            });

            // Use CosmJS delegateTokens method (this handles everything: signing + broadcasting)
            const result = await client.signAndBroadcast(
              signerAddress,
              [{
                typeUrl: "/cosmos.staking.v1beta1.MsgDelegate",
                value: {
                  delegatorAddress: signerAddress,
                  validatorAddress: validator.validatorAddress,
                  amount: coin,
                },
              }],
              fee,
              "Staking via EthicalNode"
            );

            console.log('Delegation result:', result);

            // Ensure the transaction was successful
            assertIsDeliverTxSuccess(result);

            // Get transaction hash
            const finalTxHash = result.transactionHash;

            // Close the client connection
            client.disconnect();

            // Close the staking modal first
            closeModal();

            console.log('🚀 About to create transaction record...');

            // Create transaction record in backend
            await createTransactionRecord({
              txHash: finalTxHash,
              userPublicAddress: signerAddress,
              chainId: validator.chainId,
              chainName: validator.chainName,
              type: 'delegate',
              amount: amountInBaseUnits,
              tokenSymbol: stakeCurrency.symbol,
              tokenDenom: baseDenom,
              validatorAddress: validator.validatorAddress,
              status: 'success',
              rawTx: result
            });

            console.log('✅ Transaction record creation completed');

            // Show success modal with transaction details
            setTransactionResultModal({
              isOpen: true,
              success: true,
              txHash: finalTxHash,
              chainName: validator.chainName,
              amount: amount,
              tokenSymbol: stakeCurrency.symbol,
              validatorName: validator.validatorName
            });
            
          } catch (error: any) {
            console.error('Cosmos transaction failed:', error);
            
            // Close the staking modal first
            closeModal();
            
            let errorMessage = 'Unable to process transaction. Please try again or check your wallet connection.';
            
            // Handle specific error cases
            if (error?.message?.includes('insufficient funds') || error?.message?.includes('insufficient balance')) {
              errorMessage = 'Not enough balance to cover transaction and gas fees.';
            } else if (error?.message?.includes('user rejected') || 
                       error?.message?.includes('Request rejected') || 
                       error?.message?.includes('User denied') ||
                       error?.message?.includes('rejected by user')) {
              errorMessage = 'You cancelled the transaction in Keplr wallet.';
            } else if (error?.message?.includes('Chain registry data not found')) {
              errorMessage = 'This chain is not yet supported for staking.';
            } else if (error?.message?.includes('No accounts found')) {
              errorMessage = 'No accounts found in Keplr wallet. Please make sure your wallet is properly set up.';
            } else if (error?.message?.includes('broadcasting failed') || 
                       error?.message?.includes('broadcast') ||
                       error?.message?.includes('network')) {
              errorMessage = 'Failed to broadcast transaction. Please check your connection and try again.';
            }

            // Show error modal with details
            setTransactionResultModal({
              isOpen: true,
              success: false,
              chainName: validator.chainName,
              amount: amount,
              tokenSymbol: stakeCurrency.symbol || 'TOKEN',
              validatorName: validator.validatorName,
              errorMessage: errorMessage
            });
          }
        } else {
          closeModal();
          setTransactionResultModal({
            isOpen: true,
            success: false,
            chainName: validator.chainName,
            amount: amount,
            tokenSymbol: 'TOKEN',
            validatorName: validator.validatorName,
            errorMessage: 'Please install Keplr wallet extension to stake on Cosmos networks.'
          });
        }
      }
    } catch (error) {
      console.error('Transaction failed:', error);
      closeModal();
      setTransactionResultModal({
        isOpen: true,
        success: false,
        chainName: validator?.chainName || 'Unknown',
        amount: amount,
        tokenSymbol: 'TOKEN',
        validatorName: validator?.validatorName || 'Unknown',
        errorMessage: 'An unexpected error occurred. Please try again.'
      });
    }
  };

  return (
    <div className={`p-6 ${isDarkMode ? 'bg-gray-900' : 'bg-white'} min-h-screen`}>
      {/* Header */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className={`text-3xl font-bold mb-2 ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}>
          Validators
        </h1>
        <p className={`text-lg ${
          isDarkMode ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Stake, unstake, and claim rewards from Shariah-compliant validators
        </p>
        {!isConnected && (
          <div className={`mt-4 p-3 rounded-lg ${
            isDarkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-800'
          }`}>
            Please connect your wallet to interact with validators
          </div>
        )}
      </motion.div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="flex items-center gap-3">
            <svg className="animate-spin h-8 w-8 text-teal-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Loading validators...
            </span>
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <div className={`text-lg mb-4 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
            Failed to load validators
          </div>
          <p className={`text-sm mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {error}
          </p>
          <button
            onClick={fetchValidators}
            className="bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
          >
            Retry
          </button>
        </div>
      ) : validators.length === 0 ? (
        <div className="text-center py-12">
          <div className={`text-lg mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            No validators available
          </div>
        </div>
      ) : (
        <motion.div
          className="overflow-hidden rounded-lg border shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="overflow-x-auto">
            <table className={`min-w-full divide-y ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700 divide-gray-700' 
                : 'bg-white border-gray-200 divide-gray-200'
            }`}>
              <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                <tr>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    Chain
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    Validator
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    Commission
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    APR
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    Voting Power
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    Unbonding Period
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    Referral Reward
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${
                isDarkMode ? 'divide-gray-700' : 'divide-gray-200'
              }`}>
                {validators.map((validator, index) => (
                  <motion.tr
                    key={validator._id}
                    className={`hover:${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} transition-colors duration-200`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                  >
                    {/* Chain Column */}
                    <td className={`px-6 py-4 whitespace-nowrap ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      <div className="flex items-center space-x-3">
                        {(() => {
                          const chainData = getChainData(validator.chainName);
                          return chainData.logoUrl ? (
                            <img 
                              src={chainData.logoUrl} 
                              alt={`${validator.prettyName || validator.chainName} logo`}
                              className="w-8 h-8 rounded-full object-cover"
                              onError={(e) => {
                                // Fallback to text icon if image fails to load
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const fallback = target.nextElementSibling as HTMLElement;
                                if (fallback) {
                                  fallback.classList.remove('hidden');
                                }
                              }}
                            />
                          ) : null;
                        })()}
                        {/* Fallback text logo */}
                        <div className={`w-8 h-8 rounded-full ${
                          isDarkMode ? "bg-gray-700" : "bg-gray-100"
                        } flex items-center justify-center text-sm font-bold ${
                          isDarkMode ? "text-white" : "text-gray-900"
                        } ${getChainData(validator.chainName).logoUrl ? 'hidden' : ''}`}>
                          {(validator.prettyName || validator.chainName).slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-medium">
                            {validator.prettyName || validator.chainName}
                          </div>
                          <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {getChainData(validator.chainName).chainSymbol || validator.chainId}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Validator Column */}
                    <td className={`px-6 py-4 whitespace-nowrap ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      <div>
                        <div className="text-sm font-medium mb-1">{validator.validatorName}</div>
                        <CopyButton 
                          text={validator.validatorAddress}
                          displayText={`${validator.validatorAddress.slice(0, 8)}...${validator.validatorAddress.slice(-6)}`}
                        />
                      </div>
                    </td>

                    {/* Commission Column */}
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {validator.validatorCommission ? `${(validator.validatorCommission * 100).toFixed(1)}%` : 'N/A'}
                    </td>

                    {/* APR Column */}
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                      isDarkMode ? 'text-green-400' : 'text-green-600'
                    }`}>
                      {validator.validatorAPR ? `${validator.validatorAPR.toFixed(2)}%` : 'N/A'}
                    </td>

                    {/* Voting Power Column */}
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {validator.validatorPower ? `${(validator.validatorPower).toFixed(3)}%` : 'N/A'}
                    </td>

                    {/* Unbonding Period Column */}
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {validator.validatorUnbondingPeriod || 'N/A'}
                    </td>

                    {/* Referral Reward Column */}
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                      isDarkMode ? 'text-blue-400' : 'text-blue-600'
                    }`}>
                      {validator.defaultReferralReward ? `${validator.defaultReferralReward.toFixed(2)}%` : 'N/A'}
                    </td>

                    {/* Actions Column */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAction(validator)}
                          disabled={!validator.isActive}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-xs font-medium rounded transition-colors"
                        >
                          Stake
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Action Modal */}
      <ActionModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        validator={modalState.validator}
        action={modalState.action}
        onConfirm={handleConfirmAction}
      />

      {/* Transaction Result Modal */}
      <TransactionResultModal
        isOpen={transactionResultModal.isOpen}
        onClose={closeTransactionResultModal}
        success={transactionResultModal.success}
        txHash={transactionResultModal.txHash}
        chainName={transactionResultModal.chainName}
        amount={transactionResultModal.amount}
        tokenSymbol={transactionResultModal.tokenSymbol}
        validatorName={transactionResultModal.validatorName}
        errorMessage={transactionResultModal.errorMessage}
      />
    </div>
  );
};

export default Validators;
