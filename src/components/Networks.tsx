import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { assetLists } from 'chain-registry';

// Interface matching the exact backend API response
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

const Networks: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [validators, setValidators] = useState<Validator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasInitialized = useRef(false);

  // Function to fetch validators from API
  const fetchValidators = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching validators for Networks component...');

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/validators`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      
      const result = await response.json();
      console.log('API Response:', result);
      
      if (result.success && result.data?.validators) {
        console.log(`Found ${result.data.validators.length} validators`);
        setValidators(result.data.validators);
      } else {
        throw new Error('No data available');
      }
    } catch (err) {
      console.error('Error fetching validators:', err);
      setError('Failed to load validator data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Prevent duplicate calls in React Strict Mode (development)
    if (hasInitialized.current) {
      console.log('Networks component - already initialized, skipping duplicate call');
      return;
    }
    
    hasInitialized.current = true;
    console.log('Networks component mounted - calling fetchValidators');
    fetchValidators();
  }, []);

  // Group validators by chain for display
  const groupedValidators = validators.reduce((acc, validator) => {
    const chainKey = validator.chainId;
    if (!acc[chainKey]) {
      acc[chainKey] = [];
    }
    acc[chainKey].push(validator);
    return acc;
  }, {} as Record<string, Validator[]>);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.215, 0.61, 0.355, 1] as const
      }
    }
  };

  return (
    <section 
      id="networks" 
      className={`py-20 px-4 ${
        isDarkMode 
          ? 'bg-gray-900' 
          : 'bg-white'
      }`}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className={`text-4xl font-bold mb-4 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Networks We Support
          </h2>
          <p className={`text-lg max-w-3xl mx-auto ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            EthicalNode operates high-performance validators across multiple Shariah-compliant blockchain networks.
          </p>
        </motion.div>

        {/* Validators Grid */}
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
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              No validators found in the system.
            </p>
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {Object.entries(groupedValidators).map(([chainId, chainValidators]) => {
              const validator = chainValidators[0]; // Use first validator for display
              const chainName = validator.chainName;
              const chainData = getChainData(chainName);
              
              return (
                <motion.div
                  key={chainId}
                  variants={cardVariants}
                  className={`relative p-6 rounded-2xl border transition-all duration-300 hover:shadow-lg ${
                    isDarkMode 
                      ? 'bg-gray-800/80 border-gray-700 hover:border-gray-600' 
                      : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                  }`}
                  whileHover={{ y: -5 }}
                >
                  {/* Status Badge */}
                  <div className="absolute top-4 right-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      validator.isActive
                        ? isDarkMode 
                          ? 'bg-teal-900/30 text-teal-400' 
                          : 'bg-teal-600 text-white'
                        : isDarkMode
                          ? 'bg-red-900/30 text-red-400'
                          : 'bg-red-600 text-white'
                    }`}>
                      {validator.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Chain Logo & Info */}
                  <div className="flex items-start mb-6">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mr-4 ${
                      isDarkMode 
                        ? 'bg-gray-700 border border-gray-600' 
                        : 'bg-white border border-gray-200'
                    }`}>
                      {chainData.logoUrl ? (
                        <img 
                          src={chainData.logoUrl} 
                          alt={`${chainName} logo`}
                          className="w-10 h-10 rounded-lg object-contain"
                          onError={(e) => {
                            // Fallback to text icon if image fails to load
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = `<span class="text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}">${chainName?.charAt(0)?.toUpperCase() || 'N'}</span>`;
                            }
                          }}
                        />
                      ) : (
                        <span className={`text-lg font-bold ${
                          isDarkMode ? 'text-white' : 'text-gray-800'
                        }`}>
                          {chainName?.charAt(0)?.toUpperCase() || 'N'}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className={`text-lg font-semibold mb-1 ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {validator.prettyName}
                      </h3>
                      <p className={`text-sm font-medium ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {chainData.chainSymbol}
                      </p>
                      {chainValidators.length > 1 && (
                        <p className={`text-xs mt-1 ${
                          isDarkMode ? 'text-gray-500' : 'text-gray-500'
                        }`}>
                          {chainValidators.length} validators
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Validator Info */}
                  <div className="space-y-4 mb-6">
                    
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        APR
                      </span>
                      <span className="text-lg font-semibold text-teal-600 dark:text-teal-400">
                        {validator.validatorAPR ? `${validator.validatorAPR.toFixed(2)}%` : 'N/A'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Commission
                      </span>
                      <span className={`font-medium text-sm ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {validator.validatorCommission ? `${(validator.validatorCommission * 100).toFixed(1)}%` : 'N/A'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Voting Power
                      </span>
                      <span className={`font-medium text-sm ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {validator.validatorPower ? `${(validator.validatorPower * 100).toFixed(3)}%` : 'N/A'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Unbonding Period
                      </span>
                      <span className={`font-medium text-sm ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {validator.validatorUnbondingPeriod}
                      </span>
                    </div>
                  </div>

                  {/* Stake Button */}
                  <motion.button
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Stake Now
                  </motion.button>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default Networks;
