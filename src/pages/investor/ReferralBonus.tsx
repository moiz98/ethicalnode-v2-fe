import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { useWallet } from '../../contexts/WalletContext';
import { Copy, Gift, Users, Coins, Download, CheckCircle, X, AlertTriangle } from 'lucide-react';

interface ReferralData {
  referralCode: string;
  totalReferred: number;
  totalBonusEarned: number;
  totalBonusEarnedUSD: number;
  totalClaimableUSD: number;
  referralBonuses: Array<{
    chainId: string;
    chainName?: string;
    symbol?: string;
    denom: string;
    rewardEarned: number; // Rewards that user has claimed so far
    reward: number; // Rewards that user can claim
    priceUSD?: number;
    rewardEarnedUSD?: number;
    rewardUSD?: number;
  }>;
  referredUsers: Array<{
    _id: string;
    joinedAt: string;
    bonusEarned: number;
    status: 'active' | 'pending';
  }>;
}

interface PriceData {
  [key: string]: {
    usd: number;
    usd_market_cap: number;
    usd_24h_vol?: number;
    usd_24h_change: number;
  };
}

const ReferralBonus: React.FC = () => {
  const { isDarkMode } = useTheme();
  const { keplrPublicKey, isConnected } = useWallet();
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [priceData, setPriceData] = useState<PriceData>({});
  const [loading, setLoading] = useState(true);
  const [priceLoading, setPriceLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [selectedBonus, setSelectedBonus] = useState<any>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  // Fetch pricing data from backend API
  const fetchPricingData = async () => {
    try {
      setPriceLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/investors/prices`);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Full pricing API response:', result);
        
        // Handle the actual response structure: data.prices.assets.validators
        const assets = result.data?.prices?.assets;
        console.log('Extracted assets:', assets);
        
        if (result.success && assets) {
          // Transform the backend response to match our expected format
          const transformedPrices: PriceData = {};
          
          // Get prices from validators array and also halalScreener
          const allAssets = [
            ...(assets.validators || []),
            ...(assets.halalScreener || [])
          ];
          
          console.log('All assets combined:', allAssets);
          
          allAssets.forEach((asset: any) => {
            console.log('Processing asset:', asset);
            if (asset.coinGeckoId && asset.price) {
              transformedPrices[asset.coinGeckoId] = {
                usd: asset.price.usd,
                usd_market_cap: asset.price.usd_market_cap,
                usd_24h_change: asset.price.usd_24h_change,
              };
              console.log(`Added price for ${asset.coinGeckoId}:`, asset.price.usd);
            }
          });
          
          console.log('Final transformed prices:', transformedPrices);
          setPriceData(transformedPrices);
          return transformedPrices;
        }
      }
    } catch (error) {
      console.error('Error fetching pricing data:', error);
    } finally {
      setPriceLoading(false);
    }
    return {};
  };

  // Get chain name, symbol, and exponent from denom using chain registry data
  const getChainInfo = (denom: string) => {
    const denomMap: { [key: string]: { chainName: string; symbol: string; coinGeckoId?: string; exponent: number } } = {
      'uakt': { chainName: 'Akash', symbol: 'AKT', coinGeckoId: 'akash-network', exponent: 6 },
      ' uakt': { chainName: 'Akash', symbol: 'AKT', coinGeckoId: 'akash-network', exponent: 6 }, // Handle space prefix
      'uatom': { chainName: 'Cosmos Hub', symbol: 'ATOM', coinGeckoId: 'cosmos', exponent: 6 },
      'uosmo': { chainName: 'Osmosis', symbol: 'OSMO', coinGeckoId: 'osmosis', exponent: 6 },
      'afet': { chainName: 'Fetch.ai', symbol: 'FET', coinGeckoId: 'fetch-ai', exponent: 18 },
      'nam': { chainName: 'Namada', symbol: 'NAM', coinGeckoId: 'namada', exponent: 6 },
      'uxprt': { chainName: 'Persistence', symbol: 'XPRT', coinGeckoId: 'persistence', exponent: 6 },
      'udvpn': { chainName: 'Sentinel', symbol: 'DVPN', coinGeckoId: 'sentinel', exponent: 6 },
      'ibc/': { chainName: 'Unknown', symbol: 'UNKNOWN', coinGeckoId: undefined, exponent: 6 }, // IBC tokens
    };
    
    // Clean denom (remove leading/trailing spaces)
    const cleanDenom = denom.trim();
    
    // Handle IBC denoms
    if (cleanDenom.startsWith('ibc/')) {
      return { 
        chainName: 'IBC Token', 
        symbol: 'IBC',
        coinGeckoId: undefined,
        exponent: 6
      };
    }
    
    // Try exact match first, then try with original denom (in case of space prefix)
    const chainInfo = denomMap[cleanDenom] || denomMap[denom] || { 
      chainName: cleanDenom || 'Unknown', 
      symbol: (cleanDenom || 'UNKNOWN').toUpperCase(),
      coinGeckoId: undefined,
      exponent: 6 // Default to 6 decimals for unknown denoms
    };
    
    console.log(`Denom mapping: "${denom}" -> "${cleanDenom}" ->`, chainInfo);
    return chainInfo;
  };
  // Fetch referral data
  const fetchReferralData = async () => {
    if (!keplrPublicKey || !isConnected) {
      setLoading(false);
      return;
    }

    try {
      // Fetch both investor data and pricing data concurrently
      const [investorResponse, pricesData] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_BASE_URL}/api/investors/${keplrPublicKey}`),
        fetchPricingData()
      ]);
      
      if (!investorResponse.ok) {
        throw new Error(`HTTP error! status: ${investorResponse.status}`);
      }
      
      const result = await investorResponse.json();
      console.log('Full investor API response:', result);
      
      if (result.success && result.data) {
        const investorData = result.data.investor;
        console.log('Investor data:', investorData);
        console.log('Referral bonuses from API:', investorData.referralBonuses);
        
        // Transform referral bonuses with pricing data
        const referralBonuses = investorData.referralBonuses?.map((bonus: any) => {
          console.log('Processing bonus:', bonus);
          const chainInfo = getChainInfo(bonus.denom);
          console.log('Chain info for', bonus.denom, ':', chainInfo);
          
          const priceUSD = chainInfo.coinGeckoId && pricesData[chainInfo.coinGeckoId] 
            ? pricesData[chainInfo.coinGeckoId].usd 
            : 0;
            
          console.log(`Price lookup: coinGeckoId=${chainInfo.coinGeckoId}, priceUSD=${priceUSD}`);
          console.log('Available prices:', Object.keys(pricesData));
          
          // Convert from base denom to display denom using the correct exponent
          const divisor = Math.pow(10, chainInfo.exponent);
          const rewardEarned = bonus.rewardEarned / divisor;
          const reward = bonus.reward / divisor;
          
          // Calculate USD values
          const rewardEarnedUSD = rewardEarned * priceUSD;
          const rewardUSD = reward * priceUSD;
          
          console.log(`Bonus calculation for ${bonus.denom}:`, {
            originalReward: bonus.reward,
            originalRewardEarned: bonus.rewardEarned,
            chainInfo,
            priceUSD,
            divisor,
            convertedReward: reward,
            convertedRewardEarned: rewardEarned,
            rewardUSD,
            rewardEarnedUSD
          });
          
          return {
            ...bonus,
            chainName: chainInfo.chainName,
            symbol: chainInfo.symbol,
            rewardEarned,
            reward,
            priceUSD,
            rewardEarnedUSD,
            rewardUSD,
          };
        }) || [];
        
        // Calculate totals
        const totalBonusEarned = referralBonuses.reduce((sum: number, bonus: any) => sum + bonus.rewardEarned, 0);
        const totalBonusEarnedUSD = referralBonuses.reduce((sum: number, bonus: any) => sum + (bonus.rewardEarnedUSD || 0), 0);
        const totalClaimableUSD = referralBonuses.reduce((sum: number, bonus: any) => sum + (bonus.rewardUSD || 0), 0);
        
        // Transform the API response to match our interface
        const transformedData: ReferralData = {
          referralCode: keplrPublicKey,
          totalReferred: result.data.countReferredByInvestors || 0,
          totalBonusEarned,
          totalBonusEarnedUSD,
          totalClaimableUSD,
          referralBonuses,
          referredUsers: investorData.referredUsers || []
        };
        
        setReferralData(transformedData);
      } else {
        console.error('Failed to fetch investor data:', result.message);
      }
    } catch (error) {
      console.error('Failed to fetch referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferralData();
  }, [keplrPublicKey, isConnected]);

  const copyReferralCode = () => {
    const referralCode = referralData?.referralCode || keplrPublicKey;
    if (referralCode) {
      navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClaimBonus = async (chainId: string) => {
    if (!keplrPublicKey) {
      setClaimError('Wallet not connected');
      return;
    }

    setClaiming(chainId);
    setClaimError(null);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/rewards/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chainId: chainId,
          KeplrPublicAddress: keplrPublicKey
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Update the data after successful claiming
        if (referralData) {
          const updatedReferralBonuses = referralData.referralBonuses.map(bonus => 
            bonus.chainId === chainId 
              ? { 
                  ...bonus, 
                  rewardEarned: bonus.rewardEarned + bonus.reward,
                  rewardEarnedUSD: (bonus.rewardEarnedUSD || 0) + (bonus.rewardUSD || 0),
                  reward: 0,
                  rewardUSD: 0
                }
              : bonus
          );
          
          // Recalculate totals
          const totalBonusEarnedUSD = updatedReferralBonuses.reduce((sum: number, bonus: any) => sum + (bonus.rewardEarnedUSD || 0), 0);
          const totalClaimableUSD = updatedReferralBonuses.reduce((sum: number, bonus: any) => sum + (bonus.rewardUSD || 0), 0);
          
          setReferralData({ 
            ...referralData, 
            referralBonuses: updatedReferralBonuses,
            totalBonusEarnedUSD,
            totalClaimableUSD
          });
        }
        
        // Close modal on success
        setShowClaimModal(false);
        setSelectedBonus(null);
      } else {
        throw new Error(result.message || 'Failed to claim bonus');
      }
    } catch (error) {
      console.error('Failed to claim bonus:', error);
      setClaimError(error instanceof Error ? error.message : 'Failed to claim bonus');
    } finally {
      setClaiming(null);
    }
  };

  const openClaimModal = (bonus: any) => {
    setSelectedBonus(bonus);
    setShowClaimModal(true);
    setClaimError(null);
  };

  const closeClaimModal = () => {
    setShowClaimModal(false);
    setSelectedBonus(null);
    setClaimError(null);
  };

  if (!isConnected) {
    return (
      <div className={`p-6 ${isDarkMode ? 'bg-gray-900' : 'bg-white'} min-h-screen`}>
        <div className="text-center py-12">
          <Coins className={`mx-auto h-16 w-16 mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
          <h3 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Wallet Not Connected
          </h3>
          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Please connect your wallet to view referral bonuses.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`p-6 ${isDarkMode ? 'bg-gray-900' : 'bg-white'} min-h-screen`}>
        <div className="animate-pulse">
          <div className={`h-8 w-64 mb-4 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
          <div className={`h-4 w-48 mb-8 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <div className={`h-6 w-24 mb-2 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                <div className={`h-8 w-20 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 ${isDarkMode ? 'bg-gray-900' : 'bg-white'} min-h-screen`}>
      {/* Header */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Referral Bonus
        </h1>
        <p className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Earn rewards by inviting others to join EthicalNode
        </p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <motion.div
          className={`p-6 rounded-lg border ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200 shadow-sm'
          }`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Total Referred
              </p>
              <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {referralData?.totalReferred || 0}
              </p>
            </div>
            <Users className={`h-8 w-8 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`} />
          </div>
        </motion.div>

        <motion.div
          className={`p-6 rounded-lg border ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200 shadow-sm'
          }`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Total Earned
              </p>
              <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                ${referralData?.totalBonusEarnedUSD.toFixed(2) || '0.00'}
              </p>
            </div>
            <Gift className={`h-8 w-8 ${isDarkMode ? 'text-green-400' : 'text-green-500'}`} />
          </div>
        </motion.div>

        <motion.div
          className={`p-6 rounded-lg border ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200 shadow-sm'
          }`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Claimable Bonus
              </p>
              <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                ${referralData?.totalClaimableUSD.toFixed(2) || '0.00'}
              </p>
            </div>
            <Coins className={`h-8 w-8 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-500'}`} />
          </div>
        </motion.div>
      </div>

      {/* Referral Code Section */}
      <motion.div
        className={`p-6 rounded-lg border mb-8 ${
          isDarkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200 shadow-sm'
        }`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <h3 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Your Referral Code
        </h3>
        <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Share your public address with others to earn referral bonuses when they join EthicalNode.
        </p>
        <div className="flex items-center space-x-3">
          <div className={`flex-1 p-3 rounded-lg border font-mono text-sm ${
            isDarkMode 
              ? 'bg-gray-700 border-gray-600 text-gray-300' 
              : 'bg-gray-50 border-gray-200 text-gray-700'
          }`}>
            {referralData?.referralCode || keplrPublicKey || 'Loading...'}
          </div>
          <button
            onClick={copyReferralCode}
            disabled={!keplrPublicKey}
            className={`px-4 py-3 rounded-lg flex items-center space-x-2 transition-colors ${
              copied 
                ? 'bg-green-500 text-white' 
                : isDarkMode
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {copied ? (
              <>
                <CheckCircle className="h-4 w-4" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* Chain Bonuses */}
      <motion.div
        className={`p-6 rounded-lg border mb-8 ${
          isDarkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200 shadow-sm'
        }`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        <h3 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Chain Bonuses
        </h3>
        <div className="space-y-4">
          {referralData?.referralBonuses.map((bonus) => (
            <div 
              key={bonus.chainId} 
              className={`p-4 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600' 
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div>
                    <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {bonus.chainName}
                    </h4>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Total Earned: {bonus.rewardEarned.toFixed(6)} {bonus.symbol}
                    </p>
                    {bonus.rewardEarnedUSD !== undefined && (
                      <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        ${bonus.rewardEarnedUSD.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {bonus.reward.toFixed(6)} {bonus.symbol}
                    </p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Claimable
                    </p>
                    {bonus.rewardUSD !== undefined && (
                      <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        ${bonus.rewardUSD.toFixed(2)}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => openClaimModal(bonus)}
                    disabled={bonus.reward <= 0 || claiming === bonus.chainId}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      bonus.reward > 0 && claiming !== bonus.chainId
                        ? isDarkMode
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-green-500 hover:bg-green-600 text-white'
                        : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    }`}
                  >
                    {claiming === bonus.chainId ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Claiming...</span>
                      </div>
                    ) : (
                      <>
                        <Download className="h-4 w-4 inline mr-1" />
                        Claim
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Claim Confirmation Modal */}
      {showClaimModal && selectedBonus && (
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            className={`p-6 rounded-lg max-w-md w-full mx-4 ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Confirm Claim
              </h3>
              <button
                onClick={closeClaimModal}
                disabled={claiming === selectedBonus.chainId}
                className={`p-1 rounded-lg hover:bg-gray-100 ${
                  isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                } disabled:opacity-50`}
              >
                <X className={`h-5 w-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
              </button>
            </div>

            <div className={`mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <p className="mb-3">
                You are about to claim your referral rewards for <strong>{selectedBonus.chainName}</strong>:
              </p>
              
              <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm">Amount:</span>
                  <span className="font-semibold">
                    {selectedBonus.reward.toFixed(6)} {selectedBonus.symbol}
                  </span>
                </div>
                {selectedBonus.rewardUSD !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm">USD Value:</span>
                    <span className="font-semibold">
                      ${selectedBonus.rewardUSD.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              <p className={`mt-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                This action will claim your rewards to your connected wallet. Please confirm to proceed.
              </p>
            </div>

            {claimError && (
              <div className={`mb-4 p-3 rounded-lg border ${
                isDarkMode 
                  ? 'bg-red-900 border-red-700 text-red-300' 
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">{claimError}</span>
                </div>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={closeClaimModal}
                disabled={claiming === selectedBonus.chainId}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isDarkMode
                    ? 'bg-gray-600 hover:bg-gray-700 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                } disabled:opacity-50`}
              >
                Cancel
              </button>
              <button
                onClick={() => handleClaimBonus(selectedBonus.chainId)}
                disabled={claiming === selectedBonus.chainId}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  claiming === selectedBonus.chainId
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    : isDarkMode
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                {claiming === selectedBonus.chainId ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Claiming...</span>
                  </div>
                ) : (
                  'Confirm Claim'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ReferralBonus;
