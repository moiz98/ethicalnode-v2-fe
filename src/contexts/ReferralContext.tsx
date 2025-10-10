import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

interface ReferralContextType {
  referrer: string | null;
  setReferrer: (referrer: string | null) => void;
  clearReferrer: () => void;
}

const ReferralContext = createContext<ReferralContextType | undefined>(undefined);

export const useReferral = (): ReferralContextType => {
  const context = useContext(ReferralContext);
  if (!context) {
    throw new Error('useReferral must be used within a ReferralProvider');
  }
  return context;
};

interface ReferralProviderProps {
  children: ReactNode;
}

export const ReferralProvider: React.FC<ReferralProviderProps> = ({ children }) => {
  const [referrer, setReferrerState] = useState<string | null>(null);
  const location = useLocation();

  // Check for referrer in URL params and localStorage on mount
  useEffect(() => {
    // Check if there's a stored referrer
    const storedReferrer = localStorage.getItem('referrer');
    
    // Extract referrer from URL path (e.g., /:referrer format)
    const pathSegments = location.pathname.split('/').filter(Boolean);
    let urlReferrer: string | null = null;
    
    // Check if the path has a potential referrer (single path segment that looks like a public key)
    if (pathSegments.length === 1) {
      const potentialReferrer = pathSegments[0];
      // Basic validation: check if it looks like a cosmos public key (starts with cosmos and has reasonable length)
      // or other blockchain addresses that might be used as referrers
      if ((potentialReferrer.startsWith('cosmos') || 
           potentialReferrer.startsWith('akash') || 
           potentialReferrer.startsWith('osmo') ||
           potentialReferrer.startsWith('juno') ||
           potentialReferrer.startsWith('stars')) && 
          potentialReferrer.length > 20) {
        urlReferrer = potentialReferrer;
      }
    }
    
    // Priority: URL referrer > stored referrer
    if (urlReferrer) {
      console.log('📋 Referrer found in URL:', urlReferrer);
      console.log('📋 Setting referrer state and localStorage');
      setReferrerState(urlReferrer);
      localStorage.setItem('referrer', urlReferrer);
    } else if (storedReferrer) {
      console.log('📋 Referrer found in localStorage:', storedReferrer);
      console.log('📋 Setting referrer state from storage');
      setReferrerState(storedReferrer);
    } else {
      console.log('📋 No referrer found in URL or localStorage');
    }
  }, [location.pathname]);

  const setReferrer = (newReferrer: string | null) => {
    console.log('📋 setReferrer called with:', newReferrer);
    setReferrerState(newReferrer);
    if (newReferrer) {
      localStorage.setItem('referrer', newReferrer);
      console.log('📋 Referrer stored in localStorage');
    } else {
      localStorage.removeItem('referrer');
      console.log('📋 Referrer removed from localStorage');
    }
  };

  const clearReferrer = () => {
    setReferrerState(null);
    localStorage.removeItem('referrer');
  };

  const value: ReferralContextType = {
    referrer,
    setReferrer,
    clearReferrer,
  };

  return (
    <ReferralContext.Provider value={value}>
      {children}
    </ReferralContext.Provider>
  );
};