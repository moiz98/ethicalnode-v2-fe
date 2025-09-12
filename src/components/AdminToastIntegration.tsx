import React, { useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';
import { setToastHandlers } from '../contexts/AdminAuthContext';

interface AdminToastIntegrationProps {
  children: React.ReactNode;
}

/**
 * Component to integrate Toast notifications with AdminAuthContext
 * This sets up the toast handlers for authentication events
 */
export const AdminToastIntegration: React.FC<AdminToastIntegrationProps> = ({ children }) => {
  const { showTokenExpiredToast, showReAuthSuccessToast, showReAuthFailedToast } = useToast();

  useEffect(() => {
    // Set up the toast handlers in AdminAuthContext
    setToastHandlers({
      showTokenExpiredToast,
      showReAuthSuccessToast,
      showReAuthFailedToast,
    });
  }, [showTokenExpiredToast, showReAuthSuccessToast, showReAuthFailedToast]);

  return <>{children}</>;
};

export default AdminToastIntegration;
