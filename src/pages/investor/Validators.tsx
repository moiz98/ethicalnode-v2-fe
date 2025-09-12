import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useWallet } from '../../contexts/WalletContext';
import { assetLists } from 'chain-registry';
import { SigningStargateClient } from '@cosmjs/stargate';
import { Decimal } from '@cosmjs/math';
import { coins } from '@cosmjs/amino';
import { useToast } from '../../components/common/ToastProvider';

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

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  validator: Validator | null;
  action: 'stake' | 'unstake' | 'claim';
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

  // Function to get available balance from connected wallets
  const getAvailableBalance = async (chainName: string, chainId: string) => {
    console.log('=== Starting balance fetch ===');
    console.log('Chain Name:', chainName, 'Chain ID:', chainId);
    
    try {
      // Check if it's a Namada chain
      if (chainName.toLowerCase().includes('namada') || chainId.includes('namada')) {
        console.log('Detected Namada chain');
        // Get balance from Namada wallet
        if (window.namada) {
          try {
            const accounts = await window.namada.accounts();
            if (accounts && accounts.length > 0) {
              const accountAddress = accounts[0].address;
              console.log('Namada account address:', accountAddress);
              
              const namadaTokens = await fetch("https://indexer.namada.tududes.com/api/v1/chain/token");

              // Use Namada indexer API to get balance
              const response = await fetch(`https://indexer.namada.tududes.com/api/v1/account/${accountAddress}`);
              
              if (response.ok && namadaTokens.ok) {
                const data = await response.json();
                const tokensData = await namadaTokens.json();
                console.log('Namada API response:', data);
                // get token address where trace is null
                let token = tokensData.find((t: any) => !t.trace);
                console.log('Namada token:', token);
                // Extract NAM balance from the response
                const balance = data.find((b: any) => b.tokenAddress === token.address)?.minDenomAmount;
                console.log('Namada balance found:', balance);
                return (parseFloat(balance)/1000000).toString(); // Assuming NAM has 6 decimal places
              } else {
                console.error('Namada API response not ok:', response.status);
              }
            }
          } catch (error) {
            console.error('Failed to fetch Namada balance:', error);
            return '0';
          }
        } else {
          console.warn('Namada wallet not available');
          return '0';
        }
      } else {
        console.log('Processing Cosmos chain with Keplr');
        // Get balance from Keplr wallet for Cosmos chains
        const keplrWindow = window as any;
        if (keplrWindow.keplr) {
          try {
            console.log('Keplr wallet detected, enabling chain...');
            // Enable the chain
            await keplrWindow.keplr.enable([chainId]);
            console.log('Chain enabled successfully');
            
            // Get account info using getKey method
            const key = await keplrWindow.keplr.getKey(chainId);
            const address = key.bech32Address;
            console.log('Keplr address:', address);
            
            // Get chain registry data first
            const chainRegistryData = assetLists.find(a => a.chainName === chainName);
            console.log('Chain registry data:', chainRegistryData);
            
            if (chainRegistryData && chainRegistryData.assets.length > 0) {
              const stakeCurrency = chainRegistryData.assets[0];
              const baseDenom = stakeCurrency.base;
              console.log('Base denomination:', baseDenom);
              
              // Try REST API approach as it's more reliable than Keplr's direct balance methods
              const restEndpoints = [
                `https://rest.cosmos.directory/${chainName}`,
                `https://lcd-cosmos.cosmostation.io`,
                `https://api-cosmos.cosmostation.io/v1`
              ];
              
              for (const endpoint of restEndpoints) {
                try {
                  console.log(`Trying REST endpoint: ${endpoint}`);
                  const url = `${endpoint}/cosmos/bank/v1beta1/balances/${address}`;
                  console.log('Full URL:', url);
                  
                  const response = await fetch(url);
                  console.log('REST response status:', response.status);
                  
                  if (response.ok) {
                    const data = await response.json();
                    console.log('REST API response:', data);
                    
                    if (data.balances && data.balances.length > 0) {
                      console.log('Found balances:', data.balances);
                      
                      // Find the native token balance
                      const nativeBalance = data.balances.find((bal: any) => bal.denom === baseDenom);
                      console.log('Native balance found:', nativeBalance);
                      
                      if (nativeBalance && nativeBalance.amount) {
                        const exponent = stakeCurrency.denomUnits?.find(unit => unit.denom === stakeCurrency.display)?.exponent || 6;
                        console.log('Using exponent:', exponent);
                        
                        const balanceInDisplayUnits = parseFloat(nativeBalance.amount) / Math.pow(10, exponent);
                        const formattedBalance = balanceInDisplayUnits.toFixed(6);
                        console.log('Final formatted balance:', formattedBalance);
                        
                        return formattedBalance;
                      }
                    }
                    break; // Stop trying other endpoints if this one worked
                  }
                } catch (restError) {
                  console.warn(`REST endpoint ${endpoint} failed:`, restError);
                  continue;
                }
              }
            }
            
            
          } catch (error) {
            console.error('Failed to fetch Keplr balance:', error);
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

  // Fetch available balance when modal opens and it's a stake action
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
    if (action === 'stake') {
      setAmount(availableBalance);
    }
  };

  const handleSubmit = async () => {
    if (!amount && action !== 'claim') return;
    
    setLoading(true);
    try {
      await onConfirm(amount);
      onClose();
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = () => {
    switch (action) {
      case 'stake':
        return 'bg-green-600 hover:bg-green-700';
      case 'unstake':
        return 'bg-red-600 hover:bg-red-700';
      case 'claim':
        return 'bg-blue-600 hover:bg-blue-700';
      default:
        return 'bg-teal-600 hover:bg-teal-700';
    }
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
            className="absolute inset-0 bg-black bg-opacity-50"
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

            {action !== 'claim' && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className={`block text-sm font-medium ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Amount
                  </label>
                  {action === 'stake' && isConnected && (
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
                    placeholder={`Enter amount to ${action}`}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    } ${action === 'stake' ? 'pr-16' : ''}`}
                  />
                  {action === 'stake' && isConnected && parseFloat(availableBalance) > 0 && (
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
                {action === 'stake' && parseFloat(amount) > parseFloat(availableBalance) && (
                  <p className={`text-xs mt-1 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                    Insufficient balance
                  </p>
                )}
              </div>
            )}

            {action === 'claim' && (
              <div className={`mb-4 p-3 rounded-lg ${
                isDarkMode ? 'bg-blue-900/30' : 'bg-blue-50'
              }`}>
                <p className={`text-sm ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                  This will claim all available rewards from this validator.
                </p>
              </div>
            )}

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
                  (!amount && action !== 'claim') ||
                  (action === 'stake' && parseFloat(amount) > parseFloat(availableBalance))
                }
                className={`flex-1 px-4 py-2 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  getActionColor()
                }`}
              >
                {loading ? 'Processing...' : `Confirm ${action.charAt(0).toUpperCase() + action.slice(1)}`}
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
    action: 'stake' | 'unstake' | 'claim';
  }>({
    isOpen: false,
    validator: null,
    action: 'stake'
  });
  const hasInitialized = useRef(false);

  const fetchValidators = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching validators...');
      const response = await fetch('http://localhost:3000/api/validators');
      
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

  const handleAction = (validator: Validator, action: 'stake' | 'unstake' | 'claim') => {
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    setModalState({
      isOpen: true,
      validator,
      action
    });
  };

  const closeModal = () => {
    setModalState({
      isOpen: false,
      validator: null,
      action: 'stake'
    });
  };

  const handleConfirmAction = async (amount: string) => {
    const { validator, action } = modalState;
    if (!validator) return;

    try {
      console.log(`${action} action for validator:`, validator.validatorName, 'Amount:', amount);
      
      // Check if it's a Namada chain
      if (validator.chainName.toLowerCase().includes('namada') || validator.chainId.includes('namada')) {
        // Handle Namada transactions
        if (window.namada) {
          try {
            const accounts = await window.namada.accounts();
            if (accounts && accounts.length > 0) {
              console.log('Namada account:', accounts[0]);
              
              if (action === 'stake') {
                console.log('Initiating Namada stake transaction...');
                showToast({
                  type: 'info',
                  title: 'Namada Staking',
                  message: 'Namada staking integration coming soon!'
                });
              } else if (action === 'unstake') {
                console.log('Initiating Namada unstake transaction...');
                showToast({
                  type: 'info',
                  title: 'Namada Unstaking',
                  message: 'Namada unstaking integration coming soon!'
                });
              } else if (action === 'claim') {
                console.log('Initiating Namada claim transaction...');
                showToast({
                  type: 'info',
                  title: 'Namada Claim',
                  message: 'Namada claim rewards integration coming soon!'
                });
              }
            }
          } catch (error) {
            console.error('Namada transaction failed:', error);
            showToast({
              type: 'error',
              title: 'Namada Transaction Failed',
              message: 'Please try again or check your wallet connection.'
            });
          }
        } else {
          showToast({
            type: 'warning',
            title: 'Wallet Not Found',
            message: 'Please install Namada wallet extension'
          });
        }
      } else {
        // Handle Cosmos chains with Keplr
        if (window.keplr) {
          try {
            // Enable the chain
            await window.keplr.enable([validator.chainId]);
            
            // Get the offline signer
            const offlineSigner = window.keplr.getOfflineSigner(validator.chainId);
            
            // Get accounts
            const accounts = await offlineSigner.getAccounts();
            const userAddress = accounts[0].address;
            
            // Get chain registry data for gas and denomination info
            const chainRegistryData = assetLists.find(a => a.chainName === validator.chainName);
            if (!chainRegistryData) {
              throw new Error('Chain registry data not found');
            }
            
            const stakeCurrency = chainRegistryData.assets[0];
            const baseDenom = stakeCurrency.base;
            const exponent = stakeCurrency.denomUnits?.find(unit => unit.denom === stakeCurrency.display)?.exponent || 6;
            
            // Try multiple RPC endpoints for better reliability
            const rpcEndpoints = [
              `https://rpc.cosmos.directory/${validator.chainName}`,
              `https://rpc-${validator.chainName}.blockapsis.com`,
              `https://${validator.chainName}-rpc.polkachu.com`,
              'https://rpc-cosmoshub.blockapsis.com' // fallback for cosmoshub
            ];
            
            let client;
            
            // Try connecting to RPC endpoints
            for (const rpcEndpoint of rpcEndpoints) {
              try {
                console.log(`Trying RPC endpoint: ${rpcEndpoint}`);
                client = await SigningStargateClient.connectWithSigner(rpcEndpoint, offlineSigner);
                console.log(`Successfully connected to: ${rpcEndpoint}`);
                break;
              } catch (rpcError) {
                console.warn(`Failed to connect to ${rpcEndpoint}:`, rpcError);
                continue;
              }
            }
            
            if (!client) {
              throw new Error('Unable to connect to any RPC endpoint');
            }
            
            let result;
            
            showToast({
              type: 'info',
              title: 'Transaction Pending',
              message: 'Please confirm the transaction in your Keplr wallet...'
            });
            
            if (action === 'stake') {
              // Convert amount from display units to base units
              const amountInBaseUnits = Decimal.fromUserInput(amount, exponent).atomics;
              const stakeAmount = coins(amountInBaseUnits, baseDenom);
              
              console.log('Delegating:', stakeAmount, 'to validator:', validator.validatorAddress);
              
              result = await client.delegateTokens(
                userAddress,
                validator.validatorAddress,
                stakeAmount[0],
                {
                  amount: coins('5000', baseDenom), // Gas fee
                  gas: '200000', // Gas limit
                }
              );
              
              console.log('Delegation successful:', result);
              showToast({
                type: 'success',
                title: 'Staking Successful!',
                message: `Successfully staked ${amount} tokens. TX: ${result.transactionHash.slice(0, 8)}...`
              });
              
            } else if (action === 'unstake') {
              // Convert amount from display units to base units
              const amountInBaseUnits = Decimal.fromUserInput(amount, exponent).atomics;
              const unstakeAmount = coins(amountInBaseUnits, baseDenom);
              
              console.log('Undelegating:', unstakeAmount, 'from validator:', validator.validatorAddress);
              
              result = await client.undelegateTokens(
                userAddress,
                validator.validatorAddress,
                unstakeAmount[0],
                {
                  amount: coins('5000', baseDenom), // Gas fee
                  gas: '200000', // Gas limit
                }
              );
              
              console.log('Undelegation successful:', result);
              showToast({
                type: 'success',
                title: 'Unstaking Successful!',
                message: `Successfully unstaked ${amount} tokens. TX: ${result.transactionHash.slice(0, 8)}...`
              });
              
            } else if (action === 'claim') {
              console.log('Claiming rewards from validator:', validator.validatorAddress);
              
              result = await client.withdrawRewards(
                userAddress,
                validator.validatorAddress,
                {
                  amount: coins('5000', baseDenom), // Gas fee
                  gas: '200000', // Gas limit
                }
              );
              
              console.log('Claim successful:', result);
              showToast({
                type: 'success',
                title: 'Rewards Claimed!',
                message: `Successfully claimed rewards. TX: ${result.transactionHash.slice(0, 8)}...`
              });
            }
            
            // Close the client
            client.disconnect();
            
          } catch (error: any) {
            console.error('Cosmos transaction failed:', error);
            
            if (error?.message?.includes('insufficient funds')) {
              showToast({
                type: 'error',
                title: 'Insufficient Funds',
                message: 'Not enough balance to cover transaction and gas fees.'
              });
            } else if (error?.message?.includes('user rejected') || error?.message?.includes('Request rejected')) {
              showToast({
                type: 'warning',
                title: 'Transaction Cancelled',
                message: 'You cancelled the transaction in Keplr wallet.'
              });
            } else if (error?.message?.includes('Unable to connect')) {
              showToast({
                type: 'error',
                title: 'Network Error',
                message: 'Unable to connect to the blockchain. Please try again later.'
              });
            } else {
              showToast({
                type: 'error',
                title: 'Transaction Failed',
                message: error?.message || 'An unexpected error occurred.'
              });
            }
          }
        } else {
          showToast({
            type: 'warning',
            title: 'Wallet Not Found',
            message: 'Please install Keplr wallet extension'
          });
        }
      }
    } catch (error) {
      console.error('Transaction failed:', error);
      showToast({
        type: 'error',
        title: 'Transaction Failed',
        message: 'An unexpected error occurred. Please try again.'
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
                          onClick={() => handleAction(validator, 'stake')}
                          disabled={!validator.isActive}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-xs font-medium rounded transition-colors"
                        >
                          Stake
                        </button>
                        <button
                          onClick={() => handleAction(validator, 'unstake')}
                          disabled={!validator.isActive}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-xs font-medium rounded transition-colors"
                        >
                          Unstake
                        </button>
                        <button
                          onClick={() => handleAction(validator, 'claim')}
                          disabled={!validator.isActive}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-xs font-medium rounded transition-colors"
                        >
                          Claim
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
    </div>
  );
};

export default Validators;
