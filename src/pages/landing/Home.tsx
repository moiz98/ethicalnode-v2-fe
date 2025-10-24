import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useReferral } from '../../contexts/ReferralContext';
import Hero from '../../components/Hero'
import HalalScreener from '../../components/HalalScreener'
import Networks from '../../components/Networks'
import HowItWorks from '../../components/HowItWorks'
import LatestInsights from '../../components/LatestInsights'
import Newsletter from '../../components/Newsletter'
import WelcomeModal from '../../components/common/WelcomeModal'


const Home = () => {
  const { referrer: urlReferrer } = useParams<{ referrer?: string }>();
  const { setReferrer } = useReferral();
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  // Handle referrer from URL params
  useEffect(() => {
    if (urlReferrer) {
        console.log('📋 Valid referrer detected in URL:', urlReferrer);
        setReferrer(urlReferrer);
    }
  }, [urlReferrer, setReferrer]);

  // Show welcome modal on first visit (only if old version URL is configured)
  useEffect(() => {
    const oldVersionUrl = import.meta.env.VITE_OLD_VERSION_URL;
    const hasVisited = localStorage.getItem('ethicalnode-v2-welcomed');
    
    if (oldVersionUrl && !hasVisited) {
      // Show modal after a short delay for better UX
      const timer = setTimeout(() => {
        setShowWelcomeModal(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleCloseWelcomeModal = () => {
    setShowWelcomeModal(false);
    localStorage.setItem('ethicalnode-v2-welcomed', 'true');
  };

  return (<>
    {/* Debug info for development */}
    {/* {import.meta.env.DEV && referrer && (
      <div style={{
        position: 'fixed',
        top: 10,
        right: 10,
        background: 'rgba(0, 255, 0, 0.8)',
        color: 'black',
        padding: '8px',
        borderRadius: '4px',
        fontSize: '12px',
        zIndex: 9999
      }}>
        Referrer: {referrer.slice(0, 10)}...{referrer.slice(-6)}
      </div>
    )} */}
    
    {/* Welcome Modal - only show if old version URL is configured */}
    {import.meta.env.VITE_OLD_VERSION_URL && (
      <>
        <WelcomeModal 
          isOpen={showWelcomeModal} 
          onClose={handleCloseWelcomeModal} 
        />
        
        {/* Info button to reopen modal */}
        {!showWelcomeModal && (
          <button
            onClick={() => setShowWelcomeModal(true)}
            className="fixed bottom-6 right-6 z-40 w-12 h-12 bg-gradient-to-r from-teal-500 to-green-500 hover:from-teal-600 hover:to-green-600 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group"
            title="V2 Migration Info"
          >
            <span className="text-white text-xl group-hover:scale-110 transition-transform">ℹ️</span>
            <div className="absolute -top-12 right-0 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              V2 Migration Info
            </div>
          </button>
        )}
      </>
    )}
    
    <Hero />
    <HalalScreener />
    <Networks />
    <HowItWorks />
    <LatestInsights />
    <Newsletter />
    </>
  )
}

export default Home