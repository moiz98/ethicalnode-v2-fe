import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { X, ExternalLink, Mail, AlertTriangle } from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose }) => {
  const { isDarkMode } = useTheme();
  const oldVersionUrl = import.meta.env.VITE_OLD_VERSION_URL;

  // Don't render if no old version URL is configured
  if (!oldVersionUrl) {
    return null;
  }

  const handleV1Click = () => {
    window.open(oldVersionUrl, '_blank');
  };

  const handleEmailClick = () => {
    window.open('mailto:info@ethicalnode.com', '_blank');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`w-full max-w-lg rounded-xl shadow-2xl ${
              isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
            }`}
          >
            {/* Header */}
            <div className="relative p-6 pb-4">
              <button
                onClick={onClose}
                className={`absolute top-4 right-4 p-2 rounded-lg transition-colors ${
                  isDarkMode 
                    ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-green-500 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-xl">🎉</span>
                </div>
                <div>
                  <h2 className={`text-2xl font-bold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Welcome to EthicalNode V2!
                  </h2>
                  <p className={`text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Important migration information
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 pb-6">
              <div className={`p-4 rounded-lg mb-6 ${
                isDarkMode ? 'bg-gray-700 border-l-4 border-l-teal-500' : 'bg-teal-50 border-l-4 border-l-teal-500'
              }`}>
                <div className="flex items-start space-x-3">
                  <AlertTriangle className={`w-5 h-5 mt-0.5 ${
                    isDarkMode ? 'text-teal-400' : 'text-teal-600'
                  }`} />
                  <div>
                    <h3 className={`font-semibold mb-2 ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      Important Notice
                    </h3>
                    <p className={`text-sm leading-relaxed ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      We've launched our new and improved platform! The old version (V1) will be discontinued soon.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className={`p-4 rounded-lg ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <h4 className={`font-medium mb-2 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    📋 Action Required - Referral Bonuses
                  </h4>
                  <p className={`text-sm mb-3 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    If you have unclaimed referral bonuses, please claim them from the old platform before it's discontinued.
                  </p>
                  <button
                    onClick={handleV1Click}
                    className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isDarkMode
                        ? 'bg-teal-600 hover:bg-teal-700 text-white'
                        : 'bg-teal-600 hover:bg-teal-700 text-white'
                    }`}
                  >
                    <span>Visit V1 Dashboard</span>
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>

                <div className={`p-4 rounded-lg ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <h4 className={`font-medium mb-2 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    🆕 What's New in V2
                  </h4>
                  <ul className={`text-sm space-y-1 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    <li>• Enhanced user interface and experience</li>
                    <li>• Improved Halal screening tools</li>
                    <li>• Better performance and reliability</li>
                    <li>• New features and functionality</li>
                  </ul>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={onClose}
                  className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isDarkMode
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  I'll explore V2
                </button>
                <button
                  onClick={handleV1Click}
                  className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors bg-teal-600 hover:bg-teal-700 text-white flex items-center space-x-2`}
                >
                  <span>Check V1 Dashboard</span>
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>

              {/* Footer */}
              <div className={`border-t pt-4 ${
                isDarkMode ? 'border-gray-700' : 'border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Mail className={`w-4 h-4 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`} />
                    <span className={`text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Need help?
                    </span>
                  </div>
                  <button
                    onClick={handleEmailClick}
                    className={`text-sm font-medium transition-colors ${
                      isDarkMode
                        ? 'text-teal-400 hover:text-teal-300'
                        : 'text-teal-600 hover:text-teal-700'
                    }`}
                  >
                    info@ethicalnode.com
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default WelcomeModal;