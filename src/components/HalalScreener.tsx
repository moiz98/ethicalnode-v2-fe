import { motion, AnimatePresence } from "framer-motion";
import { Search, TrendingUp, TrendingDown, X, Info } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import { useState } from "react";

const HalalScreener = () => {
  const { isDarkMode } = useTheme();
  const [popupInfo, setPopupInfo] = useState<{
    isOpen: boolean;
    type: 'trading' | 'staking' | null;
    status: string;
    blockchain: string;
  }>({
    isOpen: false,
    type: null,
    status: '',
    blockchain: ''
  });

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

  const openPopup = (type: 'trading' | 'staking', status: string, blockchain: string) => {
    setPopupInfo({
      isOpen: true,
      type,
      status,
      blockchain
    });
  };

  const closePopup = () => {
    setPopupInfo({
      isOpen: false,
      type: null,
      status: '',
      blockchain: ''
    });
  };

  // Sample data based on your attached images
  const cryptoData = [
    {
      blockchain: "Cosmos hub",
      symbol: "ATOM",
      price: "$4.776116",
      change24h: "8.15%",
      isPositive: true,
      marketCap: "$2,241,479,921.94",
      apy: "17.18%",
      trading: "Non-Comfortable",
      staking: "Non-Comfortable",
      logo: "🌐"
    },
    {
      blockchain: "Fetch.ai",
      symbol: "FET",
      price: "$0.699493",
      change24h: "5.72%",
      isPositive: true,
      marketCap: "$1,841,489,137.88",
      apy: "6.81%",
      trading: "Comfortable",
      staking: "Comfortable",
      logo: "🤖"
    },
    {
      blockchain: "Medibloc",
      symbol: "MED",
      price: "$0.005652",
      change24h: "3.28%",
      isPositive: true,
      marketCap: "$56,729,370.36",
      apy: "49.83%",
      trading: "Questionable",
      staking: "Comfortable",
      logo: "⚕️"
    },
    {
      blockchain: "Persistence",
      symbol: "XPRT",
      price: "$0.035936",
      change24h: "1.56%",
      isPositive: true,
      marketCap: "$8,500,756.85",
      apy: "23.00%",
      trading: "Questionable",
      staking: "Comfortable",
      logo: "💎"
    },
    {
      blockchain: "Sentinel",
      symbol: "DVPN",
      price: "$0.000315",
      change24h: "7.60%",
      isPositive: true,
      marketCap: "$7,202,560.51",
      apy: "14.52%",
      trading: "Non-Comfortable",
      staking: "Non-Comfortable",
      logo: "🛡️"
    },
    {
      blockchain: "AssetMantle",
      symbol: "MNTL",
      price: "$0.000257",
      change24h: "10.17%",
      isPositive: true,
      marketCap: "$591,192.28",
      apy: "70.17%",
      trading: "Questionable",
      staking: "Comfortable",
      logo: "🏛️"
    }
  ];

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

  return (
    <div 
      id="halal-screener" 
      className={`py-20 ${
        isDarkMode 
          ? "bg-gray-900" 
          : "bg-white"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className={`text-3xl md:text-4xl lg:text-5xl font-bold ${
            isDarkMode ? "text-white" : "text-gray-900"
          } mb-4`}>
            Halal Crypto Screener
          </h2>
          <p className={`text-lg md:text-xl ${
            isDarkMode ? "text-gray-300" : "text-gray-600"
          } max-w-3xl mx-auto`}>
            Our Islamic scholars have carefully reviewed each blockchain network to ensure compliance with 
            Shariah principles before offering staking services.
          </p>
        </motion.div>

        {/* Table */}
        <motion.div
          className={`rounded-xl border ${
            isDarkMode ? "bg-gray-800/80 border-gray-700" : "bg-gray-50 border-gray-200"
          } overflow-hidden shadow-xl backdrop-blur-sm`}
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
        >
          {/* Search Bar inside table */}
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
                  placeholder="Search chain..."
                  className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                    isDarkMode 
                      ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" 
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                  } focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors`}
                />
              </div>
              <div className={`text-sm font-medium ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              } pr-20`}>
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
                  <th className={`px-6 py-4 text-left text-sm font-medium ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  }`}>
                    APY
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
                {cryptoData.map((crypto, index) => (
                  <motion.tr
                    key={crypto.symbol}
                    className={`border-b ${
                      isDarkMode ? "border-gray-700" : "border-gray-200"
                    } hover:${
                      isDarkMode ? "bg-gray-700/50" : "bg-gray-50"
                    } transition-colors`}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    viewport={{ once: true }}
                  >
                    {/* Blockchain */}
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full ${
                          isDarkMode ? "bg-gray-700" : "bg-gray-100"
                        } flex items-center justify-center text-sm`}>
                          {crypto.logo}
                        </div>
                        <div>
                          <div className={`font-medium ${
                            isDarkMode ? "text-white" : "text-gray-900"
                          }`}>
                            {crypto.blockchain}
                          </div>
                          <div className={`text-sm ${
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          }`}>
                            {crypto.symbol}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Price */}
                    <td className={`px-6 py-4 font-medium ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}>
                      {crypto.price}
                    </td>

                    {/* 24h Change */}
                    <td className="px-6 py-4">
                      <div className={`flex items-center space-x-1 ${
                        crypto.isPositive ? "text-green-500" : "text-red-500"
                      }`}>
                        {crypto.isPositive ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        <span className="font-medium">{crypto.change24h}</span>
                      </div>
                    </td>

                    {/* Market Cap */}
                    <td className={`px-6 py-4 ${
                      isDarkMode ? "text-gray-300" : "text-gray-600"
                    }`}>
                      {crypto.marketCap}
                    </td>

                    {/* APY */}
                    <td className={`px-6 py-4 font-medium ${
                      isDarkMode ? "text-teal-400" : "text-teal-600"
                    }`}>
                      {crypto.apy}
                    </td>

                    {/* Shariah Compliance */}
                    <td className="px-6 py-4">
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => openPopup('trading', crypto.trading, crypto.blockchain)}
                          className={`text-xs px-2 py-1 rounded-full text-center cursor-pointer hover:scale-105 transition-transform flex items-center justify-center gap-1 ${
                            getComplianceColor(crypto.trading)
                          } ${getComplianceBg(crypto.trading)}`}
                        >
                          {crypto.trading}
                          <Info className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={() => openPopup('staking', crypto.staking, crypto.blockchain)}
                          className={`text-xs px-2 py-1 rounded-full text-center cursor-pointer hover:scale-105 transition-transform flex items-center justify-center gap-1 ${
                            getComplianceColor(crypto.staking)
                          } ${getComplianceBg(crypto.staking)}`}
                        >
                          {crypto.staking}
                          <Info className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className={`px-6 py-4 border-t ${
            isDarkMode ? "border-gray-700 bg-gray-800/30" : "border-gray-200 bg-gray-50"
          } flex justify-center space-x-2`}>
            <button className={`w-8 h-8 rounded-lg ${
              isDarkMode ? "bg-teal-600 text-white" : "bg-teal-500 text-white"
            } flex items-center justify-center text-sm font-medium`}>
              1
            </button>
            <button className={`w-8 h-8 rounded-lg ${
              isDarkMode ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-200 text-gray-600 hover:bg-gray-300"
            } flex items-center justify-center text-sm font-medium transition-colors`}>
              2
            </button>
            <button className={`w-8 h-8 rounded-lg ${
              isDarkMode ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-200 text-gray-600 hover:bg-gray-300"
            } flex items-center justify-center text-sm font-medium transition-colors`}>
              3
            </button>
          </div>
        </motion.div>

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
                    {popupInfo.type && getComplianceDescription(
                      popupInfo.type, 
                      popupInfo.status, 
                      popupInfo.blockchain
                    )}
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
    </div>
  );
};

export default HalalScreener;
