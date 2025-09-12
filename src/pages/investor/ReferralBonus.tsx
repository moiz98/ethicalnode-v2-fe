import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { useWallet } from '../../contexts/WalletContext';
import { Copy, Gift, Users, Coins, Download, CheckCircle } from 'lucide-react';

interface ReferralData {
  referralCode: string;
  totalReferred: number;
  totalBonusEarned: number;
  chainBonuses: Array<{
    chainId: string;
    chainName: string;
    symbol: string;
    accumulatedBonus: number;
    claimableBonus: number;
    lastClaimedAt?: string;
  }>;
  referredUsers: Array<{
    _id: string;
    joinedAt: string;
    bonusEarned: number;
    status: 'active' | 'pending';
  }>;
}

const ReferralBonus: React.FC = () => {
  const { isDarkMode } = useTheme();
  const { keplrPublicKey, isConnected } = useWallet();
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);

  // Fetch referral data
  const fetchReferralData = async () => {
    if (!keplrPublicKey || !isConnected) {
      setLoading(false);
      return;
    }

    try {
      // Mock data for now - replace with actual API call
      const mockData: ReferralData = {
        referralCode: keplrPublicKey, // Use the investor's public key as referral code
        totalReferred: 5,
        totalBonusEarned: 125.75,
        chainBonuses: [
          {
            chainId: 'cosmoshub-4',
            chainName: 'Cosmos Hub',
            symbol: 'ATOM',
            accumulatedBonus: 45.50,
            claimableBonus: 15.25
          },
          {
            chainId: 'osmosis-1',
            chainName: 'Osmosis',
            symbol: 'OSMO',
            accumulatedBonus: 80.25,
            claimableBonus: 25.75
          }
        ],
        referredUsers: [
          {
            _id: '1',
            joinedAt: '2024-01-15T10:30:00Z',
            bonusEarned: 25.50,
            status: 'active'
          },
          {
            _id: '2',
            joinedAt: '2024-02-20T14:45:00Z',
            bonusEarned: 30.75,
            status: 'active'
          }
        ]
      };
      
      setReferralData(mockData);
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
    setClaiming(chainId);
    try {
      // Mock claim action - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update the data after claiming
      if (referralData) {
        const updatedChainBonuses = referralData.chainBonuses.map(chain => 
          chain.chainId === chainId 
            ? { ...chain, claimableBonus: 0, lastClaimedAt: new Date().toISOString() }
            : chain
        );
        setReferralData({ ...referralData, chainBonuses: updatedChainBonuses });
      }
    } catch (error) {
      console.error('Failed to claim bonus:', error);
    } finally {
      setClaiming(null);
    }
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
                ${referralData?.totalBonusEarned.toFixed(2) || '0.00'}
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
                ${referralData?.chainBonuses.reduce((sum, chain) => sum + chain.claimableBonus, 0).toFixed(2) || '0.00'}
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
          {referralData?.chainBonuses.map((chain) => (
            <div 
              key={chain.chainId} 
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
                      {chain.chainName}
                    </h4>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Total Accumulated: {chain.accumulatedBonus} {chain.symbol}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {chain.claimableBonus} {chain.symbol}
                    </p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Claimable
                    </p>
                  </div>
                  <button
                    onClick={() => handleClaimBonus(chain.chainId)}
                    disabled={chain.claimableBonus <= 0 || claiming === chain.chainId}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      chain.claimableBonus > 0 && claiming !== chain.chainId
                        ? isDarkMode
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-green-500 hover:bg-green-600 text-white'
                        : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    }`}
                  >
                    {claiming === chain.chainId ? (
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
    </div>
  );
};

export default ReferralBonus;
