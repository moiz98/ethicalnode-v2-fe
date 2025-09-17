import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '../../contexts/WalletContext';
import { useTheme } from '../../contexts/ThemeContext';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { connectWallets, isLoading, error } = useWallet();
  const { isDarkMode } = useTheme();
  const [selectedWallet, setSelectedWallet] = useState<'keplr' | 'namada' | null>(null);

  const handleWalletConnect = async (walletType: 'keplr' | 'namada') => {
    setSelectedWallet(walletType);
    try {
      await connectWallets();
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Wallet connection failed:', error);
    } finally {
      setSelectedWallet(null);
    }
  };

  const walletOptions = [
    {
      id: 'keplr',
      name: 'Keplr Wallet',
      description: 'Connect with Keplr for Cosmos ecosystem',
      icon: (
        <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-lg">K</span>
        </div>
      ),
      available: typeof window !== 'undefined' && !!(window as any).keplr
    },
    {
      id: 'namada',
      name: 'Namada Keychain',
      description: 'Connect with Namada for privacy-focused staking',
      icon: (
        <div className="w-12 h-12 bg-gradient-to-r from-green-600 to-teal-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-lg">N</span>
        </div>
      ),
      available: typeof window !== 'undefined' && !!(window as any).namada
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-opacity-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`w-full max-w-md rounded-lg shadow-xl ${
              isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
            }`}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className={`text-xl font-semibold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Connect Wallet
                </h3>
                <button
                  onClick={onClose}
                  className={`text-gray-500 hover:text-gray-700 ${
                    isDarkMode ? 'text-gray-400 hover:text-gray-200' : ''
                  }`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <div className="space-y-3">
                {walletOptions.map((wallet) => (
                  <button
                    key={wallet.id}
                    onClick={() => handleWalletConnect(wallet.id as 'keplr' | 'namada')}
                    disabled={!wallet.available || isLoading}
                    className={`w-full p-4 rounded-lg border transition-all duration-200 flex items-center space-x-4 ${
                      wallet.available
                        ? `hover:border-teal-500 ${
                            isDarkMode
                              ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600'
                              : 'bg-white border-gray-200 text-gray-900 hover:bg-gray-50'
                          }`
                        : `opacity-50 cursor-not-allowed ${
                            isDarkMode
                              ? 'bg-gray-700 border-gray-600 text-gray-400'
                              : 'bg-gray-100 border-gray-200 text-gray-500'
                          }`
                    }`}
                  >
                    {wallet.icon}
                    <div className="flex-1 text-left">
                      <div className="font-medium">{wallet.name}</div>
                      <div className={`text-sm ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {wallet.available ? wallet.description : 'Not installed'}
                      </div>
                    </div>
                    {isLoading && selectedWallet === wallet.id && (
                      <div className="w-5 h-5">
                        <svg className="animate-spin h-5 w-5 text-teal-600" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <div className={`mt-6 p-4 rounded-lg ${
                isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
              }`}>
                <p className={`text-sm ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  By connecting a wallet, you agree to our Terms of Service and acknowledge that you have read and understand our Privacy Policy.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default WalletModal;
