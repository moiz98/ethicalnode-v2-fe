import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useWallet } from '../../contexts/WalletContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isConnected } = useWallet();
  const location = useLocation();

  // If wallet is not connected, redirect to landing page
  if (!isConnected) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
