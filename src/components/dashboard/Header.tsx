import React, { useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface UserInfo {
  name: string;
  email?: string;
  walletAddress?: string;
}

interface HeaderProps {
  userInfo: UserInfo;
  userType: 'admin' | 'investor';
  onLogout: () => void;
  isSidebarCollapsed?: boolean;
}

const Header: React.FC<HeaderProps> = ({ userInfo, userType, onLogout, isSidebarCollapsed = false }) => {
  const { isDarkMode, toggleTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className={`fixed top-0 right-0 h-16 z-30 transition-all duration-300 ${
      isSidebarCollapsed ? 'left-16' : 'left-64'
    } ${
      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    } border-b shadow-sm flex items-center justify-between px-6`}>
      <div className="flex items-center space-x-4">
        <h1 className={`text-xl font-semibold ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}>
          {userType.charAt(0).toUpperCase() + userType.slice(1)} Dashboard
        </h1>
      </div>

      <div className="flex items-center space-x-4">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={`p-2 rounded-lg transition-colors ${
            isDarkMode 
              ? 'text-gray-300 hover:text-white hover:bg-gray-700' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          {isDarkMode ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </button>

        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
              isDarkMode 
                ? 'hover:bg-gray-700 text-gray-300' 
                : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
              {userInfo.name.charAt(0).toUpperCase()}
            </div>
            <div className="text-left">
              <div className={`text-sm font-medium ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {userInfo.name}
              </div>
              <div className={`text-xs ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {userType === 'investor' 
                  ? userInfo.walletAddress?.slice(0, 10) + '...' 
                  : userInfo.email
                }
              </div>
            </div>
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div className={`absolute right-0 top-full mt-2 w-48 ${
              isDarkMode ? 'bg-gray-700' : 'bg-white'
            } rounded-lg shadow-lg border ${
              isDarkMode ? 'border-gray-600' : 'border-gray-200'
            } py-2`}>
              <button
                onClick={onLogout}
                className={`w-full text-left px-4 py-2 text-sm ${
                  isDarkMode 
                    ? 'text-red-400 hover:bg-gray-600' 
                    : 'text-red-600 hover:bg-gray-100'
                } transition-colors`}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
