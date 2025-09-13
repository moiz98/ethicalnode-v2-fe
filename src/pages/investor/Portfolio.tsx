import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { useWallet } from '../../contexts/WalletContext';
import { X, AlertTriangle } from 'lucide-react';
import { assetLists } from 'chain-registry';

// Helper function to fetch EthicalNode validator addresses from API
const fetchValidatorAddresses = async (): Promise<Record<string, string>> => {
  try {
    console.log('Fetching validator addresses from API...');
    const response = await fetch('http://localhost:3000/api/validators');
    
    if (!response.ok) {
      throw new Error(`API error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Validator addresses API response:', result);
    
    if (!result.success || !result.data) {
      throw new Error('Invalid API response format');
    }
    
    // Convert array to object with chainId as key and validatorAddress as value
    const validatorMap: Record<string, string> = {};
    result.data.forEach((validator: any) => {
      console.log('Processing validator:', validator);
      
      // Try different possible field names for chainId
      const chainId = validator.chainId;
      // Try different possible field names for validator address
      const validatorAddress = validator.validatorAddress;
      
      if (chainId && validatorAddress) {
        validatorMap[chainId] = validatorAddress;
        console.log(`Mapped ${chainId} -> ${validatorAddress}`);
      } else {
        console.warn('Missing chainId or validatorAddress in validator:', validator);
      }
    });
    
    console.log('Final validator address map (by chainId):', validatorMap);
    return validatorMap;
  } catch (error) {
    console.error('Error fetching validator addresses:', error);
    return {}; // Return empty object on error
  }
};

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

// Helper function to fetch prices from CoinGecko
const fetchCoinGeckoPrices = async (coingeckoIds: string[]): Promise<Record<string, number>> => {
  try {
    if (coingeckoIds.length === 0) {
      console.warn('No CoinGecko IDs provided');
      return {};
    }

    const uniqueIds = [...new Set(coingeckoIds.filter(id => id))]; // Remove duplicates and undefined
    if (uniqueIds.length === 0) {
      console.warn('No valid CoinGecko IDs found');
      return {};
    }

    console.log('Fetching prices for CoinGecko IDs:', uniqueIds);
    
    const idsParam = uniqueIds.join(',');
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${idsParam}&vs_currencies=usd`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error! status: ${response.status}`);
    }

    const pricesData = await response.json();
    console.log('CoinGecko prices response:', pricesData);

    // Convert to a flat object with coingeckoId as key and USD price as value
    const prices: Record<string, number> = {};
    for (const [id, data] of Object.entries(pricesData)) {
      if (data && typeof data === 'object' && 'usd' in data) {
        prices[id] = (data as { usd: number }).usd;
      }
    }

    return prices;
  } catch (error) {
    console.error('Error fetching CoinGecko prices:', error);
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
}

interface PortfolioOverview {
  totalStakedValue: number;
  totalPendingRewards: number;
  totalUnstakingValue: number;
  totalAvailableValue: number;
  // totalAssets: number;
  averageAPR: number;
}

const InvestorPortfolio: React.FC = () => {
  const { isDarkMode } = useTheme();
  const { isConnected, keplrPublicKey, namadaAddress, namadaNotAvailable } = useWallet();

  // Use Keplr address if available, otherwise use Namada
  const primaryAddress = keplrPublicKey || namadaAddress;
  const [stakedAssets, setStakedAssets] = useState<StakedAsset[]>([]);
  const [availableBalances, setAvailableBalances] = useState<AvailableBalance[]>([]);
  const [unstakingAssets, setUnstakingAssets] = useState<UnstakingAsset[]>([]);
  const [showNamadaNotification, setShowNamadaNotification] = useState(false);
  const [showUnstakeModal, setShowUnstakeModal] = useState(false);
  const [showClaimRewardsModal, setShowClaimRewardsModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<StakedAsset | null>(null);
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [isTransactionInProgress, setIsTransactionInProgress] = useState(false);
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
    // TODO: Implement cancel unstaking functionality
    alert(`Cancel unstaking ${asset.amount} ${asset.asset} from ${asset.chainName} - Coming Soon!`);
  };

  const handleWithdrawUnstaking = (asset: UnstakingAsset) => {
    console.log('Withdraw unstaking action for:', asset.chainName, asset.amount, asset.asset);
    // TODO: Implement withdraw unstaking functionality for Namada
    alert(`Withdraw ${asset.amount} ${asset.asset} from ${asset.chainName} - Coming Soon!`);
  };

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
        fetch('http://localhost:3000/api/investors/getBalances', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }),
        fetch('http://localhost:3000/api/investors/getStakingPositions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }),
        fetch('http://localhost:3000/api/investors/getUnstakingPositions', {
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

        // Fetch prices from CoinGecko for all assets with coingeckoId
        const coingeckoIds = processedBalances
          .map(balance => balance.coingeckoId)
          .filter((id): id is string => !!id);

        if (coingeckoIds.length > 0) {
          try {
            const prices = await fetchCoinGeckoPrices(coingeckoIds);
            
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
        const { linkedWallets = [] } = stakingResult.data;
        
        processedStakedAssets = stakingPositions.map((position: any, index: number) => {
          const assetData = getChainAssetData(position.chainName);
          
          // Find corresponding wallet for this chain
          const wallet = linkedWallets.find((w: any) => w.chainId === position.chainId);
          
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
            validatorAddress: wallet?.address || '',
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
              coingeckoId: assetData.coingeckoId
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
          const prices = await fetchCoinGeckoPrices(allCoingeckoIds);
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

  const handleUnstakeSubmit = useCallback(async () => {
    if (!selectedAsset || !unstakeAmount || isTransactionInProgress) return;
    
    try {
      setIsTransactionInProgress(true);
      
      console.log('Unstake submission:', {
        amount: unstakeAmount,
        asset: selectedAsset.asset,
        chainName: selectedAsset.chainName,
        chainId: selectedAsset.chainId
      });

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Show success message
      alert(`Unstake request submitted successfully!
Asset: ${selectedAsset.asset}
Amount: ${unstakeAmount}
Chain: ${selectedAsset.chainName}

This feature will be implemented soon.`);
      
      setShowUnstakeModal(false);
      
    } catch (error: any) {
      console.error('Unstake submission error:', error);
      alert(`Failed to submit unstake request: ${error.message}`);
    } finally {
      setIsTransactionInProgress(false);
    }
  }, [selectedAsset, unstakeAmount, isTransactionInProgress]);

  const handleClaimRewardsSubmit = useCallback(async () => {
    if (!selectedAsset || isTransactionInProgress) return;
    
    try {
      setIsTransactionInProgress(true);
      
      console.log('Claim rewards submission:', {
        amount: selectedAsset.pendingRewards,
        asset: selectedAsset.asset,
        chainName: selectedAsset.chainName,
        chainId: selectedAsset.chainId
      });

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Show success message
      alert(`Claim rewards request submitted successfully!
Asset: ${selectedAsset.asset}
Rewards: ${selectedAsset.pendingRewards}
Chain: ${selectedAsset.chainName}

This feature will be implemented soon.`);
      
      setShowClaimRewardsModal(false);
      
    } catch (error: any) {
      console.error('Claim rewards submission error:', error);
      alert(`Failed to submit claim rewards request: ${error.message}`);
    } finally {
      setIsTransactionInProgress(false);
    }
  }, [selectedAsset, isTransactionInProgress]);

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
                    onClick={() => window.open('https://namada.net', '_blank')}
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
                                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition-colors"
                                  >
                                    Withdraw
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
    </div>
  );
};

export default InvestorPortfolio;
