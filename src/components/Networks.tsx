import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';

interface NetworkData {
  id: string;
  name: string;
  symbol: string;
  apy: string;
  validators: number;
  status: 'Active';
  logo: string;
}

const Networks: React.FC = () => {
  const { isDarkMode } = useTheme();

  const networks: NetworkData[] = [
    {
      id: 'ethereum',
      name: 'Ethereum',
      symbol: 'ETH',
      apy: '4.2%',
      validators: 12,
      status: 'Active',
      logo: 'E'
    },
    {
      id: 'cardano',
      name: 'Cardano',
      symbol: 'ADA',
      apy: '5.1%',
      validators: 8,
      status: 'Active',
      logo: 'A'
    },
    {
      id: 'polkadot',
      name: 'Polkadot',
      symbol: 'DOT',
      apy: '12.3%',
      validators: 15,
      status: 'Active',
      logo: 'D'
    },
    {
      id: 'cosmos',
      name: 'Cosmos',
      symbol: 'ATOM',
      apy: '18.5%',
      validators: 6,
      status: 'Active',
      logo: 'A'
    },
    {
      id: 'avalanche',
      name: 'Avalanche',
      symbol: 'AVAX',
      apy: '9.2%',
      validators: 10,
      status: 'Active',
      logo: 'A'
    },
    {
      id: 'near',
      name: 'Near Protocol',
      symbol: 'NEAR',
      apy: '11.8%',
      validators: 4,
      status: 'Active',
      logo: 'N'
    }
  ];

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

        {/* Networks Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {networks.map((network) => (
            <motion.div
              key={network.id}
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
                  isDarkMode 
                    ? 'bg-teal-900/30 text-teal-400' 
                    : 'bg-teal-600 text-white'
                }`}>
                  {network.status}
                </span>
              </div>

              {/* Network Logo & Info */}
              <div className="flex items-start mb-6">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold mr-4 ${
                  isDarkMode 
                    ? 'bg-gray-700 text-white' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {network.logo}
                </div>
                <div>
                  <h3 className={`text-lg font-semibold mb-1 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {network.name}
                  </h3>
                  <p className={`text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {network.symbol}
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    APY
                  </span>
                  <span className="text-lg font-semibold text-teal-600 dark:text-teal-400">
                    {network.apy}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Validators
                  </span>
                  <span className={`font-medium ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {network.validators}
                  </span>
                </div>
              </div>

              {/* Stake Button */}
              <motion.button
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Stake
              </motion.button>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Networks;
