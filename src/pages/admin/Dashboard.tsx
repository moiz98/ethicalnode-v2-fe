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

const AdminDashboard: React.FC = () => {
  const { isDarkMode } = useTheme();
  const { namadaNotAvailable } = useWallet();
  const navigate = useNavigate();
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [showNamadaNotification, setShowNamadaNotification] = useState(false);

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
  }, []);

  // Show Namada notification if wallet is not available
  useEffect(() => {
    if (namadaNotAvailable) {
      setShowNamadaNotification(true);
    }
  }, [namadaNotAvailable]);

  const stats = [
    { title: 'Total Users', value: '2,834', change: '+12%', icon: '👥' },
    { title: 'Active Projects', value: '45', change: '+5%', icon: '📊' },
    { title: 'Revenue', value: '$125,430', change: '+18%', icon: '💰' },
    { title: 'Success Rate', value: '94.2%', change: '+2.1%', icon: '✅' }
  ];

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
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
                <p className="text-sm text-green-600 font-medium">
                  {stat.change}
                </p>
              </div>
              <div className="text-3xl">{stat.icon}</div>
            </div>
          </motion.div>
        ))}
      </div>

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
            <h3 className={`text-lg font-semibold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Recent Activities
            </h3>
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
            <button className="w-full flex items-center space-x-3 p-3 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Add New User</span>
            </button>
            <button className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
              isDarkMode
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Generate Report</span>
            </button>
            <button className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
              isDarkMode
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>System Settings</span>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminDashboard;
