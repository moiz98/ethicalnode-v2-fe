import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { useWallet } from '../../contexts/WalletContext';
import { Settings as SettingsIcon, Wallet, Link, Copy, CheckCircle, RefreshCw, UserPlus, X } from 'lucide-react';
import { assetLists } from 'chain-registry';

interface LinkedWallet {
  _id: string;
  chainId: string;
  chainName: string;
  address: string;
  bech32Prefix: string;
  createdAt: string;
}

interface InvestorProfile {
  _id: string;
  KeplrPublicAddress: string;
  namadaWalletAddress: string | null;
  linkedWallets: LinkedWallet[];
  referredBy: string | null;
  referralBonuses: any[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  success: boolean;
  data: {
    investor: InvestorProfile;
  };
}

const Settings: React.FC = () => {
  const { isDarkMode } = useTheme();
  const { keplrAddress, keplrPublicKey, namadaAddress, isConnected } = useWallet();
  const [profile, setProfile] = useState<InvestorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [showReferrerModal, setShowReferrerModal] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [submittingReferrer, setSubmittingReferrer] = useState(false);
  const [referrerError, setReferrerError] = useState<string | null>(null);

  // Fetch investor profile
  const fetchProfile = async () => {
    if (!keplrPublicKey || !isConnected) {
      setLoading(false);
      return;
    }

    try {
      setRefreshing(true);
      const response = await fetch(`http://localhost:3000/api/investors/${keplrPublicKey}`);
      
      if (response.ok) {
        const result: ApiResponse = await response.json();
        if (result.success && result.data) {
          setProfile(result.data.investor);
        }
      } else {
        console.error('Failed to fetch investor profile:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching investor profile:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [keplrPublicKey, isConnected]);

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(type);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const handleSetReferrer = async () => {
    if (!referralCode.trim() || !keplrPublicKey) return;
    
    setSubmittingReferrer(true);
    setReferrerError(null);
    
    try {
      const response = await fetch(`http://localhost:3000/api/investors/${keplrPublicKey}/set-referrer`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          referredBy: referralCode.trim()
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Refresh profile data
          await fetchProfile();
          setShowReferrerModal(false);
          setReferralCode('');
        } else {
          setReferrerError(result.message || 'Failed to set referrer');
        }
      } else {
        const errorData = await response.json();
        setReferrerError(errorData.message || 'Failed to set referrer');
      }
    } catch (error) {
      console.error('Error setting referrer:', error);
      setReferrerError('Network error. Please try again.');
    } finally {
      setSubmittingReferrer(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helper function to get chain data from chain registry
  const getChainData = (chainName: string) => {
    console.log('Looking for chain data for:', chainName);
    const asset = assetLists.find(a => a.chainName === chainName);
    const chainSymbol = asset?.assets[0]?.symbol; // Assuming the first asset represents the chain's symbol
    const logoUrl = asset?.assets[0]?.logoURIs?.png || asset?.assets[0]?.logoURIs?.svg; // Use PNG or SVG logo URI
    
    // For prettyName, we need to create a mapping since it's not directly available in assetLists
    const chainPrettyNames: { [key: string]: string } = {
      'cosmoshub': 'Cosmos Hub',
      'akash': 'Akash Network', 
      'fetchhub': 'Fetch.AI',
      'namada': 'Namada',
      'osmosis': 'Osmosis',
      'juno': 'Juno Network'
    };
    
    const prettyName = chainPrettyNames[chainName] || chainName;
    
    return {
      chainSymbol,
      logoUrl,
      prettyName,
    };
  };

  if (!isConnected) {
    return (
      <div className={`p-6 ${isDarkMode ? 'bg-gray-900' : 'bg-white'} min-h-screen`}>
        <div className="text-center py-12">
          <SettingsIcon className={`mx-auto h-16 w-16 mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
          <h3 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Wallet Not Connected
          </h3>
          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Please connect your wallet to view settings.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`p-6 ${isDarkMode ? 'bg-gray-900' : 'bg-white'} min-h-screen`}>
        <div className="animate-pulse">
          <div className={`h-8 w-48 mb-4 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
          <div className={`h-4 w-64 mb-8 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
          
          {/* Profile section skeleton */}
          <div className={`p-6 rounded-lg mb-6 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <div className={`h-6 w-32 mb-4 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
            <div className="space-y-3">
              <div className={`h-4 w-full rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
              <div className={`h-4 w-3/4 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
            </div>
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Settings
            </h1>
            <p className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Manage your investor profile and linked wallets
            </p>
          </div>
          <button
            onClick={fetchProfile}
            disabled={refreshing}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
              isDarkMode
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            } disabled:opacity-50`}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </motion.div>

      {/* Profile Information */}
      <motion.div
        className={`p-6 rounded-lg border mb-6 ${
          isDarkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200 shadow-sm'
        }`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <h3 className={`text-xl font-semibold mb-4 flex items-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          <Wallet className="h-5 w-5 mr-2" />
          Wallet Information
        </h3>
        
        <div className="space-y-4">
          {/* Keplr Address */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Keplr Public Address
            </label>
            <div className="flex items-center space-x-3">
              <div className={`flex-1 p-3 rounded-lg border font-mono text-sm ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-gray-300' 
                  : 'bg-gray-50 border-gray-200 text-gray-700'
              }`}>
                {profile?.KeplrPublicAddress || 'Not connected'}
              </div>
              {profile?.KeplrPublicAddress && (
                <button
                  onClick={() => copyToClipboard(profile?.KeplrPublicAddress || '', 'keplr')}
                  className={`px-3 py-3 rounded-lg flex items-center transition-colors ${
                    copiedAddress === 'keplr'
                      ? 'bg-green-500 text-white'
                      : isDarkMode
                        ? 'bg-gray-600 hover:bg-gray-500 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  {copiedAddress === 'keplr' ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Namada Address */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Namada Wallet Address
            </label>
            <div className="flex items-center space-x-3">
              <div className={`flex-1 p-3 rounded-lg border font-mono text-sm ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-gray-300' 
                  : 'bg-gray-50 border-gray-200 text-gray-700'
              }`}>
                {profile?.namadaWalletAddress || 'Not linked'}
              </div>
              {profile?.namadaWalletAddress && (
                <button
                  onClick={() => copyToClipboard(profile?.namadaWalletAddress || '', 'namada')}
                  className={`px-3 py-3 rounded-lg flex items-center transition-colors ${
                    copiedAddress === 'namada'
                      ? 'bg-green-500 text-white'
                      : isDarkMode
                        ? 'bg-gray-600 hover:bg-gray-500 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  {copiedAddress === 'namada' ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Profile Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Account Status
              </label>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                profile?.isActive
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {profile?.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Member Since
              </label>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {profile?.createdAt ? formatDate(profile.createdAt) : 'Unknown'}
              </p>
            </div>
          </div>

          {/* Referrer Information */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Referred By
            </label>
            <div className="flex items-center space-x-3">
              <div className={`flex-1 p-3 rounded-lg border font-mono text-sm ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-gray-300' 
                  : 'bg-gray-50 border-gray-200 text-gray-700'
              }`}>
                {profile?.referredBy || 'No referrer set'}
              </div>
              {profile?.referredBy ? (
                <button
                  onClick={() => copyToClipboard(profile.referredBy || '', 'referrer')}
                  className={`px-3 py-3 rounded-lg flex items-center transition-colors ${
                    copiedAddress === 'referrer'
                      ? 'bg-green-500 text-white'
                      : isDarkMode
                        ? 'bg-gray-600 hover:bg-gray-500 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  {copiedAddress === 'referrer' ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              ) : (
                <button
                  onClick={() => setShowReferrerModal(true)}
                  className={`px-3 py-3 rounded-lg flex items-center space-x-2 transition-colors ${
                    isDarkMode
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  <UserPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add Referrer</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Linked Wallets */}
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
        <h3 className={`text-xl font-semibold mb-4 flex items-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          <Link className="h-5 w-5 mr-2" />
          Linked Wallets ({profile?.linkedWallets?.length || 0})
        </h3>

        {profile?.linkedWallets && profile.linkedWallets.length > 0 ? (
          <div className="space-y-4">
            {profile.linkedWallets.map((wallet) => {
              const chainData = getChainData(wallet.chainName);
              
              return (
                <div 
                  key={wallet._id} 
                  className={`p-4 rounded-lg border ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isDarkMode 
                          ? 'bg-gray-600 border border-gray-500' 
                          : 'bg-white border border-gray-200'
                      }`}>
                        {chainData.logoUrl ? (
                          <img 
                            src={chainData.logoUrl} 
                            alt={`${wallet.chainName} logo`}
                            className="w-8 h-8 rounded-md object-contain"
                            onError={(e) => {
                              // Fallback to text icon if image fails to load
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = `<span class="text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}">${wallet.chainName?.charAt(0)?.toUpperCase() || 'N'}</span>`;
                              }
                            }}
                          />
                        ) : (
                          <span className={`text-lg font-bold ${
                            isDarkMode ? 'text-white' : 'text-gray-800'
                          }`}>
                            {wallet.chainName?.charAt(0)?.toUpperCase() || 'N'}
                          </span>
                        )}
                      </div>
                      <div>
                        <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {chainData.prettyName || wallet.chainName}
                        </h4>
                        <p className={`text-sm font-mono ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {wallet.address}
                        </p>
                        {chainData.chainSymbol && (
                          <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                            {chainData.chainSymbol}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => copyToClipboard(wallet.address, wallet._id)}
                        className={`px-3 py-2 rounded-lg flex items-center text-sm transition-colors ${
                          copiedAddress === wallet._id
                            ? 'bg-green-500 text-white'
                            : isDarkMode
                              ? 'bg-gray-600 hover:bg-gray-500 text-white'
                              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                        }`}
                      >
                        {copiedAddress === wallet._id ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Link className={`mx-auto h-12 w-12 mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
            <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              No linked wallets found. Connect additional wallets to see them here.
            </p>
          </div>
        )}
      </motion.div>

      {/* Referrer Modal */}
      {showReferrerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            className={`w-full max-w-md p-6 rounded-lg ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Add Referrer
              </h3>
              <button
                onClick={() => {
                  setShowReferrerModal(false);
                  setReferralCode('');
                  setReferrerError(null);
                }}
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode
                    ? 'hover:bg-gray-700 text-gray-400'
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Enter the referral code (public address) of the person who referred you. This can only be set once.
            </p>
            
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Referral Code
              </label>
              <input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                placeholder="Enter referrer's public address"
                className={`w-full p-3 rounded-lg border font-mono text-sm ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>
            
            {referrerError && (
              <div className="mb-4 p-3 rounded-lg bg-red-100 border border-red-300">
                <p className="text-red-800 text-sm">{referrerError}</p>
              </div>
            )}
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowReferrerModal(false);
                  setReferralCode('');
                  setReferrerError(null);
                }}
                className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                  isDarkMode
                    ? 'border-gray-600 text-gray-400 hover:bg-gray-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
                disabled={submittingReferrer}
              >
                Cancel
              </button>
              <button
                onClick={handleSetReferrer}
                disabled={submittingReferrer || !referralCode.trim()}
                className={`flex-1 px-4 py-2 rounded-lg text-white transition-colors ${
                  submittingReferrer || !referralCode.trim()
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                {submittingReferrer ? 'Setting...' : 'Set Referrer'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Settings;
