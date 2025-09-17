/**
 * Organization Referral Statistics Page
 * 
 * This page displays referral statistics for organizations using their unique referral code.
 * 
 * Route: /referral-bonus/orgs/:orgcode
 * 
 * Features:
 * - Displays total investors, active investors, and reward statistics
 * - Shows organization details including creation date and status
 * - Calculates success rates and average rewards per investor
 * - Responsive design with dark theme
 * - Error handling for invalid or non-existent organization codes
 * 
 * Backend Integration:
 * - Uses GET /api/referral-codes/:code/validate endpoint
 * - Handles different response structures from backend
 * - Provides fallback values for missing data
 * 
 * Usage:
 * Organizations can access their stats by visiting:
 * https://yourapp.com/referral-bonus/orgs/THEIR_ORG_CODE
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  AlertCircle, 
  CheckCircle,
  Loader,
  Calendar,
  BarChart3
} from 'lucide-react';

interface ChainBonus {
  chainId: string;
  chainName: string;
  bonusPercentage: number;
  denom: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _id: string;
}

interface ReferralBonus {
  chainId: string;
  rewardEarned: number;
  reward: number;
  denom: string;
  _id: string;
  createdAt: string;
  updatedAt: string;
}

interface UsageStats {
  totalUses: number;
  lastUsedAt: string | null;
  lastUsedBy: string | null;
}

interface ReferralStats {
  code: string;
  organizationName: string;
  description?: string;
  chainBonuses: ChainBonus[];
  referralBonuses: ReferralBonus[];
  usageStats: UsageStats;
  isActive: boolean;
  expiresAt: string | null;
  maxUses: number | null;
  createdAt: string;
  updatedAt: string;
}

const OrgReferralStats: React.FC = () => {
  const { orgcode } = useParams<{ orgcode: string }>();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReferralStats = async () => {
      if (!orgcode) {
        setError('Organization code is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/referral-codes/${orgcode}/validate`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Organization referral code not found');
          } else if (response.status === 400) {
            throw new Error('Invalid organization referral code');
          } else {
            throw new Error(`Failed to fetch referral stats: ${response.status}`);
          }
        }

        const result = await response.json();
        
        if (result.success && result.data) {
          const data = result.data.referralCode || result.data;
          setStats({
            code: data.referralCode || orgcode,
            organizationName: data.organizationName || 'Unknown Organization',
            description: data.description || undefined,
            chainBonuses: data.chainBonuses || [],
            referralBonuses: data.referralBonuses || [],
            usageStats: data.usageStats || { totalUses: 0, lastUsedAt: null, lastUsedBy: null },
            isActive: data.isActive !== undefined ? data.isActive : true,
            expiresAt: data.expiresAt || null,
            maxUses: data.maxUses || null,
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString()
          });
        } else {
          throw new Error(result.message || 'Failed to load referral statistics');
        }
      } catch (err) {
        console.error('Error fetching referral stats:', err);
        setError(err instanceof Error ? err.message : 'Failed to load referral statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchReferralStats();
  }, [orgcode]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatTokenAmount = (amount: number, decimals = 6) => {
    const divisor = Math.pow(10, decimals);
    return (amount / divisor).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    });
  };

  // Placeholder token prices - in real implementation, fetch from API
  const getTokenPrice = (denom: string): number => {
    const prices: { [key: string]: number } = {
      'uakt': 2.15, // AKT price
      'afet': 0.85, // FET price
      'uatom': 4.20, // ATOM price
      'unam': 0.12, // NAM price (placeholder)
    };
    return prices[denom] || 0;
  };

  const convertToUSD = (amount: number, denom: string): number => {
    const decimals = denom.startsWith('u') ? 6 : 18;
    const tokenAmount = amount / Math.pow(10, decimals);
    const price = getTokenPrice(denom);
    return tokenAmount * price;
  };

  const getTotalRewardEarnedUSD = () => {
    if (!stats?.referralBonuses) return 0;
    return stats.referralBonuses.reduce((total, bonus) => {
      return total + convertToUSD(bonus.rewardEarned, bonus.denom);
    }, 0);
  };

  const getTotalPendingRewardsUSD = () => {
    if (!stats?.referralBonuses) return 0;
    return stats.referralBonuses.reduce((total, bonus) => {
      return total + convertToUSD(bonus.reward, bonus.denom);
    }, 0);
  };

  const getTotalActiveChains = () => {
    if (!stats?.chainBonuses) return 0;
    return stats.chainBonuses.filter(chain => chain.isActive).length;
  };

  const getChainNameFormatted = (chainName: string) => {
    return chainName.charAt(0).toUpperCase() + chainName.slice(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <motion.div 
          className="flex flex-col items-center space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Loader className="h-8 w-8 animate-spin text-purple-400" />
          <p className="text-purple-300 text-lg font-medium">Loading referral statistics...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <motion.div 
          className="max-w-md w-full mx-4 p-8 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-red-500/20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center space-x-3 mb-6">
            <AlertCircle className="h-8 w-8 text-red-400" />
            <h1 className="text-2xl font-bold text-white">Error</h1>
          </div>
          <p className="text-red-300 text-lg mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
          >
            Try Again
          </button>
        </motion.div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <motion.div 
          className="max-w-md w-full mx-4 p-8 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center space-x-3 mb-6">
            <AlertCircle className="h-8 w-8 text-yellow-400" />
            <h1 className="text-2xl font-bold text-white">No Data</h1>
          </div>
          <p className="text-slate-300 text-lg">No referral statistics found for this organization code.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Referral Statistics
          </h1>
        </motion.div>

        {/* Organization Details Section - Moved to Top */}
        <motion.div
          className="bg-slate-800/50 backdrop-blur-sm p-8 rounded-2xl border border-slate-700 mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-white mb-2">
              {stats.organizationName}
            </h2>
            <div className="flex items-center justify-center space-x-2">
              {stats.isActive ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-green-400 font-medium">Active</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <span className="text-red-400 font-medium">Inactive</span>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="text-center">
              <label className="text-sm font-medium text-slate-400 uppercase tracking-wide">
                Referral Code
              </label>
              <p className="text-xl text-white font-mono bg-slate-900/50 px-4 py-2 rounded-lg mt-2">
                {stats.code}
              </p>
            </div>

            <div className="text-center">
              <label className="text-sm font-medium text-slate-400 uppercase tracking-wide">
                Created Date
              </label>
              <div className="flex items-center justify-center space-x-2 mt-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                <p className="text-xl text-white">
                  {formatDate(stats.createdAt)}
                </p>
              </div>
            </div>

            <div className="text-center">
              <label className="text-sm font-medium text-slate-400 uppercase tracking-wide">
                Last Updated
              </label>
              <p className="text-xl text-white mt-2">
                {formatDate(stats.updatedAt)}
              </p>
            </div>
          </div>

          {stats.description && (
            <div className="mt-6 pt-6 border-t border-slate-700 text-center">
              <label className="text-sm font-medium text-slate-400 uppercase tracking-wide">
                Description
              </label>
              <p className="text-white mt-2 text-lg leading-relaxed">
                {stats.description}
              </p>
            </div>
          )}
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Active Chains */}
          <motion.div
            className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-700 hover:border-purple-500/30 transition-colors"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-4">
              <BarChart3 className="h-8 w-8 text-blue-400" />
              <span className="text-2xl font-bold text-white">{getTotalActiveChains()}</span>
            </div>
            <h3 className="text-slate-300 font-medium">Active Chains</h3>
            <p className="text-sm text-slate-400 mt-1">
              Out of {stats.chainBonuses.length} total chains
            </p>
          </motion.div>

          {/* Total Users Referred */}
          <motion.div
            className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-700 hover:border-purple-500/30 transition-colors"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="flex items-center justify-between mb-4">
              <Users className="h-8 w-8 text-green-400" />
              <span className="text-2xl font-bold text-white">{stats.usageStats.totalUses}</span>
            </div>
            <h3 className="text-slate-300 font-medium">Total Users Referred</h3>
            <p className="text-sm text-slate-400 mt-1">
              {stats.usageStats.lastUsedAt ? `Last used: ${formatDate(stats.usageStats.lastUsedAt)}` : 'Never used'}
            </p>
          </motion.div>

          {/* Total Earned Rewards (USD) */}
          <motion.div
            className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-700 hover:border-purple-500/30 transition-colors"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="h-8 w-8 text-purple-400" />
              <span className="text-2xl font-bold text-white">
                {formatCurrency(getTotalRewardEarnedUSD())}
              </span>
            </div>
            <h3 className="text-slate-300 font-medium">Total Earned Rewards</h3>
            <p className="text-sm text-slate-400 mt-1">
              USD value of earned rewards
            </p>
          </motion.div>

          {/* Total Claimable Rewards (USD) */}
          <motion.div
            className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-700 hover:border-purple-500/30 transition-colors"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="h-8 w-8 text-yellow-400" />
              <span className="text-2xl font-bold text-white">
                {formatCurrency(getTotalPendingRewardsUSD())}
              </span>
            </div>
            <h3 className="text-slate-300 font-medium">Total Claimable Rewards</h3>
            <p className="text-sm text-slate-400 mt-1">
              USD value of claimable rewards
            </p>
          </motion.div>
        </div>

        {/* Chain Bonuses Section */}
        <motion.div
          className="bg-slate-800/50 backdrop-blur-sm p-8 rounded-2xl border border-slate-700 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          <div className="flex items-center space-x-3 mb-6">
            <BarChart3 className="h-6 w-6 text-purple-400" />
            <h2 className="text-2xl font-bold text-white">Chain Bonus Percentages</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stats.chainBonuses.map((chain, index) => (
              <motion.div
                key={chain._id}
                className={`p-6 rounded-xl border ${
                  chain.isActive 
                    ? 'bg-slate-700/50 border-green-500/30' 
                    : 'bg-slate-700/20 border-red-500/30'
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.75 + (index * 0.1) }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    {chain.isActive ? (
                      <CheckCircle className="h-5 w-5 text-green-400" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-400" />
                    )}
                    <h3 className="text-lg font-semibold text-white">
                      {getChainNameFormatted(chain.chainName)}
                    </h3>
                  </div>
                  <span className="text-2xl font-bold text-purple-400">
                    {chain.bonusPercentage}%
                  </span>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-slate-400">
                    <span className="font-medium">Chain ID:</span> {chain.chainId}
                  </p>
                  <p className="text-sm text-slate-400">
                    <span className="font-medium">Denom:</span> {chain.denom}
                  </p>
                  <p className="text-sm text-slate-400">
                    <span className="font-medium">Status:</span> 
                    <span className={chain.isActive ? 'text-green-400' : 'text-red-400'}>
                      {' '}{chain.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Referral Bonuses Section */}
        <motion.div
          className="bg-slate-800/50 backdrop-blur-sm p-8 rounded-2xl border border-slate-700 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <div className="flex items-center space-x-3 mb-6">
            <DollarSign className="h-6 w-6 text-green-400" />
            <h2 className="text-2xl font-bold text-white">Accumulated Referral Bonuses</h2>
          </div>

          {stats.referralBonuses.length > 0 ? (
            <div className="space-y-4">
              {stats.referralBonuses.map((bonus, index) => (
                <motion.div
                  key={bonus._id}
                  className="p-6 bg-slate-700/50 rounded-xl border border-slate-600"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.9 + (index * 0.1) }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
                    <div>
                      <p className="text-sm font-medium text-slate-400 uppercase tracking-wide">
                        Chain
                      </p>
                      <p className="text-lg font-semibold text-white">
                        {bonus.chainId}
                      </p>
                      <p className="text-sm text-slate-400 mt-1">
                        Denom: {bonus.denom}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-400 uppercase tracking-wide">
                        Earned
                      </p>
                      <p className="text-lg font-semibold text-green-400">
                        {formatTokenAmount(bonus.rewardEarned)} {bonus.denom.replace('u', '').toUpperCase()}
                      </p>
                      <p className="text-sm text-slate-400">
                        ≈ {formatCurrency(convertToUSD(bonus.rewardEarned, bonus.denom))}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-400 uppercase tracking-wide">
                        Claimable
                      </p>
                      <p className="text-lg font-semibold text-yellow-400">
                        {formatTokenAmount(bonus.reward)} {bonus.denom.replace('u', '').toUpperCase()}
                      </p>
                      <p className="text-sm text-slate-400">
                        ≈ {formatCurrency(convertToUSD(bonus.reward, bonus.denom))}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-400 uppercase tracking-wide">
                        Total Value
                      </p>
                      <p className="text-lg font-semibold text-purple-400">
                        {formatTokenAmount(bonus.rewardEarned + bonus.reward)} {bonus.denom.replace('u', '').toUpperCase()}
                      </p>
                      <p className="text-sm text-slate-400">
                        ≈ {formatCurrency(convertToUSD(bonus.rewardEarned + bonus.reward, bonus.denom))}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-600">
                    <p className="text-xs text-slate-400">
                      Created: {formatDate(bonus.createdAt)} | Updated: {formatDate(bonus.updatedAt)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">No referral bonuses accumulated yet</p>
              <p className="text-slate-500 text-sm mt-2">
                Bonuses will appear here once referrals start generating rewards
              </p>
            </div>
          )}
        </motion.div>

        {/* Footer */}
        <motion.div
          className="text-center mt-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.0 }}
        >
          <p className="text-slate-400 text-sm">
            Last updated: {new Date().toLocaleString()}
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default OrgReferralStats;