import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
}

interface SidebarProps {
  items: SidebarItem[];
  onCollapseChange?: (isCollapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ items, onCollapseChange }) => {
  const { isDarkMode } = useTheme();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleToggleCollapse = () => {
    const newCollapsedState = !isCollapsed;
    setIsCollapsed(newCollapsedState);
    onCollapseChange?.(newCollapsedState);
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <aside className={`fixed left-0 top-0 h-full z-40 transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    } ${
      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    } border-r shadow-lg flex flex-col`}>
      {/* Logo */}
      <div className={`relative h-16 flex items-center justify-center border-b ${
        isDarkMode ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <Link to="/" className="flex items-center justify-center">
          {isCollapsed ? (
            <img 
              src="/favicon.ico" 
              alt="EthicalNode" 
              className="w-8 h-8"
            />
          ) : (
            <img 
              src="/logo.svg" 
              alt="EthicalNode" 
              className="h-10 w-auto object-contain"
              style={{
                filter: isDarkMode 
                  ? 'none' 
                  : 'brightness(0) saturate(100%) invert(23%) sepia(94%) saturate(1352%) hue-rotate(88deg) brightness(97%) contrast(101%)'
              }}
            />
          )}
        </Link>
        
        {/* Collapse Toggle - Positioned beside logo */}
        <button
          onClick={handleToggleCollapse}
          className={`absolute -right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 rounded-full border-2 z-50 flex items-center justify-center transition-all duration-200 ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white hover:border-gray-500' 
              : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:border-gray-400'
          } shadow-md hover:shadow-lg`}
        >
          {isCollapsed ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <ChevronLeft className="w-3 h-3" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {items.map((item) => (
          <Link
            key={item.id}
            to={item.path}
            className={`flex items-center rounded-lg transition-all duration-200 ${
              isCollapsed ? 'justify-center p-3' : 'space-x-3 px-3 py-2'
            } ${
              isActive(item.path)
                ? isDarkMode
                  ? 'bg-green-900 text-green-300'
                  : 'bg-green-100 text-green-700'
                : isDarkMode
                  ? 'text-gray-300 hover:bg-gray-700'
                  : 'text-gray-700 hover:bg-gray-100'
            }`}
            title={isCollapsed ? item.label : undefined}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {!isCollapsed && <span className="font-medium">{item.label}</span>}
          </Link>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
