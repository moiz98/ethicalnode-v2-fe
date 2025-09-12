import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void;
  showTokenExpiredToast: () => void;
  showReAuthSuccessToast: () => void;
  showReAuthFailedToast: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = {
      id,
      duration: 5000,
      ...toast,
    };

    setToasts(prev => [...prev, newToast]);

    // Auto remove after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }
  }, [removeToast]);

  const showTokenExpiredToast = useCallback(() => {
    showToast({
      type: 'warning',
      title: 'Session Expired',
      message: 'Your session has expired. Please sign the message to continue.',
      duration: 8000,
    });
  }, [showToast]);

  const showReAuthSuccessToast = useCallback(() => {
    showToast({
      type: 'success',
      title: 'Session Renewed',
      message: 'Your session has been successfully renewed.',
      duration: 3000,
    });
  }, [showToast]);

  const showReAuthFailedToast = useCallback(() => {
    showToast({
      type: 'error',
      title: 'Re-authentication Failed',
      message: 'Unable to renew your session. Please log in again.',
      duration: 8000,
    });
  }, [showToast]);

  const getToastIcon = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return 'ℹ️';
    }
  };

  const getToastColors = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-400';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800 dark:bg-gray-900/20 dark:border-gray-800 dark:text-gray-400';
    }
  };

  const value: ToastContextType = {
    showToast,
    showTokenExpiredToast,
    showReAuthSuccessToast,
    showReAuthFailedToast,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 300, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 300, scale: 0.8 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className={`
                max-w-sm w-full border rounded-lg p-4 shadow-lg backdrop-blur-sm
                ${getToastColors(toast.type)}
              `}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0 text-lg mr-3">
                  {getToastIcon(toast.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">
                    {toast.title}
                  </div>
                  {toast.message && (
                    <div className="text-sm mt-1 opacity-90">
                      {toast.message}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="flex-shrink-0 ml-3 text-sm opacity-60 hover:opacity-100 transition-opacity"
                >
                  ✕
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
