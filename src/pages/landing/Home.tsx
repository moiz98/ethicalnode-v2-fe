import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useReferral } from '../../contexts/ReferralContext';
import Hero from '../../components/Hero'
import HalalScreener from '../../components/HalalScreener'
import Networks from '../../components/Networks'
import HowItWorks from '../../components/HowItWorks'
import LatestInsights from '../../components/LatestInsights'
import Newsletter from '../../components/Newsletter'


const Home = () => {
  const { referrer: urlReferrer } = useParams<{ referrer?: string }>();
  const { setReferrer } = useReferral();

  // Handle referrer from URL params
  useEffect(() => {
    if (urlReferrer) {
        console.log('📋 Valid referrer detected in URL:', urlReferrer);
        setReferrer(urlReferrer);
    }
  }, [urlReferrer, setReferrer]);

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