import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, TrendingUp, X, Info } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface HalalScreenerData {
  _id: string;
  blockchainName: string;
  blockchainToken: string;
  coinGeckoId: string;
  logoURL?: string;
  trading: {
    status: 'Non-Comfortable' | 'Comfortable' | 'Questionable';
    description: string;
  };
  staking: {
    status: 'Non-Comfortable' | 'Comfortable' | 'Questionable';
    description: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PriceData {
  [key: string]: {
    usd: number;
    usd_market_cap: number;
    usd_24h_vol?: number;
    usd_24h_change: number;
  };
}

const HalalScreener: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [screeners, setScreeners] = useState<HalalScreenerData[]>([]);
  const [priceData, setPriceData] = useState<PriceData>({});
  const [loading, setLoading] = useState(true);
  const [priceLoading, setPriceLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [popupInfo, setPopupInfo] = useState<{
    isOpen: boolean;
    type: 'trading' | 'staking' | null;
    status: string;
    blockchain: string;
    description: string;
  }>({
    isOpen: false,
    type: null,
    status: '',
    blockchain: '',
    description: ''
  });
  const hasInitialized = useRef(false);

  const fetchScreeners = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching halal screeners...');
      const response = await fetch('http://localhost:3000/api/halal-screener');
      
      if (!response.ok) {
        throw new Error('Failed to fetch screeners');
      }
      
      const result = await response.json();
      console.log('Screeners API Response:', result);
      
      if (result.success && result.data?.screeners) {
        setScreeners(result.data.screeners);
        // Fetch pricing data after getting screeners
        await fetchPricingData();
      } else {
        throw new Error('No screener data available');
      }
    } catch (err) {
      console.error('Error fetching screeners:', err);
      setError('Failed to load halal screener data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch pricing data from backend API
  const fetchPricingData = async () => {
    try {
      setPriceLoading(true);
      
      console.log('Fetching pricing data from backend API...');
      const response = await fetch('http://localhost:3000/api/investors/prices');
      
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Pricing API Response:', result);
        
        // Handle the actual response structure: data.prices.assets
        const assets = result.data?.prices?.assets || result.data?.assets;
        
        if (result.success && assets?.halalScreener) {
          // Transform the backend response to match our expected format
          const transformedPrices: PriceData = {};
          
          assets.halalScreener.forEach((asset: any) => {
            if (asset.coinGeckoId && asset.price) {
              transformedPrices[asset.coinGeckoId] = {
                usd: asset.price.usd,
                usd_market_cap: asset.price.usd_market_cap,
                usd_24h_change: asset.price.usd_24h_change,
              };
            }
          });
          
          setPriceData(transformedPrices);
          console.log('Transformed pricing data:', transformedPrices);
        } else {
          console.warn('No pricing data available from backend');
          console.log('Result structure:', result);
        }
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch pricing data from backend API:', response.status, errorText);
      }
    } catch (error) {
      console.error('Error fetching pricing data:', error);
    } finally {
      setPriceLoading(false);
    }
  };

  // Helper functions for formatting
  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return `$${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
    } else if (price >= 1) {
      return `$${price.toFixed(2)}`;
    } else if (price >= 0.01) {
      return `$${price.toFixed(4)}`;
    } else {
      return `$${price.toFixed(6)}`;
    }
  };

  const formatMarketCap = (marketCap: number) => {
    if (marketCap >= 1e12) {
      return `$${(marketCap / 1e12).toFixed(2)}T`;
    } else if (marketCap >= 1e9) {
      return `$${(marketCap / 1e9).toFixed(2)}B`;
    } else if (marketCap >= 1e6) {
      return `$${(marketCap / 1e6).toFixed(2)}M`;
    } else if (marketCap >= 1e3) {
      return `$${(marketCap / 1e3).toFixed(2)}K`;
    } else {
      return `$${marketCap.toFixed(2)}`;
    }
  };

  const formatChange = (change: number) => {
    const formattedChange = Math.abs(change).toFixed(2);
    return change >= 0 ? `+${formattedChange}%` : `-${formattedChange}%`;
  };

  // Get price data for a specific screener
  const getPriceInfo = (coinGeckoId: string) => {
    const data = priceData[coinGeckoId];
    if (!data) {
      return {
        price: 'N/A',
        change: 'N/A',
        marketCap: 'N/A',
        changeColor: isDarkMode ? 'text-gray-400' : 'text-gray-500'
      };
    }

    const changeColor = data.usd_24h_change >= 0 
      ? 'text-green-500' 
      : 'text-red-500';

    return {
      price: formatPrice(data.usd),
      change: formatChange(data.usd_24h_change),
      marketCap: formatMarketCap(data.usd_market_cap),
      changeColor
    };
  };

  // Filter screeners based on search term
  const filteredScreeners = screeners.filter(screener =>
    screener.blockchainName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    screener.blockchainToken.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Compliance descriptions
  const getComplianceDescription = (type: 'trading' | 'staking', status: string, blockchain: string) => {
    const descriptions = {
      trading: {
        "Comfortable": `${blockchain} trading is considered Shariah-compliant as the blockchain operates on proof-of-stake consensus mechanism without interest-based transactions. The network's governance model aligns with Islamic principles of fair participation.`,
        "Questionable": `${blockchain} trading requires careful consideration. While the core technology is permissible, some aspects of the network's economic model or governance structure may need further scholarly review to ensure full compliance.`,
        "Non-Comfortable": `${blockchain} trading is not recommended due to concerns about interest-based mechanisms (riba), excessive uncertainty (gharar), or governance structures that may conflict with Shariah principles.`
      },
      staking: {
        "Comfortable": `${blockchain} staking is Shariah-compliant as it involves participating in network security through legitimate proof-of-stake validation. Rewards are earned through active network participation rather than interest-based lending.`,
        "Questionable": `${blockchain} staking requires careful evaluation. While the validation process may be permissible, certain aspects of the reward mechanism or network economics need further scholarly assessment.`,
        "Non-Comfortable": `${blockchain} staking is not recommended due to elements that resemble interest-based returns (riba) or participation in prohibited activities that conflict with Islamic finance principles.`
      }
    };
    
    return descriptions[type][status as keyof typeof descriptions.trading] || "No description available.";
  };

  const openPopup = (type: 'trading' | 'staking', status: string, blockchain: string, description?: string) => {
    setPopupInfo({
      isOpen: true,
      type,
      status,
      blockchain,
      description: description || getComplianceDescription(type, status, blockchain)
    });
  };

  const closePopup = () => {
    setPopupInfo({
      isOpen: false,
      type: null,
      status: '',
      blockchain: '',
      description: ''
    });
  };

  const getComplianceColor = (status: string) => {
    switch (status) {
      case "Comfortable":
        return "text-green-500";
      case "Questionable":
        return "text-yellow-500";
      case "Non-Comfortable":
        return "text-red-500";
      default:
        return isDarkMode ? "text-gray-300" : "text-gray-600";
    }
  };

  const getComplianceBg = (status: string) => {
    switch (status) {
      case "Comfortable":
        return isDarkMode ? "bg-green-900/30" : "bg-green-100";
      case "Questionable":
        return isDarkMode ? "bg-yellow-900/30" : "bg-yellow-100";
      case "Non-Comfortable":
        return isDarkMode ? "bg-red-900/30" : "bg-red-100";
      default:
        return isDarkMode ? "bg-gray-800" : "bg-gray-100";
    }
  };

  useEffect(() => {
    if (hasInitialized.current) {
      return;
    }
    
    hasInitialized.current = true;
    fetchScreeners();
  }, []);

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
          Halal Screener
        </h1>
        <p className={`text-lg ${
          isDarkMode ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Shariah compliance status of blockchain networks with live market data
        </p>
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
              Loading halal screener data...
            </span>
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <div className={`text-lg mb-4 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
            Failed to load halal screener data
          </div>
          <p className={`text-sm mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {error}
          </p>
          <button
            onClick={fetchScreeners}
            className="bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
          >
            Retry
          </button>
        </div>
      ) : screeners.length === 0 ? (
        <div className="text-center py-12">
          <div className={`text-lg mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            No halal screener data available
          </div>
        </div>
      ) : (
        <motion.div
          className={`rounded-xl border ${
            isDarkMode ? "bg-gray-800/80 border-gray-700" : "bg-gray-50 border-gray-200"
          } overflow-hidden shadow-xl backdrop-blur-sm`}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          {/* Search Bar */}
          <div className={`px-6 py-4 border-b ${
            isDarkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"
          }`}>
            <div className="flex items-center justify-between">
              <div className="relative max-w-md">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                  isDarkMode ? "text-gray-400" : "text-gray-500"
                }`} />
                <input
                  type="text"
                  placeholder="Search blockchain or token..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                    isDarkMode 
                      ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" 
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                  } focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors`}
                />
              </div>
              <div className={`text-sm font-medium mr-30 ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}>
                Shariah Compliance
              </div>
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${
                  isDarkMode ? "border-gray-700" : "border-gray-200"
                }`}>
                  <th className={`px-6 py-4 text-left text-sm font-medium ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  }`}>
                    Blockchain
                  </th>
                  <th className={`px-6 py-4 text-left text-sm font-medium ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  }`}>
                    Price
                  </th>
                  <th className={`px-6 py-4 text-left text-sm font-medium ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  }`}>
                    24h Change
                  </th>
                  <th className={`px-6 py-4 text-left text-sm font-medium ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  }`}>
                    Market Cap
                  </th>
                  <th className="px-6 py-4">
                    <div className="grid grid-cols-2 gap-2 text-sm font-medium">
                      <span className={`text-center ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}>
                        Trading
                      </span>
                      <span className={`text-center ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}>
                        Staking
                      </span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredScreeners.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center">
                      <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {searchTerm ? 'No screeners found matching your search.' : 'No halal screeners available.'}
                      </span>
                    </td>
                  </tr>
                ) : (
                  filteredScreeners.map((screener, index) => {
                    const priceInfo = getPriceInfo(screener.coinGeckoId);
                    
                    return (
                    <motion.tr
                      key={screener._id}
                      className={`border-b ${
                        isDarkMode ? "border-gray-700" : "border-gray-200"
                      } hover:${
                        isDarkMode ? "bg-gray-700/50" : "bg-gray-50"
                      } transition-colors`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                    >
                      {/* Blockchain */}
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          {screener.logoURL ? (
                            <img 
                              src={screener.logoURL} 
                              alt={`${screener.blockchainName} logo`}
                              className="w-8 h-8 rounded-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const fallback = target.nextElementSibling as HTMLElement;
                                if (fallback) {
                                  fallback.classList.remove('hidden');
                                }
                              }}
                            />
                          ) : null}
                          <div className={`w-8 h-8 rounded-full ${
                            isDarkMode ? "bg-gray-700" : "bg-gray-100"
                          } flex items-center justify-center text-sm font-bold ${
                            isDarkMode ? "text-white" : "text-gray-900"
                          } ${screener.logoURL ? 'hidden' : ''}`}>
                            {screener.blockchainToken.slice(0, 2)}
                          </div>
                          <div>
                            <div className={`font-medium ${
                              isDarkMode ? "text-white" : "text-gray-900"
                            }`}>
                              {screener.blockchainName}
                            </div>
                            <div className={`text-sm ${
                              isDarkMode ? "text-gray-400" : "text-gray-500"
                            }`}>
                              {screener.blockchainToken}
                            </div>
                          </div>
                        </div>
                      </td>

                    {/* Price */}
                    <td className={`px-6 py-4 font-medium ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}>
                      {priceLoading ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-500"></div>
                          <span className="text-sm">Loading...</span>
                        </div>
                      ) : (
                        priceInfo.price
                      )}
                    </td>

                    {/* 24h Change */}
                    <td className="px-6 py-4">
                      {priceLoading ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-500"></div>
                          <span className="text-sm">Loading...</span>
                        </div>
                      ) : (
                        <div className={`flex items-center space-x-1 ${priceInfo.changeColor}`}>
                          <TrendingUp className="w-4 h-4" />
                          <span className="text-sm font-medium">{priceInfo.change}</span>
                        </div>
                      )}
                    </td>

                    {/* Market Cap */}
                    <td className={`px-6 py-4 ${
                      isDarkMode ? "text-gray-300" : "text-gray-600"
                    }`}>
                      {priceLoading ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-500"></div>
                          <span className="text-sm">Loading...</span>
                        </div>
                      ) : (
                        <span className="text-sm font-medium">{priceInfo.marketCap}</span>
                      )}
                    </td>

                    {/* Shariah Compliance */}
                    <td className="px-6 py-4">
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => openPopup('trading', screener.trading.status, screener.blockchainName, screener.trading.description)}
                          className={`text-xs px-2 py-1 rounded-full text-center cursor-pointer hover:scale-105 transition-transform flex items-center justify-center gap-1 ${
                            getComplianceColor(screener.trading.status)
                          } ${getComplianceBg(screener.trading.status)}`}
                        >
                          {screener.trading.status}
                          <Info className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={() => openPopup('staking', screener.staking.status, screener.blockchainName, screener.staking.description)}
                          className={`text-xs px-2 py-1 rounded-full text-center cursor-pointer hover:scale-105 transition-transform flex items-center justify-center gap-1 ${
                            getComplianceColor(screener.staking.status)
                          } ${getComplianceBg(screener.staking.status)}`}
                        >
                          {screener.staking.status}
                          <Info className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                  );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className={`px-6 py-4 border-t ${
            isDarkMode ? "border-gray-700 bg-gray-800/30" : "border-gray-200 bg-gray-50"
          } flex flex-col sm:flex-row items-center justify-between gap-4`}>
            <div className={`text-sm ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}>
              <div>
                Showing {filteredScreeners.length} of {screeners.length} screeners
              </div>
              {searchTerm && (
                <div className={`text-xs mt-1 ${
                  isDarkMode ? "text-gray-500" : "text-gray-500"
                }`}>
                  Filtered by: "{searchTerm}"
                </div>
              )}
            </div>
            
            {screeners.length > 0 && (
              <div className={`text-sm ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}>
                {screeners.filter(s => s.isActive).length} active • {screeners.filter(s => !s.isActive).length} inactive
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Compliance Popup Modal */}
      <AnimatePresence>
        {popupInfo.isOpen && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closePopup}
          >
            <motion.div
              className={`max-w-md w-full rounded-xl p-6 ${
                isDarkMode ? "bg-gray-800 border border-gray-700" : "bg-gray-50 border border-gray-200"
              } shadow-2xl`}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    popupInfo.status === "Comfortable" ? "bg-green-500" :
                    popupInfo.status === "Questionable" ? "bg-yellow-500" : "bg-red-500"
                  }`} />
                  <h3 className={`text-lg font-semibold ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}>
                    {popupInfo.status} - {popupInfo.type === 'trading' ? 'Trading' : 'Staking'}
                  </h3>
                </div>
                <button
                  onClick={closePopup}
                  className={`p-1 rounded-lg hover:bg-gray-100 ${
                    isDarkMode ? "hover:bg-gray-700 text-gray-400" : "text-gray-500"
                  } transition-colors`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="space-y-4">
                <div className={`text-sm ${
                  isDarkMode ? "text-gray-300" : "text-gray-600"
                }`}>
                  <strong className={isDarkMode ? "text-gray-200" : "text-gray-700"}>
                    {popupInfo.blockchain}
                  </strong>
                </div>
                
                <p className={`text-sm leading-relaxed ${
                  isDarkMode ? "text-gray-300" : "text-gray-600"
                }`}>
                  {popupInfo.description}
                </p>

                {/* Status Badge */}
                <div className="flex justify-center pt-2">
                  <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                    popupInfo.status === "Comfortable" 
                      ? `${isDarkMode ? "bg-green-900/30 text-green-400" : "bg-green-100 text-green-700"}`
                      : popupInfo.status === "Questionable"
                      ? `${isDarkMode ? "bg-yellow-900/30 text-yellow-400" : "bg-yellow-100 text-yellow-700"}`
                      : `${isDarkMode ? "bg-red-900/30 text-red-400" : "bg-red-100 text-red-700"}`
                  }`}>
                    {popupInfo.status}
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className={`text-xs text-center ${
                  isDarkMode ? "text-gray-400" : "text-gray-500"
                }`}>
                  Compliance assessment based on Islamic finance principles
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HalalScreener;
