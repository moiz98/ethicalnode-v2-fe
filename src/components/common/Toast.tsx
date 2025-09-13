import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, CheckCircle2, XCircle, AlertTriangle, InfoIcon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  onRemove: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({
  id,
  type,
  title,
  message,
  duration = 5000,
  onRemove
}) => {
  const { isDarkMode } = useTheme();

  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onRemove]);

  const getIcon = () => {
    const iconClasses = "w-6 h-6";
    switch (type) {
      case 'success':
        return <CheckCircle2 className={`${iconClasses} text-green-500`} />;
      case 'error':
        return <XCircle className={`${iconClasses} text-red-500`} />;
      case 'warning':
        return <AlertTriangle className={`${iconClasses} text-amber-500`} />;
      case 'info':
        return <InfoIcon className={`${iconClasses} text-blue-500`} />;
    }
  };

  const getColors = () => {
    const baseClasses = isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
    
    switch (type) {
      case 'success':
        return `${baseClasses} border-l-4 border-l-green-500 shadow-lg`;
      case 'error':
        return `${baseClasses} border-l-4 border-l-red-500 shadow-lg`;
      case 'warning':
        return `${baseClasses} border-l-4 border-l-amber-500 shadow-lg`;
      case 'info':
        return `${baseClasses} border-l-4 border-l-blue-500 shadow-lg`;
    }
  };

  const getProgressBarColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'warning':
        return 'bg-amber-500';
      case 'info':
        return 'bg-blue-500';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 300, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`max-w-sm w-full ${getColors()} rounded-lg overflow-hidden backdrop-blur-sm`}
      style={{ minWidth: '320px' }}
    >
      {/* Progress bar */}
      <motion.div
        className={`h-1 ${getProgressBarColor()}`}
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: duration / 1000, ease: "linear" }}
      />
      
      <div className="p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-0.5">
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`text-sm font-semibold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {title}
            </h3>
            {message && (
              <p className={`mt-1 text-sm ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                {message}
              </p>
            )}
          </div>
          <div className="flex-shrink-0">
            <button
              className={`rounded-md p-1.5 inline-flex transition-colors ${
                isDarkMode 
                  ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' 
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500`}
              onClick={() => onRemove(id)}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Toast;
