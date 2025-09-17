import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useWallet } from '../../contexts/WalletContext';
import { X, AlertTriangle } from 'lucide-react';
import adminApiClient from '../../utils/adminApiClient';

interface Activity {
  _id: string;
  adminWallet: string;
  adminName: string;
  activity: string;
  ipAddress: string;
  createdAt: string;
  relativeTime: string;
}

interface PlatformStats {
  total_value_staked: number;
  active_delegators: number;
  total_users: number;
  active_chains: number;
  total_value_commission: number;
  last_updated: string;
}

interface LogFile {
  name: string;
  size: number;
  sizeFormatted: string;
  lastModified: string;
  created: string;
}

interface LogsInfo {
  directory: string;
  fileCount: number;
  totalSize: number;
  totalSizeFormatted: string;
  files: LogFile[];
}

const AdminDashboard: React.FC = () => {
  const { isDarkMode } = useTheme();
  const { namadaNotAvailable } = useWallet();
  const navigate = useNavigate();
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [logsInfo, setLogsInfo] = useState<LogsInfo | null>(null);
  const [logsLoading, setLogsLoading] = useState(true);
  const [downloadingLogs, setDownloadingLogs] = useState(false);
  const [showNamadaNotification, setShowNamadaNotification] = useState(false);

  // Fetch platform statistics from API
  const fetchPlatformStats = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/stats');
      const result = await response.json();
      
      if (result.success && result.data) {
        setPlatformStats(result.data);
      }
    } catch (err) {
      console.error('Error fetching platform stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Fetch logs information from API
  const fetchLogsInfo = async () => {
    try {
      const result = await adminApiClient.get('/admin/logs/info');
      
      if (result.success && result.data?.logsInfo) {
        setLogsInfo(result.data.logsInfo);
      }
    } catch (err) {
      console.error('Error fetching logs info:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  // Download logs ZIP file
  const handleDownloadLogs = async () => {
    setDownloadingLogs(true);
    try {
      const response = await fetch('http://localhost:3000/api/admin/logs/download', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download logs');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `ethicalnode_logs_${new Date().toISOString().slice(0, 10)}.zip`;

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading logs:', err);
    } finally {
      setDownloadingLogs(false);
    }
  };

  // Fetch recent activities from API
  const fetchRecentActivities = async () => {
    try {
      const result = await adminApiClient.get('/admin-management/activities?page=1&limit=5');
      
      if (result.success && result.data?.activities) {
        setRecentActivities(result.data.activities);
      }
    } catch (err) {
      console.error('Error fetching activities:', err);
    } finally {
      setActivitiesLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentActivities();
    fetchPlatformStats();
    fetchLogsInfo();
  }, []);

  // Show Namada notification if wallet is not available
  useEffect(() => {
    if (namadaNotAvailable) {
      setShowNamadaNotification(true);
    }
  }, [namadaNotAvailable]);

  // Format currency helper
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format number helper
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  // Generate stats data from API response
  const getStatsData = () => {
    if (!platformStats) return [];
    
    return [
      { 
        title: 'Total Users', 
        value: formatNumber(platformStats.total_users),  
        icon: '👥' 
      },
      { 
        title: 'Active Delegators', 
        value: formatNumber(platformStats.active_delegators), 
        icon: '🤝' 
      },
      { 
        title: 'Active Validators', 
        value: formatNumber(platformStats.active_chains), 
        icon: '⚡' 
      },
      { 
        title: 'Total Value Staked', 
        value: formatCurrency(platformStats.total_value_staked), 
        icon: '💰' 
      },
      { 
        title: 'Current Commission', 
        value: formatCurrency(platformStats.total_value_commission), 
        icon: '📈' 
      }
    ];
  };

  const stats = getStatsData();

  return (
    <div className="space-y-6">
      {/* Namada Not Available Notification */}
      {showNamadaNotification && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 right-4 z-50 max-w-sm w-full"
        >
          <div className={`rounded-lg shadow-lg border-2 p-4 ${
            isDarkMode 
              ? 'bg-yellow-900 border-yellow-600 text-yellow-100' 
              : 'bg-yellow-50 border-yellow-300 text-yellow-800'
          }`}>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="ml-3 w-0 flex-1">
                <h3 className="text-sm font-medium mb-1">
                  Namada Wallet Not Detected
                </h3>
                <p className="text-sm">
                  The Namada wallet extension was not found. Please install it to access the full functionality of the platform.
                </p>
                <div className="mt-3">
                  <button
                    onClick={() => window.open('https://namada.net', '_blank')}
                    className={`text-sm underline font-medium hover:no-underline ${
                      isDarkMode ? 'text-yellow-200' : 'text-yellow-700'
                    }`}
                  >
                    Install Namada Wallet
                  </button>
                </div>
              </div>
              <div className="ml-4 flex-shrink-0">
                <button
                  onClick={() => setShowNamadaNotification(false)}
                  className={`rounded-md inline-flex ${
                    isDarkMode 
                      ? 'text-yellow-200 hover:text-yellow-100' 
                      : 'text-yellow-600 hover:text-yellow-800'
                  }`}
                >
                  <span className="sr-only">Close</span>
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className={`text-3xl font-bold mb-2 ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}>
          Admin Dashboard
        </h1>
        <p className={`text-lg ${
          isDarkMode ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Welcome back! Here's an overview of your platform.
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {statsLoading ? (
          // Loading skeleton for stats
          [...Array(5)].map((_, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`p-6 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-white border-gray-200'
              } shadow-sm animate-pulse`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className={`h-4 rounded mb-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                  <div className={`h-8 rounded mb-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                  <div className={`h-3 rounded w-12 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                </div>
                <div className={`w-8 h-8 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
              </div>
            </motion.div>
          ))
        ) : (
          stats.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`p-6 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-white border-gray-200'
              } shadow-sm hover:shadow-md transition-shadow`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {stat.title}
                  </p>
                  <p className={`text-2xl font-bold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {stat.value}
                  </p>
                </div>
                <div className="text-3xl">{stat.icon}</div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* System Logs Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className={`p-6 rounded-lg border ${
          isDarkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        } shadow-sm`}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className={`text-lg font-semibold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              System Logs
            </h3>
            <p className={`text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Monitor and download system logs
            </p>
          </div>
          <button 
            onClick={handleDownloadLogs}
            disabled={downloadingLogs || !logsInfo}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              downloadingLogs || !logsInfo
                ? isDarkMode 
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : isDarkMode
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {downloadingLogs ? 'Downloading...' : 'Download Logs'}
          </button>
        </div>
        
        {logsLoading ? (
          <div className="flex items-center space-x-4 animate-pulse">
            <div className={`h-12 w-12 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
            <div className="flex-1">
              <div className={`h-4 rounded mb-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
              <div className={`h-3 rounded w-24 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
            </div>
          </div>
        ) : logsInfo ? (
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-lg ${
                isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
              }`}>
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <div className="flex items-baseline space-x-4">
                  <div className="text-center">
                    <p className={`text-2xl font-bold ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {logsInfo.fileCount}
                    </p>
                    <p className={`text-xs ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Files
                    </p>
                  </div>
                  <div className="text-center">
                    <p className={`text-2xl font-bold ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {logsInfo.totalSizeFormatted}
                    </p>
                    <p className={`text-xs ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Total Size
                    </p>
                  </div>
                </div>
                <p className={`text-xs mt-1 ${
                  isDarkMode ? 'text-gray-500' : 'text-gray-500'
                }`}>
                  {logsInfo.directory}
                </p>
              </div>
            </div>
            {logsInfo.files.length > 0 && (
              <div className="flex-1">
                <p className={`text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Recent Files:
                </p>
                <div className="space-y-1">
                  {logsInfo.files.slice(0, 3).map((file, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className={`text-xs font-mono ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {file.name}
                      </span>
                      <span className={`text-xs ${
                        isDarkMode ? 'text-gray-500' : 'text-gray-500'
                      }`}>
                        {file.sizeFormatted}
                      </span>
                    </div>
                  ))}
                  {logsInfo.files.length > 3 && (
                    <p className={`text-xs ${
                      isDarkMode ? 'text-gray-500' : 'text-gray-500'
                    }`}>
                      +{logsInfo.files.length - 3} more files...
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={`text-center py-4 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm">Unable to load logs information</p>
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className={`p-6 rounded-lg border ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          } shadow-sm`}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className={`text-lg font-semibold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Recent Activities
              </h3>
              {platformStats && (
                <p className={`text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Last updated: {new Date(platformStats.last_updated).toLocaleString()}
                </p>
              )}
            </div>
            <button 
              onClick={() => navigate('/admin/activities')}
              className={`text-sm font-medium transition-colors ${
                isDarkMode ? 'text-teal-400 hover:text-teal-300' : 'text-teal-600 hover:text-teal-700'
              }`}
            >
              View All
            </button>
          </div>
          
          {activitiesLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="flex items-start space-x-3 animate-pulse">
                  <div className="w-2 h-2 bg-gray-300 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="flex-1">
                    <div className={`h-4 rounded mb-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                    <div className={`h-3 rounded w-20 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                  </div>
                </div>
              ))}
            </div>
          ) : recentActivities.length > 0 ? (
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity._id} className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="flex-1">
                    <p className={`text-sm ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      <span className="font-medium">{activity.activity}</span>
                      {activity.adminName && (
                        <span className={`ml-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          by {activity.adminName}
                        </span>
                      )}
                    </p>
                    <p className={`text-xs ${
                      isDarkMode ? 'text-gray-500' : 'text-gray-500'
                    }`}>
                      {activity.relativeTime}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={`text-center py-8 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-sm">No recent activities</p>
            </div>
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className={`p-6 rounded-lg border ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          } shadow-sm`}
        >
          <h3 className={`text-lg font-semibold mb-4 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Quick Actions
          </h3>
          <div className="space-y-3">
            <button 
              onClick={() => navigate('/admin/investors')}
              className="w-full flex items-center space-x-3 p-3 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Investor Management</span>
            </button>

            <button 
              onClick={() => navigate('/admin/halal-screener')}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                isDarkMode
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Halal Screener</span>
            </button>

            <button 
              onClick={() => navigate('/admin/org-referral-codes')}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                isDarkMode
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span>Org Referral Codes</span>
            </button>

            <button 
              onClick={() => navigate('/admin/logs')}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                isDarkMode
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>System Logs</span>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminDashboard;
