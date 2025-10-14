import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { useWallet } from '../../contexts/WalletContext';
import { useToast } from '../../contexts/ToastContext';
import { X, AlertTriangle } from 'lucide-react';
import { assetLists, chains } from 'chain-registry';
import { Decimal } from '@cosmjs/math';
import { NamadaWalletManager } from '../../utils/namada';
import { SigningStargateClient, } from '@cosmjs/stargate';
import { MsgUndelegate } from 'cosmjs-types/cosmos/staking/v1beta1/tx';
import { MsgWithdrawDelegatorReward } from 'cosmjs-types/cosmos/distribution/v1beta1/tx';
import { MsgCancelUnbondingDelegation } from 'cosmjs-types/cosmos/staking/v1beta1/tx';

// Helper function to get chain asset data from asset lists
const getChainAssetData = (chainName: string) => {
  try {
    console.log('Looking for asset data for:', chainName);
    console.log('Available assetLists:', assetLists?.length || 0);
    
    if (!assetLists || assetLists.length === 0) {
      console.warn('No assetLists available');
      return {
        symbol: 'UNKNOWN',
        logoUrl: undefined,
        decimals: 6,
        baseDenom: 'unknown',
        prettyName: 'Unknown',
        coingeckoId: undefined
      };
    }

    const assetList = assetLists.find(a => a.chainName === chainName);
    console.log('Found assetList:', assetList?.chainName || 'none');
    
    if (!assetList?.assets?.[0]) {
      console.warn(`No asset data found for chain: ${chainName}`);
      return {
        symbol: chainName.toUpperCase(),
        logoUrl: undefined,
        decimals: 6,
        baseDenom: 'unknown',
        prettyName: chainName.toUpperCase(),
        coingeckoId: undefined
      };
    }
    
    const nativeAsset = assetList.assets[0]; // First asset is typically the native token
    console.log('Native asset:', nativeAsset?.symbol || 'unknown');
    
    const logoUrl = nativeAsset.logoURIs?.png || nativeAsset.logoURIs?.svg || undefined;
    
    // Find the display denomination unit to get decimals and symbol
    const displayUnit = nativeAsset.denomUnits?.find(unit => unit.denom === nativeAsset.display);
    const decimals = displayUnit?.exponent || 6;
    
    return {
      symbol: nativeAsset.symbol || chainName.toUpperCase(),
      logoUrl: logoUrl,
      decimals: decimals,
      baseDenom: nativeAsset.base || 'unknown',
      prettyName: nativeAsset.name,
      coingeckoId: nativeAsset.coingeckoId
    };
  } catch (error) {
    console.error('Error in getChainAssetData:', error);
    return {
      symbol: chainName.toUpperCase(),
      logoUrl: undefined,
      decimals: 6,
      baseDenom: 'unknown',
      prettyName: 'Unknown',
      coingeckoId: undefined
    };
  }
};

// Helper function to convert min denomination to display format
const convertMinDenomToDisplay = (balance: string, decimals: number): string => {
  try {
    if (!balance || isNaN(parseFloat(balance))) {
      console.warn('Invalid balance:', balance);
      return '0';
    }
    
    const balanceNum = parseFloat(balance);
    if (balanceNum === 0) return '0';
    
    const displayBalance = balanceNum / Math.pow(10, decimals);
    return displayBalance.toFixed(6).replace(/\.?0+$/, ''); // Remove trailing zeros
  } catch (error) {
    console.error('Error converting balance:', error, { balance, decimals });
    return '0';
  }
};

// Helper function to fetch prices from backend API
const fetchBackendPrices = async (): Promise<Record<string, number>> => {
  try {
    console.log('Fetching prices from backend API...');
    
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/investors/prices`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Backend API error! status: ${response.status}, message: ${errorText}`);
    }

    const result = await response.json();
    console.log('Backend prices response:', result);

    // Handle the actual response structure: data.prices.assets
    const assets = result.data?.prices?.assets || result.data?.assets;
    
    if (!result.success || !assets) {
      console.warn('No pricing data available from backend');
      console.log('Result structure:', result);
      return {};
    }

    // Convert to a flat object with coingeckoId as key and USD price as value
    const prices: Record<string, number> = {};
    
    // Process halal screener assets
    if (assets.halalScreener) {
      assets.halalScreener.forEach((asset: any) => {
        if (asset.coinGeckoId && asset.price?.usd) {
          prices[asset.coinGeckoId] = asset.price.usd;
        }
      });
    }
    
    // Process validator assets (for portfolio)
    if (assets.validators) {
      assets.validators.forEach((asset: any) => {
        if (asset.coinGeckoId && asset.price?.usd) {
          prices[asset.coinGeckoId] = asset.price.usd;
        }
      });
    }

    console.log('Processed prices:', prices);
    return prices;
  } catch (error) {
    console.error('Error fetching backend prices:', error);
    return {}; // Return empty object on error so the app continues to work
  }
};

interface StakedAsset {
  _id: string;
  chainId: string;
  chainName: string;
  prettyName: string;
  asset: string;
  stakedAmount: string;
  pendingRewards: string;
  validatorName: string;
  validatorAddress: string;
  validatorOperatorAddress?: string;
  apr: number;
  unbondingPeriod?: number; // in days
  commission?: number;
  status?: string;
  coingeckoId?: string;
}

interface AvailableBalance {
  _id: string;
  chainId: string;
  chainName: string;
  prettyName: string;
  asset: string;
  balance: string; // This will be in min denomination (e.g., uatom)
  displayBalance?: string; // Converted to display format (e.g., ATOM)
  usdPrice?: number;
  logoUrl?: string | null;
  decimals?: number;
  address?: string; // Wallet address
  bech32Prefix?: string;
  coingeckoId?: string;
}

interface UnstakingAsset {
  _id: string;
  chainId: string;
  chainName: string;
  asset: string;
  amount: string;
  completionDate: string;
  canWithdraw: boolean;
  daysRemaining?: number;
  coingeckoId?: string;
  creationHeight?: string; // Block height when unstaking was initiated
  validatorAddress?: string; // Validator address for cancel unbonding
}

interface PortfolioOverview {
  totalStakedValue: number;
  totalPendingRewards: number;
  totalUnstakingValue: number;
  totalAvailableValue: number;
  // totalAssets: number;
  averageAPR: number;
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
  transactionType?: 'unstake' | 'claim' | 'cancel_undelegate';
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
  errorMessage,
  transactionType
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

  const getTransactionTypeText = () => {
    switch (transactionType) {
      case 'unstake':
        return 'Unstaking';
      case 'claim':
        return 'Claim Rewards';
      case 'cancel_undelegate':
        return 'Cancel Unstaking';
      default:
        return 'Transaction';
    }
  };

  if (!isOpen) return null;

  return (
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
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
            <div>
              <h3 className="text-lg font-semibold">
                {success ? `${getTransactionTypeText()} Successful` : `${getTransactionTypeText()} Failed`}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {chainName}
              </p>
            </div>
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
              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your {getTransactionTypeText().toLowerCase()} transaction has been submitted successfully!
                </p>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Amount:</span>
                    <span className="font-medium">{amount} {tokenSymbol}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Validator:</span>
                    <span className="font-medium">{validatorName}</span>
                  </div>
                </div>
              </div>
              
              {txHash && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Transaction Hash:</p>
                  <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs font-mono">
                    <span className="flex-1 truncate">{txHash}</span>
                    <button
                      onClick={copyTxHash}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                      title="Copy transaction hash"
                    >
                      {copied ? (
                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <button
                    onClick={() => window.open(getExplorerUrl(txHash, chainName || ''), '_blank')}
                    className="w-full text-sm text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300"
                  >
                    View in Explorer →
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your {getTransactionTypeText().toLowerCase()} transaction failed.
              </p>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-sm text-red-700 dark:text-red-400">
                  {errorMessage}
                </p>
              </div>
              {amount && tokenSymbol && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Attempted Amount:</span>
                    <span className="font-medium">{amount} {tokenSymbol}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Validator:</span>
                    <span className="font-medium">{validatorName}</span>
                  </div>
                </div>
              )}
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
  );
};

const InvestorPortfolio: React.FC = () => {
  const { isDarkMode } = useTheme();
  const { isConnected, keplrPublicKey, namadaAddress, namadaNotAvailable } = useWallet();
  const { showToast } = useToast();

  // Use Keplr address if available, otherwise use Namada
  const primaryAddress = keplrPublicKey || namadaAddress;
  const [stakedAssets, setStakedAssets] = useState<StakedAsset[]>([]);
  const [availableBalances, setAvailableBalances] = useState<AvailableBalance[]>([]);
  const [unstakingAssets, setUnstakingAssets] = useState<UnstakingAsset[]>([]);
  const [showNamadaNotification, setShowNamadaNotification] = useState(false);
  const [showUnstakeModal, setShowUnstakeModal] = useState(false);
  const [showClaimRewardsModal, setShowClaimRewardsModal] = useState(false);
  const [showCancelUnstakingModal, setShowCancelUnstakingModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<StakedAsset | null>(null);
  const [selectedUnstakingAsset, setSelectedUnstakingAsset] = useState<UnstakingAsset | null>(null);
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [isTransactionInProgress, setIsTransactionInProgress] = useState(false);
  const [transactionResultModal, setTransactionResultModal] = useState<{
    isOpen: boolean;
    success: boolean;
    txHash?: string;
    chainName?: string;
    amount?: string;
    tokenSymbol?: string;
    validatorName?: string;
    errorMessage?: string;
    transactionType?: 'unstake' | 'claim' | 'cancel_undelegate';
  }>({
    isOpen: false,
    success: false
  });
  const [overview, setOverview] = useState<PortfolioOverview>({
    totalStakedValue: 0,
    totalPendingRewards: 0,
    totalUnstakingValue: 0,
    totalAvailableValue: 0,
    // totalAssets: 0,
    averageAPR: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasInitialized = useRef(false);
  const isRequestInProgress = useRef(false);
  
  // Create Namada wallet manager instance
  const namadaWallet = useRef<NamadaWalletManager | null>(null);

  // Action handlers
  const handleUnstake = (asset: StakedAsset) => {
    setSelectedAsset(asset);
    setUnstakeAmount('');
    setShowUnstakeModal(true);
  };

  const handleClaimRewards = (asset: StakedAsset) => {
    setSelectedAsset(asset);
    setShowClaimRewardsModal(true);
  };

  const handleCancelUnstaking = (asset: UnstakingAsset) => {
    console.log('Cancel unstaking action for:', asset.chainName, asset.amount, asset.asset);
    setSelectedUnstakingAsset(asset);
    setShowCancelUnstakingModal(true);
  };

  const handleWithdrawUnstaking = useCallback(async (asset: UnstakingAsset) => {
    console.log('Withdraw unstaking action for:', asset.chainName, asset.amount, asset.asset);
    
    // Check if it's a Namada chain
    if (asset.chainName.toLowerCase().includes('namada') || asset.chainId.includes('namada')) {
      // Handle Namada withdraw unbonded
      if (window.namada) {
        try {
          setIsTransactionInProgress(true);
          
          // Initialize Namada wallet manager if not already done
          if (!namadaWallet.current) {
            namadaWallet.current = new NamadaWalletManager();
          }

          // Get working RPC endpoints from backend API for Namada
          let workingRpc = null;
          try {
            console.log('Fetching Namada RPC endpoints from backend for chain:', asset.chainId);
            const apiResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/apis/${asset.chainId}`);
            
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
          const connected = await namadaWallet.current.connect(asset.chainId, workingRpc);
          if (!connected) {
            throw new Error('Failed to connect to Namada wallet');
          }

          const userAddress = namadaWallet.current.getAddress();
          console.log('Connected Namada address:', userAddress);

          console.log('Initiating Namada withdraw unbonded transaction...');
          console.log('Validator:', asset.validatorAddress);
          console.log('Amount:', asset.amount, 'NAM');

          // Check if asset can be withdrawn
          if (!asset.canWithdraw) {
            throw new Error(`This unstaking position is not yet ready for withdrawal. Please wait ${asset.daysRemaining || 'several'} more days for the unbonding period to complete.`);
          }

          // Validate validator address
          if (!asset.validatorAddress) {
            throw new Error('Validator address is required for withdrawal but was not found in the unstaking data');
          }

          // Show wallet prompt notification
          showToast({
            type: 'info',
            title: 'Wallet Action Required',
            message: 'Please confirm the withdraw transaction in your Namada wallet...',
            duration: 8000
          });

          // Withdraw unbonded assets using the Namada wallet manager
          const result = await namadaWallet.current.withdrawUnbonded(
            asset.validatorAddress,
            workingRpc,
            `Withdrawing ${asset.amount} NAM unbonded assets via EthicalNode`
          );

          console.log('Namada withdraw transaction result:', result);

          // Convert amount from NAM to namnam for transaction record
          const withdrawnAmountInNamnam = (parseFloat(asset.amount) * 1000000).toString();

          // Create transaction record in backend
          await createTransactionRecord({
            txHash: result.hash || '',
            userPublicAddress: userAddress,
            chainId: asset.chainId,
            chainName: asset.chainName,
            type: 'claim_undelegate', // Use existing type for now
            amount: withdrawnAmountInNamnam,
            tokenSymbol: 'NAM',
            tokenDenom: 'nam',
            validatorAddress: asset.validatorAddress,
            status: 'success',
            rawTx: result
          });

          console.log('Namada withdraw unbonded transaction completed successfully!');
          setTransactionResultModal({
            isOpen: true,
            success: true,
            txHash: result.hash,
            chainName: asset.chainName,
            amount: asset.amount,
            tokenSymbol: 'NAM',
            validatorName: `${asset.chainName} Validator`,
            transactionType: 'claim' // Use claim type for withdraw display
          });

          // Show success toast
          showToast({
            type: 'success',
            title: 'Withdrawal Successful!',
            message: `Successfully withdrew ${asset.amount} NAM from completed unstaking position`
          });

          // Refresh portfolio data
          setTimeout(() => {
            fetchPortfolioData();
          }, 2000);

        } catch (error: any) {
          console.error('Namada withdraw transaction failed:', error);
          
          // Check for specific error messages and provide user-friendly explanations
          let userFriendlyMessage = error.message || 'Namada withdraw transaction failed. Please try again or check your wallet connection.';
          
          if (error.message && error.message.includes('not ready')) {
            userFriendlyMessage = `This unstaking position is not yet ready for withdrawal. 

The unbonding period for Namada is typically 21 epochs (approximately 21 days). Please wait until the completion date (${asset.completionDate ? new Date(asset.completionDate).toLocaleDateString() : 'unknown'}) before attempting to withdraw.

Current status: ${asset.daysRemaining || 'Unknown'} days remaining`;
          } else if (error.message && error.message.includes('no unbonded bonds ready to withdraw')) {
            userFriendlyMessage = `No unbonded assets are ready to withdraw for this validator.

This could mean:
• The unbonding period hasn't completed yet
• The assets have already been withdrawn
• There was an issue with the original unbonding transaction

Please check your transaction history or wait for the unbonding period to complete.`;
          }
          
          setTransactionResultModal({
            isOpen: true,
            success: false,
            chainName: asset.chainName,
            amount: asset.amount,
            tokenSymbol: 'NAM',
            validatorName: `${asset.chainName} Validator`,
            errorMessage: userFriendlyMessage,
            transactionType: 'claim'
          });

          // Show error toast
          showToast({
            type: 'error',
            title: 'Withdrawal Failed',
            message: error.message || 'Transaction failed. Please try again.'
          });
        } finally {
          setIsTransactionInProgress(false);
        }
      } else {
        setTransactionResultModal({
          isOpen: true,
          success: false,
          chainName: asset.chainName,
          amount: asset.amount,
          tokenSymbol: 'NAM',
          validatorName: `${asset.chainName} Validator`,
          errorMessage: 'Please install Namada wallet extension to withdraw from Namada network.',
          transactionType: 'claim'
        });
      }
    } else {
      // For Cosmos chains, this functionality is typically automatic
      // Most Cosmos chains automatically transfer unbonded tokens back to the delegator
      showToast({
        type: 'info',
        title: 'Not Required',
        message: 'Cosmos chains automatically transfer unbonded tokens. No manual withdrawal needed.'
      });
    }
  }, [showToast]);

  const fetchPortfolioData = useCallback(async () => {
    // Prevent duplicate requests
    if (isRequestInProgress.current) {
      console.log('Request already in progress, skipping...');
      return;
    }

    try {
      isRequestInProgress.current = true;
      setLoading(true);
      setError(null);

      console.log('Fetching portfolio data for wallet:', primaryAddress);
      
      if (!primaryAddress) {
        throw new Error('No wallet address available');
      }

      const requestBody = {
        KeplrPublicAddress: keplrPublicKey || '',
        namadaWalletAddress: namadaAddress || ''
      };

      // Use Promise.all to make all requests simultaneously to avoid double calls
      const [balancesResponse, stakingResponse, unstakingResponse] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_BASE_URL}/api/investors/getBalances`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }),
        fetch(`${import.meta.env.VITE_API_BASE_URL}/api/investors/getStakingPositions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }),
        fetch(`${import.meta.env.VITE_API_BASE_URL}/api/investors/getUnstakingPositions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })
      ]);

      if (!balancesResponse.ok) {
        throw new Error(`Balances API error! status: ${balancesResponse.status}`);
      }

      if (!stakingResponse.ok) {
        throw new Error(`Staking API error! status: ${stakingResponse.status}`);
      }

      if (!unstakingResponse.ok) {
        throw new Error(`Unstaking API error! status: ${unstakingResponse.status}`);
      }

      const [balancesResult, stakingResult, unstakingResult] = await Promise.all([
        balancesResponse.json(),
        stakingResponse.json(),
        unstakingResponse.json()
      ]);

      console.log('Balances API Response:', balancesResult);
      console.log('Staking API Response:', stakingResult);
      console.log('Unstaking API Response:', unstakingResult);

      // Process available balances
      let processedBalances: AvailableBalance[] = [];
      if (balancesResult.success && balancesResult.data) {
        const { linkedWallets = [], balances = [] } = balancesResult.data;
        
        balances.forEach((balanceData: any) => {
          const wallet = linkedWallets.find((w: any) => w.chainId === balanceData.chainId);
          
          if (balanceData.balance?.amount && wallet) {
            const assetData = getChainAssetData(wallet.chainName);
            const displayBalance = convertMinDenomToDisplay(balanceData.balance.amount, assetData.decimals);
            
            processedBalances.push({
              _id: wallet._id,
              chainId: wallet.chainId,
              chainName: wallet.chainName,
              prettyName: assetData.prettyName,
              asset: assetData.symbol,
              balance: balanceData.balance.amount,
              displayBalance: displayBalance,
              logoUrl: assetData.logoUrl,
              decimals: assetData.decimals,
              address: wallet.address,
              bech32Prefix: wallet.bech32Prefix,
              coingeckoId: assetData.coingeckoId,
              usdPrice: 0 // Will be updated after fetching prices
            });
          }
        });

        // Fetch prices from backend API for all assets with coingeckoId
        const coingeckoIds = processedBalances
          .map(balance => balance.coingeckoId)
          .filter((id): id is string => !!id);

        if (coingeckoIds.length > 0) {
          try {
            const prices = await fetchBackendPrices();
            
            // Update USD prices for each balance
            processedBalances = processedBalances.map(balance => ({
              ...balance,
              usdPrice: balance.coingeckoId ? prices[balance.coingeckoId] || 0 : 0
            }));
            
            console.log('Updated balances with prices:', processedBalances);
          } catch (error) {
            console.error('Failed to fetch prices, continuing with 0 prices:', error);
          }
        }

        setAvailableBalances(processedBalances);
      } else {
        setAvailableBalances([]);
      }

      // Process staking positions
      let processedStakedAssets: StakedAsset[] = [];
      if (stakingResult.success && stakingResult.data?.stakingPositions) {
        const stakingPositions = stakingResult.data.stakingPositions;
        
        processedStakedAssets = stakingPositions.map((position: any, index: number) => {
          const assetData = getChainAssetData(position.chainName);
          
          // Convert amounts from min denom to display format
          const stakedDisplayAmount = convertMinDenomToDisplay(
            position.stakedAmount?.amount || '0', 
            assetData.decimals
          );
          const rewardsDisplayAmount = convertMinDenomToDisplay(
            position.pendingRewards?.amount || '0', 
            assetData.decimals
          );
          
          // Extract unbonding period number from string like "21 days" or "14 days"
          const unbondingPeriodMatch = position.validatorUnbondingPeriod?.match(/(\d+)/);
          const unbondingPeriod = unbondingPeriodMatch ? parseInt(unbondingPeriodMatch[1]) : 21;
          
          return {
            _id: `${position.chainId}_${index}`, // Create unique ID
            chainId: position.chainId,
            chainName: position.chainName,
            prettyName: assetData.symbol,
            asset: assetData.symbol,
            stakedAmount: stakedDisplayAmount,
            pendingRewards: rewardsDisplayAmount,
            validatorName: `${position.chainName} Validator`, // Generic name since not provided
            validatorAddress: position.validatorAddress || '',
            validatorOperatorAddress: undefined,
            apr: position.validatorAPR || 0,
            unbondingPeriod: unbondingPeriod,
            commission: (position.validatorCommission || 0) * 100, // Convert to percentage
            status: 'active', // Default status
            coingeckoId: assetData.coingeckoId // Add coingeckoId for price fetching
          };
        });

        setStakedAssets(processedStakedAssets);
      } else {
        setStakedAssets([]);
      }

      // We'll calculate overview totals after processing all assets

      // Process unstaking positions
      let processedUnstakingAssets: UnstakingAsset[] = [];
      if (unstakingResult.success && unstakingResult.data?.unstakingPositions) {
        const unstakingPositions = unstakingResult.data.unstakingPositions;
        
        unstakingPositions.forEach((position: any, positionIndex: number) => {
          const assetData = getChainAssetData(position.chainName);
          
          // Process each unstaking entry for this position
          position.unstakingEntries?.forEach((entry: any, entryIndex: number) => {
            const displayAmount = convertMinDenomToDisplay(
              entry.amount?.amount || '0', 
              assetData.decimals
            );
            
            // Calculate days remaining
            const completionDate = new Date(entry.completionTime);
            const now = new Date();
            const daysRemaining = Math.max(0, Math.ceil((completionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
            
            processedUnstakingAssets.push({
              _id: `${position.chainId}_${positionIndex}_${entryIndex}`,
              chainId: position.chainId,
              chainName: position.chainName,
              asset: assetData.symbol,
              amount: displayAmount,
              completionDate: entry.completionTime,
              canWithdraw: entry.canWithdraw || false,
              daysRemaining: daysRemaining,
              coingeckoId: assetData.coingeckoId,
              creationHeight: entry.creationHeight || entry.creation_height, // Support both naming conventions
              validatorAddress: position.validatorAddress || entry.validatorAddress
            });
          });
        });
        
        setUnstakingAssets(processedUnstakingAssets);
      } else {
        setUnstakingAssets([]);
      }
      
      const totalUnstaking = processedUnstakingAssets.reduce((sum: number, asset: UnstakingAsset) => sum + parseFloat(asset.amount), 0);
      
      // Calculate overview totals - all in USD
      const totalAvailable = processedBalances.reduce((sum: number, balance: AvailableBalance) => 
        sum + (parseFloat(balance.displayBalance || '0') * (balance.usdPrice || 0)), 0
      );
      
      // Fetch prices for staked and unstaking assets
      const allCoingeckoIds = [
        ...processedStakedAssets.map(asset => asset.coingeckoId).filter((id): id is string => !!id),
        ...processedUnstakingAssets.map(asset => asset.coingeckoId).filter((id): id is string => !!id)
      ];
      
      let totalStakedUSD = 0;
      let totalRewardsUSD = 0;
      let totalUnstakingUSD = 0;
      let weightedAPRSum = 0;
      let totalStakedValueForAPR = 0;

      if (allCoingeckoIds.length > 0) {
        try {
          const prices = await fetchBackendPrices();
          console.log('Fetched prices for staked/unstaking assets:', prices);
          
          // Calculate staked and rewards USD values
          processedStakedAssets.forEach(asset => {
            const price = asset.coingeckoId ? prices[asset.coingeckoId] || 0 : 0;
            const stakedAmount = parseFloat(asset.stakedAmount || '0');
            const rewardsAmount = parseFloat(asset.pendingRewards || '0');
            
            const stakedUSDValue = stakedAmount * price;
            const rewardsUSDValue = rewardsAmount * price;
            
            totalStakedUSD += stakedUSDValue;
            totalRewardsUSD += rewardsUSDValue;
            
            // Calculate weighted APR (APR * staked USD value)
            weightedAPRSum += asset.apr * stakedUSDValue;
            totalStakedValueForAPR += stakedUSDValue;
          });
          
          // Calculate unstaking USD values
          processedUnstakingAssets.forEach(asset => {
            const price = asset.coingeckoId ? prices[asset.coingeckoId] || 0 : 0;
            const amount = parseFloat(asset.amount || '0');
            totalUnstakingUSD += amount * price;
          });
          
        } catch (error) {
          console.error('Failed to fetch prices for staked/unstaking assets:', error);
          // Fall back to token amounts if price fetching fails
          totalStakedUSD = processedStakedAssets.reduce((sum: number, asset: StakedAsset) => sum + parseFloat(asset.stakedAmount), 0);
          totalRewardsUSD = processedStakedAssets.reduce((sum: number, asset: StakedAsset) => sum + parseFloat(asset.pendingRewards), 0);
          totalUnstakingUSD = totalUnstaking;
        }
      } else {
        // No price data available, use token amounts
        totalStakedUSD = processedStakedAssets.reduce((sum: number, asset: StakedAsset) => sum + parseFloat(asset.stakedAmount), 0);
        totalRewardsUSD = processedStakedAssets.reduce((sum: number, asset: StakedAsset) => sum + parseFloat(asset.pendingRewards), 0);
        totalUnstakingUSD = totalUnstaking;
      }

      // Calculate weighted average APR based on USD values
      const avgAPR = totalStakedValueForAPR > 0 ? weightedAPRSum / totalStakedValueForAPR : 
        (processedStakedAssets.length > 0 ? processedStakedAssets.reduce((sum: number, asset: StakedAsset) => sum + asset.apr, 0) / processedStakedAssets.length : 0);

      // All values are now in USD
      setOverview({
        totalStakedValue: totalStakedUSD,
        totalPendingRewards: totalRewardsUSD,
        totalUnstakingValue: totalUnstakingUSD,
        totalAvailableValue: totalAvailable,
        averageAPR: avgAPR
      });
      
    } catch (err) {
      console.error('Error fetching portfolio data:', err);
      setError('Failed to load portfolio data');
      
      setAvailableBalances([]);
      setStakedAssets([]);
      setUnstakingAssets([]);
      setOverview({
        totalStakedValue: 0,
        totalPendingRewards: 0,
        totalUnstakingValue: 0,
        totalAvailableValue: 0,
        averageAPR: 0
      });
    } finally {
      setLoading(false);
      isRequestInProgress.current = false; // Reset the flag
    }
  }, [primaryAddress, keplrPublicKey, namadaAddress]); // Add dependencies for useCallback

  // Function to create transaction record in backend
  const createTransactionRecord = async (transactionData: {
    txHash?: string;
    userPublicAddress: string;
    chainId: string;
    chainName: string;
    type: 'undelegate' | 'claim_rewards' | 'cancel_undelegate' | 'claim_undelegate';
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

  const closeTransactionResultModal = () => {
    setTransactionResultModal({
      isOpen: false,
      success: false
    });
  };

  const handleUnstakeSubmit = useCallback(async () => {
    if (!selectedAsset || !unstakeAmount || isTransactionInProgress) return;
    
    try {
      setIsTransactionInProgress(true);
      
      console.log('Unstake action for asset:', selectedAsset.asset, 'Amount:', unstakeAmount);
      
      // Check if it's a Namada chain
      if (selectedAsset.chainName.toLowerCase().includes('namada') || selectedAsset.chainId.includes('namada')) {
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
              console.log('Fetching Namada RPC endpoints from backend for chain:', selectedAsset.chainId);
              const apiResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/apis/${selectedAsset.chainId}`);
              
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
            const connected = await namadaWallet.current.connect(selectedAsset.chainId, workingRpc);
            if (!connected) {
              throw new Error('Failed to connect to Namada wallet');
            }

            const userAddress = namadaWallet.current.getAddress();
            console.log('Connected Namada address:', userAddress);

            // Convert amount from display units to smallest denomination
            // unstakeAmount is in NAM, need to convert to namnam (1 NAM = 1,000,000 namnam)
            const amountInNamnam = (parseFloat(unstakeAmount) * 1000000).toString();
            
            console.log('Initiating Namada unstake transaction...');
            console.log('Validator:', selectedAsset.validatorAddress);
            console.log('Amount:', amountInNamnam, 'namnam');

            // Show wallet prompt notification
            showToast({
              type: 'info',
              title: 'Wallet Action Required',
              message: 'Please confirm the unstake transaction in your Namada wallet...',
              duration: 8000
            });

            // Undelegate tokens using the Namada wallet manager
            const result = await namadaWallet.current.undelegate(
              selectedAsset.validatorAddress,
              amountInNamnam,
              workingRpc,
              `Unstaking ${unstakeAmount} NAM via EthicalNode`
            );

            console.log('Namada transaction result:', result);

            // Create transaction record in backend
            await createTransactionRecord({
              txHash: result.hash || '',
              userPublicAddress: userAddress,
              chainId: selectedAsset.chainId,
              chainName: selectedAsset.chainName,
              type: 'undelegate',
              amount: amountInNamnam,
              tokenSymbol: 'NAM',
              tokenDenom: 'nam',
              validatorAddress: selectedAsset.validatorAddress,
              status: 'success',
              rawTx: result
            });

            console.log('Namada unstaking transaction completed successfully!');
            setShowUnstakeModal(false);
            setTransactionResultModal({
              isOpen: true,
              success: true,
              txHash: result.hash,
              chainName: selectedAsset.chainName,
              amount: unstakeAmount,
              tokenSymbol: 'NAM',
              validatorName: selectedAsset.validatorName,
              transactionType: 'unstake'
            });

            // Show success toast
            showToast({
              type: 'success',
              title: 'Unstaking Successful!',
              message: `Successfully unstaked ${unstakeAmount} NAM from ${selectedAsset.validatorName}`
            });

            // Refresh portfolio data
            setTimeout(() => {
              fetchPortfolioData();
            }, 2000);
          } catch (error: any) {
            console.error('Namada transaction failed:', error);
            setShowUnstakeModal(false);
            setTransactionResultModal({
              isOpen: true,
              success: false,
              chainName: selectedAsset.chainName,
              amount: unstakeAmount,
              tokenSymbol: 'NAM',
              validatorName: selectedAsset.validatorName,
              errorMessage: error.message || 'Namada transaction failed. Please try again or check your wallet connection.',
              transactionType: 'unstake'
            });

            // Show error toast
            showToast({
              type: 'error',
              title: 'Unstaking Failed',
              message: error.message || 'Transaction failed. Please try again.'
            });
          }
        } else {
          setShowUnstakeModal(false);
          setTransactionResultModal({
            isOpen: true,
            success: false,
            chainName: selectedAsset.chainName,
            amount: unstakeAmount,
            tokenSymbol: 'NAM',
            validatorName: selectedAsset.validatorName,
            errorMessage: 'Please install Namada wallet extension to unstake from Namada network.',
            transactionType: 'unstake'
          });
        }
      } else {
        // Handle Cosmos chains with Keplr using Amino signing for better UX
        if (window.keplr) {
          // Get chain registry data for gas and denomination info (outside try-catch for error handling access)
          const chainRegistryData = assetLists.find(a => a.chainName === selectedAsset.chainName);
          const chainData = chains.find(c => c.chainName === selectedAsset.chainName);
          
          if (!chainRegistryData || !chainData) {
            setShowUnstakeModal(false);
            setTransactionResultModal({
              isOpen: true,
              success: false,
              chainName: selectedAsset.chainName,
              amount: unstakeAmount,
              tokenSymbol: 'TOKEN',
              validatorName: selectedAsset.validatorName,
              errorMessage: 'This chain is not yet supported for unstaking.',
              transactionType: 'unstake'
            });
            return;
          }
          
          const stakeCurrency = chainRegistryData.assets[0];
          
          try {
            // Enable the chain
            await window.keplr.enable([selectedAsset.chainId]);
            
            const baseDenom = stakeCurrency.base;
            const exponent = stakeCurrency.denomUnits?.find(unit => unit.denom === stakeCurrency.display)?.exponent || 6;
            
            // Convert amount from display units to base units
            const amountInBaseUnits = Decimal.fromUserInput(unstakeAmount, exponent).atomics;

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
                
                console.log(`Using chain registry fee data for ${selectedAsset.chainName}:`, {
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
              const unstakingToken = chainData.staking.stakingTokens.find(token => token.denom === baseDenom);
              if (unstakingToken) {
                console.log('Found unstaking token data:', unstakingToken);
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
              console.log('Fetching RPC endpoints from backend for chain:', selectedAsset.chainId);
              const apiResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/apis/${selectedAsset.chainId}`);
              
              if (apiResponse.ok) {
                const apiData = await apiResponse.json();
                console.log('Backend API response for RPCs:', apiData);
                
                if (apiData.success && apiData.data && apiData.data.rpc && apiData.data.rpc.length > 0) {
                  // Test RPC endpoints to find working one (silently)
                  for (const rpcEndpoint of apiData.data.rpc) {
                    try {
                      console.log(`Testing RPC endpoint: ${rpcEndpoint.address}`);
                      const testResponse = await fetch(`${rpcEndpoint.address}/status`, {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' },
                        signal: AbortSignal.timeout(5000) // 5 second timeout
                      });
                      
                      if (testResponse.ok) {
                        workingRpc = rpcEndpoint.address;
                        console.log(`Found working RPC: ${workingRpc}`);
                        break;
                      }
                    } catch (rpcTest) {
                      console.warn(`RPC ${rpcEndpoint.address} not responding`);
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
            const offlineSigner = window.keplr.getOfflineSignerOnlyAmino(selectedAsset.chainId);
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

            console.log('UnDelegating tokens:', {
              delegator: signerAddress,
              validator: selectedAsset.validatorAddress,
              amount: coin,
              fee: fee
            });

            // Create the unstake message
            const unstakeMsg = {
              typeUrl: '/cosmos.staking.v1beta1.MsgUndelegate',
              value: MsgUndelegate.fromPartial({
                delegatorAddress: signerAddress,
                validatorAddress: selectedAsset.validatorAddress,
                amount: {
                  denom: coin.denom,
                  amount: coin.amount,
                },
              }),
            };

            // Send transaction
            const result = await client.signAndBroadcast(signerAddress, [unstakeMsg], fee, `Unstaking ${unstakeAmount} ${stakeCurrency.symbol} via EthicalNode`);

            console.log('Cosmos unstake transaction result:', result);
            
            if (result.code !== undefined && result.code !== 0) {
              throw new Error(`Transaction failed with code ${result.code}: ${result.rawLog}`);
            }

            // Create transaction record in backend
            await createTransactionRecord({
              txHash: result.transactionHash,
              userPublicAddress: signerAddress,
              chainId: selectedAsset.chainId,
              chainName: selectedAsset.chainName,
              type: 'undelegate',
              amount: amountInBaseUnits,
              tokenSymbol: stakeCurrency.symbol || selectedAsset.asset,
              tokenDenom: baseDenom,
              validatorAddress: selectedAsset.validatorAddress,
              status: 'success',
              rawTx: result
            });

            console.log('Cosmos unstaking transaction completed successfully!');
            setShowUnstakeModal(false);
            setTransactionResultModal({
              isOpen: true,
              success: true,
              txHash: result.transactionHash,
              chainName: selectedAsset.chainName,
              amount: unstakeAmount,
              tokenSymbol: stakeCurrency.symbol || selectedAsset.asset,
              validatorName: selectedAsset.validatorName,
              transactionType: 'unstake'
            });

            // Show success toast
            showToast({
              type: 'success',
              title: 'Unstaking Successful!',
              message: `Successfully unstaked ${unstakeAmount} ${stakeCurrency.symbol} from ${selectedAsset.validatorName}`
            });

            // Refresh portfolio data
            setTimeout(() => {
              fetchPortfolioData();
            }, 2000);

          } catch (error: any) {
            console.error('Cosmos unstaking transaction failed:', error);
            setShowUnstakeModal(false);
            setTransactionResultModal({
              isOpen: true,
              success: false,
              chainName: selectedAsset.chainName,
              amount: unstakeAmount,
              tokenSymbol: stakeCurrency?.symbol || selectedAsset.asset,
              validatorName: selectedAsset.validatorName,
              errorMessage: error.message || 'Transaction failed. Please try again.',
              transactionType: 'unstake'
            });

            // Show error toast
            showToast({
              type: 'error',
              title: 'Unstaking Failed',
              message: error.message || 'Transaction failed. Please try again.'
            });
          }
        } else {
          setShowUnstakeModal(false);
          setTransactionResultModal({
            isOpen: true,
            success: false,
            chainName: selectedAsset.chainName,
            amount: unstakeAmount,
            tokenSymbol: selectedAsset.asset,
            validatorName: selectedAsset.validatorName,
            errorMessage: 'Please install Keplr wallet extension to unstake from Cosmos networks.',
            transactionType: 'unstake'
          });
        }
      }
    } catch (error) {
      console.error('Unstaking transaction failed:', error);
      setShowUnstakeModal(false);
      setTransactionResultModal({
        isOpen: true,
        success: false,
        chainName: selectedAsset?.chainName || 'Unknown',
        amount: unstakeAmount,
        tokenSymbol: selectedAsset?.asset || 'TOKEN',
        validatorName: selectedAsset?.validatorName || 'Unknown',
        errorMessage: 'An unexpected error occurred. Please try again.',
        transactionType: 'unstake'
      });
    } finally {
      setIsTransactionInProgress(false);
    }
  }, [selectedAsset, unstakeAmount, isTransactionInProgress, showToast, namadaWallet, createTransactionRecord, setTransactionResultModal]);

  const handleClaimRewardsSubmit = useCallback(async () => {
    if (!selectedAsset || isTransactionInProgress) return;
    
    try {
      setIsTransactionInProgress(true);
      
      console.log('Claim rewards action for asset:', selectedAsset.asset, 'Amount:', selectedAsset.pendingRewards);
      
      // Check if it's a Namada chain
      if (selectedAsset.chainName.toLowerCase().includes('namada') || selectedAsset.chainId.includes('namada')) {
        // Handle Namada transactions
        if (window.namada) {
          try {
            // Add debugging to check Namada extension
            console.log('=== NAMADA CLAIM REWARDS DEBUG ===');
            console.log('window.namada exists:', !!window.namada);
            if (window.namada) {
              console.log('Namada extension methods:', Object.keys(window.namada));
              console.log('Namada extension object:', window.namada);
            }
            console.log('====================');

            // Initialize Namada wallet manager if not already done
            if (!namadaWallet.current) {
              namadaWallet.current = new NamadaWalletManager();
            }

            // Get working RPC endpoints from backend API for Namada
            let workingRpc = null;
            try {
              console.log('Fetching Namada RPC endpoints from backend for chain:', selectedAsset.chainId);
              const apiResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/apis/${selectedAsset.chainId}`);
              
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
            const connected = await namadaWallet.current.connect(selectedAsset.chainId, workingRpc);
            if (!connected) {
              throw new Error('Failed to connect to Namada wallet');
            }

            const userAddress = namadaWallet.current.getAddress();
            console.log('Connected Namada address:', userAddress);

            console.log('Initiating Namada claim rewards transaction...');
            console.log('Validator:', selectedAsset.validatorAddress);
            console.log('Rewards:', selectedAsset.pendingRewards, 'NAM');

            // Show wallet prompt notification
            showToast({
              type: 'info',
              title: 'Wallet Action Required',
              message: 'Please confirm the claim rewards transaction in your Namada wallet...',
              duration: 8000
            });

            // Claim rewards using the Namada wallet manager
            const result = await namadaWallet.current.claimRewards(
              selectedAsset.validatorAddress,
              workingRpc,
              `Claiming rewards via EthicalNode`
            );

            console.log('Namada transaction result:', result);
            // convert amount from nam to namnam for record
            const claimedAmountInNAMnam = (parseFloat(selectedAsset.pendingRewards) * 1000000).toString();

            // Create transaction record in backend
            await createTransactionRecord({
              txHash: result.hash || '',
              userPublicAddress: userAddress,
              chainId: selectedAsset.chainId,
              chainName: selectedAsset.chainName,
              type: 'claim_rewards',
              amount: claimedAmountInNAMnam,
              tokenSymbol: 'NAM',
              tokenDenom: 'nam',
              validatorAddress: selectedAsset.validatorAddress,
              status: 'success',
              rawTx: result
            });

            console.log('Namada claim rewards transaction completed successfully!');
            setShowClaimRewardsModal(false);
            setTransactionResultModal({
              isOpen: true,
              success: true,
              txHash: result.hash,
              chainName: selectedAsset.chainName,
              amount: selectedAsset.pendingRewards,
              tokenSymbol: 'NAM',
              validatorName: selectedAsset.validatorName,
              transactionType: 'claim'
            });

            // Show success toast
            showToast({
              type: 'success',
              title: 'Claim Rewards Successful!',
              message: `Successfully claimed ${selectedAsset.pendingRewards} NAM rewards from ${selectedAsset.validatorName}`
            });

            // Refresh portfolio data
            setTimeout(() => {
              fetchPortfolioData();
            }, 2000);

          } catch (error: any) {
            console.error('Namada transaction failed:', error);
            
            // Check for specific error messages and provide user-friendly explanations
            let userFriendlyMessage = error.message || 'Namada transaction failed. Please try again or check your wallet connection.';
            
            if (error.message && error.message.includes('no unbonded bonds ready to withdraw')) {
              userFriendlyMessage = `No rewards are currently available to claim for this epoch. 

In Namada, rewards are epoch-based and may require specific conditions:
• Rewards may only be claimable after certain epochs have passed
• Some validators require bonds to be unbonded before claiming rewards  
• The rewards shown (${selectedAsset.pendingRewards} NAM) represent accumulated rewards that may become available in future epochs

Please try again later or check with the validator for specific requirements.`;
            } else if (error.message && error.message.includes('current epoch')) {
              userFriendlyMessage = `Rewards are not yet available for withdrawal in the current epoch. 

Namada uses an epoch-based reward system. The rewards shown (${selectedAsset.pendingRewards} NAM) may become available for withdrawal in upcoming epochs. Please wait for the next epoch and try again.`;
            }
            
            setShowClaimRewardsModal(false);
            setTransactionResultModal({
              isOpen: true,
              success: false,
              chainName: selectedAsset.chainName,
              amount: selectedAsset.pendingRewards,
              tokenSymbol: 'NAM',
              validatorName: selectedAsset.validatorName,
              errorMessage: userFriendlyMessage,
              transactionType: 'claim'
            });

            // Show error toast
            showToast({
              type: 'error',
              title: 'Claim Rewards Failed',
              message: error.message || 'Transaction failed. Please try again.'
            });
          }
        } else {
          setShowClaimRewardsModal(false);
          setTransactionResultModal({
            isOpen: true,
            success: false,
            chainName: selectedAsset.chainName,
            amount: selectedAsset.pendingRewards,
            tokenSymbol: 'NAM',
            validatorName: selectedAsset.validatorName,
            errorMessage: 'Please install Namada wallet extension to claim rewards from Namada network.',
            transactionType: 'claim'
          });
        }
      } else {
        // Handle Cosmos chains with Keplr
        if (window.keplr) {
          // Get chain registry data for gas and denomination info
          const chainRegistryData = assetLists.find(a => a.chainName === selectedAsset.chainName);
          const chainData = chains.find(c => c.chainName === selectedAsset.chainName);
          
          if (!chainRegistryData || !chainData) {
            setShowClaimRewardsModal(false);
            setTransactionResultModal({
              isOpen: true,
              success: false,
              chainName: selectedAsset.chainName,
              amount: selectedAsset.pendingRewards,
              tokenSymbol: 'TOKEN',
              validatorName: selectedAsset.validatorName,
              errorMessage: 'This chain is not yet supported for claiming rewards.',
              transactionType: 'claim'
            });
            return;
          }
          
          const stakeCurrency = chainRegistryData.assets[0];
          
          try {
            // Enable the chain
            await window.keplr.enable([selectedAsset.chainId]);
            console.log('Chain data found:', {
              chainName: selectedAsset.chainName,
              chainData: chainData,
              assetData: chainRegistryData
            });
            
            const baseDenom = stakeCurrency.base;
            const exponent = stakeCurrency.denomUnits?.find(unit => unit.denom === stakeCurrency.display)?.exponent || 6;
            
            // Convert amount from display units to base units
            const amountInBaseUnits = Decimal.fromUserInput(selectedAsset.pendingRewards, exponent).atomics;

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
                
                console.log(`Using chain registry fee data for ${selectedAsset.chainName}:`, {
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
              console.log('Fetching RPC endpoints from backend for chain:', selectedAsset.chainId);
              const apiResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/apis/${selectedAsset.chainId}`);
              
              if (apiResponse.ok) {
                const apiData = await apiResponse.json();
                console.log('Backend API response for RPCs:', apiData);
                
                if (apiData.success && apiData.data && apiData.data.rpc && apiData.data.rpc.length > 0) {
                  // Test RPC endpoints to find working one (silently)
                  for (const rpcEndpoint of apiData.data.rpc) {
                    try {
                      console.log(`Testing RPC endpoint: ${rpcEndpoint.address}`);
                      const testResponse = await fetch(`${rpcEndpoint.address}/status`, {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' },
                        signal: AbortSignal.timeout(5000) // 5 second timeout
                      });
                      
                      if (testResponse.ok) {
                        workingRpc = rpcEndpoint.address;
                        console.log(`Found working RPC: ${workingRpc}`);
                        break;
                      }
                    } catch (rpcTest) {
                      console.warn(`RPC ${rpcEndpoint.address} not responding`);
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
            const offlineSigner = window.keplr.getOfflineSignerOnlyAmino(selectedAsset.chainId);
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
            
            // Connect signing client to RPC endpoint
            const client = await SigningStargateClient.connectWithSigner(
              workingRpc,
              offlineSigner as any // Cast to any to avoid TypeScript issues with Keplr's signer
            );
            
            console.log('Claim rewards details:', {
              signerAddress,
              validatorAddress: selectedAsset.validatorAddress,
              symbol: stakeCurrency.symbol
            });

            // Create the claim rewards message
            const claimMsg = {
              typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
              value: MsgWithdrawDelegatorReward.fromPartial({
                delegatorAddress: signerAddress,
                validatorAddress: selectedAsset.validatorAddress,
              }),
            };

            // Send transaction
            const result = await client.signAndBroadcast(signerAddress, [claimMsg], fee, `Claiming rewards via EthicalNode`);

            console.log('Cosmos claim rewards transaction result:', result);
            
            if (result.code !== undefined && result.code !== 0) {
              throw new Error(`Transaction failed with code ${result.code}: ${result.rawLog}`);
            }
            // Create transaction record in backend
            await createTransactionRecord({
              txHash: result.transactionHash,
              userPublicAddress: signerAddress,
              chainId: selectedAsset.chainId,
              chainName: selectedAsset.chainName,
              type: 'claim_rewards',
              amount: amountInBaseUnits,
              tokenSymbol: stakeCurrency.symbol || selectedAsset.asset,
              tokenDenom: baseDenom,
              validatorAddress: selectedAsset.validatorAddress,
              status: 'success',
              rawTx: result
            });

            console.log('Cosmos claim rewards transaction completed successfully!');
            setShowClaimRewardsModal(false);
            setTransactionResultModal({
              isOpen: true,
              success: true,
              txHash: result.transactionHash,
              chainName: selectedAsset.chainName,
              amount: selectedAsset.pendingRewards,
              tokenSymbol: stakeCurrency.symbol || selectedAsset.asset,
              validatorName: selectedAsset.validatorName,
              transactionType: 'claim'
            });

            // Show success toast
            showToast({
              type: 'success',
              title: 'Claim Rewards Successful!',
              message: `Successfully claimed ${selectedAsset.pendingRewards} ${stakeCurrency.symbol} rewards from ${selectedAsset.validatorName}`
            });

          } catch (error: any) {
            console.error('Cosmos claim rewards transaction failed:', error);
            setShowClaimRewardsModal(false);
            setTransactionResultModal({
              isOpen: true,
              success: false,
              chainName: selectedAsset.chainName,
              amount: selectedAsset.pendingRewards,
              tokenSymbol: stakeCurrency?.symbol || selectedAsset.asset,
              validatorName: selectedAsset.validatorName,
              errorMessage: error.message || 'Transaction failed. Please try again.',
              transactionType: 'claim'
            });

            // Show error toast
            showToast({
              type: 'error',
              title: 'Claim Rewards Failed',
              message: error.message || 'Transaction failed. Please try again.'
            });

            // Refresh portfolio data
            setTimeout(() => {
              fetchPortfolioData();
            }, 2000);
          }
        } else {
          setShowClaimRewardsModal(false);
          setTransactionResultModal({
            isOpen: true,
            success: false,
            chainName: selectedAsset.chainName,
            amount: selectedAsset.pendingRewards,
            tokenSymbol: selectedAsset.asset,
            validatorName: selectedAsset.validatorName,
            errorMessage: 'Please install Keplr wallet extension to claim rewards from Cosmos networks.',
            transactionType: 'claim'
          });
        }
      }
    } catch (error) {
      console.error('Claim rewards transaction failed:', error);
      setShowClaimRewardsModal(false);
      setTransactionResultModal({
        isOpen: true,
        success: false,
        chainName: selectedAsset?.chainName || 'Unknown',
        amount: selectedAsset?.pendingRewards || '0',
        tokenSymbol: selectedAsset?.asset || 'TOKEN',
        validatorName: selectedAsset?.validatorName || 'Unknown',
        errorMessage: 'An unexpected error occurred. Please try again.',
        transactionType: 'claim'
      });
    } finally {
      setIsTransactionInProgress(false);
    }
  }, [selectedAsset, isTransactionInProgress, showToast, namadaWallet, createTransactionRecord, setTransactionResultModal]);

  const handleCancelUnstakingSubmit = useCallback(async () => {
    if (!selectedUnstakingAsset || isTransactionInProgress) return;
    
    // Skip Namada chains for now as cancel unstaking is only implemented for Cosmos chains
    if (selectedUnstakingAsset.chainName.toLowerCase().includes('namada') || selectedUnstakingAsset.chainId.includes('namada')) {
      showToast({
        type: 'error',
        title: 'Not Supported',
        message: 'Cancel unstaking is not available for Namada chains'
      });
      return;
    }

    // Validate required data for cancel unbonding
    if (!selectedUnstakingAsset.creationHeight || !selectedUnstakingAsset.validatorAddress) {
      showToast({
        type: 'error',
        title: 'Missing Data',
        message: 'Required data for cancel unstaking is not available'
      });
      return;
    }
    
    try {
      setIsTransactionInProgress(true);
      
      console.log('Cancel unstaking for asset:', selectedUnstakingAsset);
      
      // Handle Cosmos-based chains
      if (!window.keplr || !keplrPublicKey) {
        throw new Error('Keplr wallet not available');
      }

      // Enable the chain in Keplr
      await window.keplr.enable([selectedUnstakingAsset.chainId]);
      
      // Get the offline signer
      const offlineSigner = window.keplr.getOfflineSignerOnlyAmino(selectedUnstakingAsset.chainId);
      const accounts = await offlineSigner.getAccounts();
      const userAddress = accounts[0].address;

      // Get working RPC endpoints from backend API
      let workingRpc = null;
      try {
        console.log('Fetching RPC endpoints from backend for chain:', selectedUnstakingAsset.chainId);
        const apiResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/apis/${selectedUnstakingAsset.chainId}`);
        
        if (apiResponse.ok) {
          const apiData = await apiResponse.json();
          console.log('Backend API response for RPCs:', apiData);
          
          if (apiData.success && apiData.data && apiData.data.rpc && apiData.data.rpc.length > 0) {
            // Test RPC endpoints to find working one
            for (const rpcEndpoint of apiData.data.rpc) {
              try {
                console.log(`Testing RPC endpoint: ${rpcEndpoint.address}`);
                const testResponse = await fetch(`${rpcEndpoint.address}/status`, {
                  method: 'GET',
                  headers: { 'Content-Type': 'application/json' },
                  signal: AbortSignal.timeout(5000) // 5 second timeout
                });
                
                if (testResponse.ok) {
                  workingRpc = rpcEndpoint.address;
                  console.log(`Found working RPC: ${workingRpc}`);
                  break;
                }
              } catch (rpcError) {
                console.log(`RPC ${rpcEndpoint.address} failed:`, rpcError);
                continue;
              }
            }
          }
        }
      } catch (apiError) {
        console.warn('Failed to fetch RPC endpoints from backend:', apiError);
      }

      // Fallback to default RPC if no working RPC found
      if (!workingRpc) {
        const fallbackRpcs: { [key: string]: string } = {
          'cosmoshub-4': 'https://cosmos-rpc.polkachu.com',
          'akashnet-2': 'https://akash-rpc.polkachu.com',
          'fetchhub-4': 'https://fetch-rpc.polkachu.com',
          'osmosis-1': 'https://osmosis-rpc.polkachu.com'
        };
        workingRpc = fallbackRpcs[selectedUnstakingAsset.chainId] || 'https://cosmos-rpc.polkachu.com';
        console.log(`Using fallback RPC: ${workingRpc}`);
      }

      // Create the signing client
      const client = await SigningStargateClient.connectWithSigner(
        workingRpc,
        offlineSigner as any // Cast to any to avoid TypeScript issues with Keplr's signer
      );

      // Get chain asset data for fee calculation
      const assetData = getChainAssetData(selectedUnstakingAsset.chainName);
      
      // Get chain registry data for dynamic fee calculation
      const chainRegistryData = assetLists.find(a => a.chainName === selectedUnstakingAsset.chainName);
      const chainData = chains.find(c => c.chainName === selectedUnstakingAsset.chainName);
      
      if (!chainRegistryData || !chainData) {
        console.warn(`Chain registry data not found for ${selectedUnstakingAsset.chainName}, using default fees`);
        // Continue with default values rather than throwing error
      }
      
      // Convert display amount back to base denomination
      const baseDenom = assetData.baseDenom;
      const decimals = assetData.decimals;
      const amountInBaseDenom = (parseFloat(selectedUnstakingAsset.amount) * Math.pow(10, decimals)).toString();

      // Calculate gas fee using chain registry data
      let gasAmount = "800000"; // Higher gas limit for cancel unbonding (more complex operation)
      let feeAmount = "4800"; // Default fallback (increased proportionally)
      
      // Adjust gas limit based on chain if needed
      const chainSpecificGasLimits: { [key: string]: string } = {
        'cosmoshub-4': '600000',  // Cosmos Hub typically needs less gas
        'akashnet-2': '800000',   // Akash may need more gas
        'fetchhub-4': '700000',   // Fetch.ai
        'osmosis-1': '900000'     // Osmosis may need more for complex operations
      };
      
      if (chainSpecificGasLimits[selectedUnstakingAsset.chainId]) {
        gasAmount = chainSpecificGasLimits[selectedUnstakingAsset.chainId];
        console.log(`Using chain-specific gas limit for ${selectedUnstakingAsset.chainId}: ${gasAmount}`);
      }
      
      // Get fee information from chain data
      if (chainData && chainData.fees && chainData.fees.feeTokens && chainData.fees.feeTokens.length > 0) {
        const feeToken = chainData.fees.feeTokens.find(token => token.denom === baseDenom) || chainData.fees.feeTokens[0];
        
        if (feeToken) {
          // Use average gas price if available, otherwise use fixed min gas price
          let gasPrice = feeToken.averageGasPrice || feeToken.fixedMinGasPrice || feeToken.lowGasPrice || 0.005;
          
          // Calculate fee amount based on gas limit and gas price
          // Gas price is usually in display units, so convert to base units
          const feeInBaseUnits = Math.ceil(parseInt(gasAmount) * gasPrice);
          feeAmount = feeInBaseUnits.toString();
          
          console.log(`Using chain registry fee data for ${selectedUnstakingAsset.chainName} cancel unstaking:`, {
            gasPrice,
            gasAmount,
            feeAmount,
            baseDenom,
            decimals,
            feeToken
          });
        }
      }
      
      // Get additional gas limit from chain data if available
      if (chainData && chainData.staking && chainData.staking.stakingTokens && chainData.staking.stakingTokens.length > 0) {
        const stakingToken = chainData.staking.stakingTokens.find(token => token.denom === baseDenom);
        if (stakingToken) {
          console.log('Found staking token data for cancel unstaking:', stakingToken);
        }
      }

      // Create the MsgCancelUnbondingDelegation message
      const message = {
        typeUrl: '/cosmos.staking.v1beta1.MsgCancelUnbondingDelegation',
        value: MsgCancelUnbondingDelegation.fromPartial({
          delegatorAddress: userAddress,
          validatorAddress: selectedUnstakingAsset.validatorAddress,
          amount: {
            denom: baseDenom,
            amount: amountInBaseDenom,
          },
          creationHeight: BigInt(selectedUnstakingAsset.creationHeight),
        }),
      };

      console.log('Created cancel unbonding message:', message);

      // Use dynamically calculated fee
      const fee = {
        gas: gasAmount,
        amount: [{
          denom: baseDenom,
          amount: feeAmount
        }]
      };

      // Sign and broadcast the transaction
      console.log('Signing and broadcasting cancel unstaking transaction...');
      const result = await client.signAndBroadcast(userAddress, [message], fee);
      
      console.log('Cancel unstaking transaction result:', result);

      if (result.code !== 0) {
        throw new Error(result.rawLog || 'Transaction failed');
      }

      // Create transaction record
      await createTransactionRecord({
        userPublicAddress: userAddress,
        chainId: selectedUnstakingAsset.chainId,
        chainName: selectedUnstakingAsset.chainName,
        type: 'cancel_undelegate',
        amount: amountInBaseDenom,
        tokenSymbol: selectedUnstakingAsset.asset,
        tokenDenom: baseDenom,
        validatorAddress: selectedUnstakingAsset.validatorAddress,
        status: 'success',
        txHash: result.transactionHash,
        rawTx: result
      });

      console.log('Cancel unstaking transaction completed successfully!');
      setShowCancelUnstakingModal(false);
      setTransactionResultModal({
        isOpen: true,
        success: true,
        txHash: result.transactionHash,
        chainName: selectedUnstakingAsset.chainName,
        amount: selectedUnstakingAsset.amount,
        tokenSymbol: selectedUnstakingAsset.asset,
        transactionType: 'cancel_undelegate'
      });

      // Show success toast
      showToast({
        type: 'success',
        title: 'Cancel Unstaking Successful!',
        message: `Successfully cancelled unstaking of ${selectedUnstakingAsset.amount} ${selectedUnstakingAsset.asset} from ${selectedUnstakingAsset.chainName}`
      });

      // Refresh portfolio data
      setTimeout(() => {
        fetchPortfolioData();
      }, 2000);

    } catch (error: any) {
      console.error('Cancel unstaking error:', error);
      
      let errorMessage = 'Failed to cancel unstaking';
      if (error?.message) {
        if (error.message.includes('Request rejected')) {
          errorMessage = 'Transaction was rejected by the user';
        } else if (error.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds for transaction fee';
        } else {
          errorMessage = error.message;
        }
      }

      setTransactionResultModal({
        isOpen: true,
        success: false,
        chainName: selectedUnstakingAsset.chainName,
        amount: selectedUnstakingAsset.amount,
        tokenSymbol: selectedUnstakingAsset.asset,
        errorMessage: errorMessage,
        transactionType: 'cancel_undelegate'
      });

      showToast({
        type: 'error',
        title: 'Cancel Unstaking Failed',
        message: errorMessage
      });
    } finally {
      setIsTransactionInProgress(false);
    }
  }, [selectedUnstakingAsset, isTransactionInProgress, showToast, keplrPublicKey, createTransactionRecord, setTransactionResultModal, fetchPortfolioData]);

  useEffect(() => {
    if (!isConnected) {
      setAvailableBalances([]);
      setStakedAssets([]);
      setUnstakingAssets([]);
      setOverview({
        totalStakedValue: 0,
        totalPendingRewards: 0,
        totalUnstakingValue: 0,
        totalAvailableValue: 0,
        averageAPR: 0
      });
      setLoading(false);
      hasInitialized.current = false; // Reset when disconnected
      isRequestInProgress.current = false; // Reset request flag
      return;
    }

    // Fetch data whenever the primary address changes (wallet switch)
    if (primaryAddress && !isRequestInProgress.current) {
      console.log('Wallet address changed, fetching new portfolio data for:', primaryAddress);
      hasInitialized.current = false; // Allow refetch on address change
      
      // Add a small delay to ensure backend investor profile is updated first
      setTimeout(() => {
        fetchPortfolioData();
      }, 750); // 750ms delay to ensure backend has processed the wallet change
    }
  }, [isConnected, primaryAddress, fetchPortfolioData]); // Add primaryAddress to dependencies

  // Show Namada notification if wallet is not available
  useEffect(() => {
    if (namadaNotAvailable) {
      setShowNamadaNotification(true);
    }
  }, [namadaNotAvailable]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className={`p-6 ${isDarkMode ? 'bg-gray-900' : 'bg-white'} min-h-screen`}>
      {/* Namada Not Available Notification */}
      {showNamadaNotification && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 right-4 z-50 max-w-sm w-full"
        >
          <div className={`rounded-lg shadow-lg border-2 p-4 ${
            isDarkMode 
              ? 'bg-yellow-900 border-yellow-600 text-yellow-100' 
              : 'bg-yellow-50 border-yellow-300 text-yellow-800'
          }`}>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="ml-3 w-0 flex-1">
                <h3 className="text-sm font-medium mb-1">
                  Namada Wallet Not Detected
                </h3>
                <p className="text-sm">
                  The Namada wallet extension was not found. Please install it to access the full functionality of the platform.
                </p>
                <div className="mt-3">
                  <button
                    onClick={() => window.open('https://namada.net/keychain', '_blank')}
                    className={`text-sm underline font-medium hover:no-underline ${
                      isDarkMode ? 'text-yellow-200' : 'text-yellow-700'
                    }`}
                  >
                    Install Namada Wallet
                  </button>
                </div>
              </div>
              <div className="ml-4 flex-shrink-0">
                <button
                  onClick={() => setShowNamadaNotification(false)}
                  className={`rounded-md inline-flex ${
                    isDarkMode 
                      ? 'text-yellow-200 hover:text-yellow-100' 
                      : 'text-yellow-600 hover:text-yellow-800'
                  }`}
                >
                  <span className="sr-only">Close</span>
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

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
          Portfolio
        </h1>
        <p className={`text-lg ${
          isDarkMode ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Overview of your staked assets and pending rewards
        </p>
      </motion.div>

      {!isConnected ? (
        <div className="text-center py-12">
          <div className={`text-lg mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Wallet not connected
          </div>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Please connect your wallet to view your portfolio
          </p>
        </div>
      ) : loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="flex items-center gap-3">
            <svg className="animate-spin h-8 w-8 text-teal-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Loading portfolio...
            </span>
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <div className={`text-lg mb-4 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
            Failed to load portfolio
          </div>
          <p className={`text-sm mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {error}
          </p>
          <button
            onClick={fetchPortfolioData}
            className="bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Overview Cards */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className={`p-6 rounded-lg border ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}>
              <h3 className={`text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Total Balance
              </h3>
              <p className={`text-2xl font-bold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                ${(overview.totalStakedValue + overview.totalPendingRewards + overview.totalUnstakingValue + overview.totalAvailableValue).toFixed(2)}
              </p>
            </div>

            <div className={`p-6 rounded-lg border ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}>
              <h3 className={`text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Available Balance
              </h3>
              <p className={`text-2xl font-bold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                ${overview.totalAvailableValue.toFixed(2)}
              </p>
            </div>
            <div className={`p-6 rounded-lg border ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}>
              <h3 className={`text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Total Staked
              </h3>
              <p className={`text-2xl font-bold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                ${overview.totalStakedValue.toFixed(2)}
              </p>
            </div>

            <div className={`p-6 rounded-lg border ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}>
              <h3 className={`text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Pending Rewards
              </h3>
              <p className={`text-2xl font-bold text-green-600 ${
                isDarkMode ? 'text-green-400' : 'text-green-600'
              }`}>
                ${overview.totalPendingRewards.toFixed(2)}
              </p>
            </div>

            <div className={`p-6 rounded-lg border ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}>
              <h3 className={`text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Unstaking
              </h3>
              <p className={`text-2xl font-bold text-yellow-600 ${
                isDarkMode ? 'text-yellow-400' : 'text-yellow-600'
              }`}>
                ${overview.totalUnstakingValue.toFixed(2)}
              </p>
            </div>

            {/* <div className={`p-6 rounded-lg border ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}>
              <h3 className={`text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Assets
              </h3>
              <p className={`text-2xl font-bold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {overview.totalAssets}
              </p>
            </div> */}

            <div className={`p-6 rounded-lg border ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}>
              <h3 className={`text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Avg APR
              </h3>
              <p className={`text-2xl font-bold text-teal-600 ${
                isDarkMode ? 'text-teal-400' : 'text-teal-600'
              }`}>
                {overview.averageAPR.toFixed(1)}%
              </p>
            </div>
          </motion.div>

          {/* Available Balances and Unstaking Assets Row */}
          <motion.div
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {/* Available Balances - 1/3 width */}
            <div className="lg:col-span-1">
              <h2 className={`text-xl font-bold mb-4 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Available Balances
              </h2>
              
              {availableBalances.length === 0 ? (
                <div className={`text-center py-6 rounded-lg border ${
                  isDarkMode 
                    ? 'bg-gray-800 border-gray-700 text-gray-400' 
                    : 'bg-white border-gray-200 text-gray-600'
                }`}>
                  No available balances
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border shadow-sm">
                  <div className="overflow-x-auto">
                    <table className={`min-w-full divide-y ${
                      isDarkMode 
                        ? 'bg-gray-800 border-gray-700 divide-gray-700' 
                        : 'bg-white border-gray-200 divide-gray-200'
                    }`}>
                      <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                        <tr>
                          <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-500'
                          }`}>
                            Asset
                          </th>
                          <th className={`px-4 py-3 text-right text-xs font-medium uppercase tracking-wider ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-500'
                          }`}>
                            Balance
                          </th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${
                        isDarkMode ? 'divide-gray-700' : 'divide-gray-200'
                      }`}>
                        {availableBalances.map((balance, index) => {
                          const usdValue = parseFloat(balance.displayBalance || '0') * (balance.usdPrice || 0);
                          return (
                            <motion.tr
                              key={balance._id}
                              className={`hover:${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} transition-colors duration-200`}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.4, delay: index * 0.1 }}
                            >
                              <td className={`px-4 py-3 whitespace-nowrap ${
                                isDarkMode ? 'text-white' : 'text-gray-900'
                              }`}>
                                <div className="flex items-center">
                                  <div className="w-8 h-8 rounded-full flex items-center justify-center mr-3 overflow-hidden">
                                    {balance.logoUrl ? (
                                      <img 
                                        src={balance.logoUrl} 
                                        alt={`${balance.asset} logo`}
                                        className="w-8 h-8 rounded-full object-contain"
                                        onError={(e) => {
                                          // Fallback to text icon if image fails to load
                                          const target = e.target as HTMLImageElement;
                                          target.style.display = 'none';
                                          const parent = target.parentElement;
                                          if (parent) {
                                            parent.innerHTML = `<span class="text-xs font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}">${balance.asset.slice(0, 2)}</span>`;
                                          }
                                        }}
                                      />
                                    ) : (
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                        balance.asset === 'ATOM' ? 'bg-blue-600 text-white' :
                                        balance.asset === 'AKT' ? 'bg-red-600 text-white' :
                                        balance.asset === 'FET' ? 'bg-purple-600 text-white' :
                                        'bg-gray-600 text-white'
                                      }`}>
                                        {balance.asset.slice(0, 2)}
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium">{balance.asset}</div>
                                    <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                      {balance.chainName}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className={`px-4 py-3 whitespace-nowrap text-right ${
                                isDarkMode ? 'text-white' : 'text-gray-900'
                              }`}>
                                <div className="text-sm font-medium">
                                  {parseFloat(balance.displayBalance || '0').toFixed(2)} {balance.asset}
                                </div>
                                <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  ${usdValue.toFixed(2)}
                                </div>
                              </td>
                            </motion.tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Unstaking Assets - 2/3 width */}
            <div className="lg:col-span-2">
              <h2 className={`text-xl font-bold mb-4 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Unstaking Assets
              </h2>
              
              {unstakingAssets.length === 0 ? (
                <div className={`text-center py-6 rounded-lg border ${
                  isDarkMode 
                    ? 'bg-gray-800 border-gray-700 text-gray-400' 
                    : 'bg-white border-gray-200 text-gray-600'
                }`}>
                  No unstaking assets
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border shadow-sm">
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
                            Asset
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-500'
                          }`}>
                            Amount
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-500'
                          }`}>
                            Completion Date
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-500'
                          }`}>
                            Days Remaining
                          </th>
                          <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-500'
                          }`}>
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${
                        isDarkMode ? 'divide-gray-700' : 'divide-gray-200'
                      }`}>
                        {unstakingAssets.map((asset, index) => (
                          <motion.tr
                            key={asset._id}
                            className={`hover:${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} transition-colors duration-200`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: index * 0.1 }}
                          >
                            <td className={`px-6 py-4 whitespace-nowrap ${
                              isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                              <div className="flex items-center">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center mr-3 overflow-hidden">
                                  {(() => {
                                    const assetData = getChainAssetData(asset.chainName);
                                    return assetData.logoUrl ? (
                                      <img 
                                        src={assetData.logoUrl} 
                                        alt={`${asset.chainName} logo`}
                                        className="w-8 h-8 rounded-full object-contain"
                                        onError={(e) => {
                                          // Fallback to text icon if image fails to load
                                          const target = e.target as HTMLImageElement;
                                          target.style.display = 'none';
                                          const parent = target.parentElement;
                                          if (parent) {
                                            parent.innerHTML = `<span class="text-xs font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}">${asset.asset.slice(0, 2)}</span>`;
                                          }
                                        }}
                                      />
                                    ) : (
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                        asset.asset === 'ATOM' ? 'bg-blue-600 text-white' :
                                        asset.asset === 'AKT' ? 'bg-red-600 text-white' :
                                        asset.asset === 'FET' ? 'bg-purple-600 text-white' :
                                        asset.asset === 'NAM' ? 'bg-green-600 text-white' :
                                        'bg-gray-600 text-white'
                                      }`}>
                                        {asset.asset.slice(0, 2)}
                                      </div>
                                    );
                                  })()}
                                </div>
                                <div>
                                  <div className="text-sm font-medium">{asset.chainName}</div>
                                  <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {asset.asset}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                              isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                              {asset.amount} {asset.asset}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                              isDarkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              {formatDate(asset.completionDate)}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                              asset.daysRemaining === 0 ? 
                                (isDarkMode ? 'text-green-400' : 'text-green-600') :
                                (isDarkMode ? 'text-yellow-400' : 'text-yellow-600')
                            }`}>
                              {asset.daysRemaining === 0 ? 'Ready' : `${asset.daysRemaining} days`}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              {asset.chainName.toLowerCase().includes('namada') ? (
                                // For Namada: show withdraw button when canWithdraw is true
                                asset.canWithdraw ? (
                                  <button
                                    onClick={() => handleWithdrawUnstaking(asset)}
                                    disabled={isTransactionInProgress}
                                    className={`px-3 py-1 text-white text-xs font-medium rounded transition-colors ${
                                      isTransactionInProgress 
                                        ? 'bg-gray-500 cursor-not-allowed' 
                                        : 'bg-green-600 hover:bg-green-700'
                                    }`}
                                  >
                                    {isTransactionInProgress ? 'Processing...' : 'Withdraw'}
                                  </button>
                                ) : (
                                  <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Pending
                                  </span>
                                )
                              ) : (
                                // For Cosmos chains: show cancel button
                                <button
                                  onClick={() => handleCancelUnstaking(asset)}
                                  className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-medium rounded transition-colors"
                                >
                                  Cancel
                                </button>
                              )}
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Staked Assets */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <h2 className={`text-2xl font-bold mb-4 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Staked Assets
            </h2>
            
            {stakedAssets.length === 0 ? (
              <div className={`text-center py-8 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                No staked assets found
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border shadow-sm">
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
                          Asset
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-500'
                        }`}>
                          Staked Amount
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-500'
                        }`}>
                          Pending Rewards
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-500'
                        }`}>
                          APR
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-500'
                        }`}>
                          Commission
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-500'
                        }`}>
                          Unbonding Period
                        </th>
                        <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-500'
                        }`}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${
                      isDarkMode ? 'divide-gray-700' : 'divide-gray-200'
                    }`}>
                      {stakedAssets.map((asset, index) => (
                        <motion.tr
                          key={asset._id}
                          className={`hover:${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} transition-colors duration-200`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.4, delay: index * 0.1 }}
                        >
                          <td className={`px-6 py-4 whitespace-nowrap ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            <div className="flex items-center">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center mr-3 overflow-hidden">
                                {(() => {
                                  const assetData = getChainAssetData(asset.chainName);
                                  return assetData.logoUrl ? (
                                    <img 
                                      src={assetData.logoUrl} 
                                      alt={`${asset.chainName} logo`}
                                      className="w-8 h-8 rounded-full object-contain"
                                      onError={(e) => {
                                        // Fallback to text icon if image fails to load
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        const parent = target.parentElement;
                                        if (parent) {
                                          parent.innerHTML = `<span class="text-xs font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}">${asset.asset.slice(0, 2)}</span>`;
                                        }
                                      }}
                                    />
                                  ) : (
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                      asset.asset === 'ATOM' ? 'bg-blue-600 text-white' :
                                      asset.asset === 'AKT' ? 'bg-red-600 text-white' :
                                      asset.asset === 'FET' ? 'bg-purple-600 text-white' :
                                      'bg-gray-600 text-white'
                                    }`}>
                                      {asset.asset.slice(0, 2)}
                                    </div>
                                  );
                                })()}
                              </div>
                              <div>
                                <div className="text-sm font-medium">{asset.chainName}</div>
                                <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {asset.asset}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            {asset.stakedAmount} {asset.asset}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                            isDarkMode ? 'text-green-400' : 'text-green-600'
                          }`}>
                            {asset.pendingRewards} {asset.asset}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                            isDarkMode ? 'text-teal-400' : 'text-teal-600'
                          }`}>
                            {asset.apr.toFixed(1)}%
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>
                            {asset.commission ? `${asset.commission.toFixed(1)}%` : 'N/A'}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>
                            {asset.unbondingPeriod || 21} days
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={() => handleUnstake(asset)}
                                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded transition-colors"
                              >
                                Unstake
                              </button>
                              <button
                                onClick={() => handleClaimRewards(asset)}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
                              >
                                Claim Rewards
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Unstake Modal */}
      {showUnstakeModal && selectedAsset && (
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 w-full max-w-md mx-4`}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Unstake {selectedAsset.asset}
              </h3>
              <button
                onClick={() => setShowUnstakeModal(false)}
                className={`text-gray-400 hover:text-gray-600`}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Validator
                </label>
                <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {selectedAsset.validatorName}
                </div>
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Staked Amount
                </label>
                <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {selectedAsset.stakedAmount} {selectedAsset.asset}
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Amount to Unstake
                </label>
                <input
                  type="number"
                  value={unstakeAmount}
                  onChange={(e) => setUnstakeAmount(e.target.value)}
                  max={selectedAsset.stakedAmount}
                  step="0.000001"
                  className={`w-full p-3 border rounded-lg ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder={`Max: ${selectedAsset.stakedAmount}`}
                />
              </div>

              <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-yellow-900 border-yellow-600' : 'bg-yellow-50 border-yellow-300'} border`}>
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" />
                  <div>
                    <h4 className={`text-sm font-medium ${isDarkMode ? 'text-yellow-200' : 'text-yellow-800'}`}>
                      Unbonding Period
                    </h4>
                    <p className={`text-sm mt-1 ${isDarkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>
                      Your tokens will be locked for {selectedAsset.unbondingPeriod || 21} days after unstaking. 
                      During this time, you won't earn rewards and cannot transfer or trade these tokens.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowUnstakeModal(false)}
                className={`flex-1 py-2 px-4 border rounded-lg font-medium ${
                  isDarkMode
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleUnstakeSubmit}
                disabled={!unstakeAmount || parseFloat(unstakeAmount) <= 0 || parseFloat(unstakeAmount) > parseFloat(selectedAsset.stakedAmount) || isTransactionInProgress}
                className={`flex-1 py-2 px-4 rounded-lg font-medium text-white flex items-center justify-center ${
                  (!unstakeAmount || parseFloat(unstakeAmount) <= 0 || parseFloat(unstakeAmount) > parseFloat(selectedAsset.stakedAmount) || isTransactionInProgress)
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isTransactionInProgress ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  'Unstake'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Claim Rewards Modal */}
      {showClaimRewardsModal && selectedAsset && (
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 w-full max-w-md mx-4`}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Claim Rewards
              </h3>
              <button
                onClick={() => setShowClaimRewardsModal(false)}
                className={`text-gray-400 hover:text-gray-600`}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Validator
                </label>
                <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {selectedAsset.validatorName}
                </div>
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Pending Rewards
                </label>
                <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-green-900 border-green-600' : 'bg-green-50 border-green-300'} border`}>
                  <div className={`text-lg font-semibold ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
                    {selectedAsset.pendingRewards} {selectedAsset.asset}
                  </div>
                </div>
              </div>

              <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-blue-900 border-blue-600' : 'bg-blue-50 border-blue-300'} border`}>
                <p className={`text-sm ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                  Claiming rewards will initiate a transaction through your {selectedAsset.chainName === 'namada' ? 'Namada' : 'Keplr'} wallet extension. 
                  Please confirm the transaction when prompted.
                </p>
                {selectedAsset.chainName.toLowerCase().includes('namada') && (
                  <p className={`text-xs mt-2 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                    <strong>Note:</strong> Namada uses epoch-based rewards. If no rewards are available to claim, 
                    they may become available in upcoming epochs.
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowClaimRewardsModal(false)}
                className={`flex-1 py-2 px-4 border rounded-lg font-medium ${
                  isDarkMode
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleClaimRewardsSubmit}
                disabled={parseFloat(selectedAsset.pendingRewards) <= 0 || isTransactionInProgress}
                className={`flex-1 py-2 px-4 rounded-lg font-medium text-white flex items-center justify-center ${
                  (parseFloat(selectedAsset.pendingRewards) <= 0 || isTransactionInProgress)
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isTransactionInProgress ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  'Claim Rewards'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Cancel Unstaking Modal */}
      {showCancelUnstakingModal && selectedUnstakingAsset && (
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 w-full max-w-md mx-4`}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Cancel Unstaking
              </h3>
              <button
                onClick={() => setShowCancelUnstakingModal(false)}
                className={`p-2 rounded-lg hover:${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} transition-colors`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    This chain supports the cancellation of unstaking in progress.
                  </span>
                </div>
                <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Are you sure you want to cancel your unstaking request?
                </p>
              </div>

              <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>
                  <strong>This will reset the unstaking period and stake the tokens back to the validator.</strong>
                </p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Amount:</span>
                    <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {selectedUnstakingAsset.amount} {selectedUnstakingAsset.asset}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Chain:</span>
                    <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {selectedUnstakingAsset.chainName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Days Remaining:</span>
                    <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {selectedUnstakingAsset.daysRemaining || 0} days
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowCancelUnstakingModal(false)}
                disabled={isTransactionInProgress}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  isDarkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                } ${isTransactionInProgress ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Close
              </button>
              <button
                onClick={handleCancelUnstakingSubmit}
                disabled={isTransactionInProgress}
                className={`flex-1 py-2 px-4 rounded-lg font-medium text-white transition-colors ${
                  isTransactionInProgress
                    ? 'bg-gray-500 cursor-not-allowed'
                    : 'bg-teal-600 hover:bg-teal-700'
                }`}
              >
                {isTransactionInProgress ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Processing...
                  </div>
                ) : (
                  'Confirm'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

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
        transactionType={transactionResultModal.transactionType}
      />
    </div>
  );
};

export default InvestorPortfolio;
