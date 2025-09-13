import { Suspense } from 'react';
import { Route, Routes } from 'react-router';
import './App.css';

// Landing Pages
import PublicLayout from './layouts/PublicLayout';
import Home from './pages/landing/Home';
import Blogs from './pages/landing/Blogs';
import BlogDetail from './pages/landing/BlogDetail';

// Admin Dashboard Pages
import AdminDashboardLayout from './layouts/AdminDashboardLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminLogin from './pages/admin/Login';
import AdminManagement from './pages/admin/AdminManagement';
import Activities from './pages/admin/Activities';
import HalalScreenerManagement from './pages/admin/HalalScreenerManagement';
import ValidatorManagement from './pages/admin/ValidatorManagement';
import InvestorManagement from './pages/admin/InvestorManagement';
import OrgReferralCodeManagement from './pages/admin/OrgReferralCodeManagement';
import { AdminAuthProvider } from './contexts/AdminAuthContext';
import { ToastProvider } from './contexts/ToastContext';
import AdminToastIntegration from './components/AdminToastIntegration';

// Investor Dashboard Pages
import InvestorDashboardLayout from './layouts/InvestorDashboardLayout';
import InvestorPortfolio from './pages/investor/Portfolio';
import HalalScreener from './pages/investor/HalalScreener';
import Validators from './pages/investor/Validators';
import Transactions from './pages/investor/Transactions';
import ReferralBonus from './pages/investor/ReferralBonus';
import Settings from './pages/investor/Settings';
import { ToastProvider as InvestorToastProvider } from './components/common/ToastProvider';
import ProtectedRoute from './components/common/ProtectedRoute';

function Loader() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '60vh',
      background: 'linear-gradient(135deg, #0f2027 0%, #2c5364 100%)',
      color: '#00fff7',
      fontFamily: 'Segoe UI, Roboto, Arial, sans-serif',
      letterSpacing: '2px'
    }}>
      <svg
        width="64"
        height="64"
        viewBox="0 0 50 50"
        style={{ marginBottom: 24, filter: 'drop-shadow(0 0 8px #00fff7)' }}
      >
        <circle
          cx="25"
          cy="25"
          r="20"
          stroke="#00fff7"
          strokeWidth="4"
          fill="none"
          strokeDasharray="31.4 31.4"
          strokeLinecap="round"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 25 25"
            to="360 25 25"
            dur="1s"
            repeatCount="indefinite"
          />
        </circle>
        <circle
          cx="25"
          cy="25"
          r="10"
          stroke="#fff"
          strokeWidth="2"
          fill="none"
          opacity="0.5"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="360 25 25"
            to="0 25 25"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </circle>
      </svg>
      <span style={{
        fontSize: 22,
        fontWeight: 600,
        textShadow: '0 0 8px #00fff7, 0 0 2px #fff'
      }}>
        Loading ...
      </span>
    </div>
  );
}

function App() {
  return (
    <Suspense fallback={<Loader />}>
      <ToastProvider>
        <Routes>
          {/* Landing Pages */}
          <Route element={<PublicLayout />} >
            <Route index element={<Home />} />
            <Route path="/blogs" element={<Blogs />} />
            <Route path="/blog/:slug" element={<BlogDetail />} />
            <Route path='*' element={<Home />} />
          </Route>

          {/* Admin Dashboard - Wrapped with AdminAuthProvider */}
          <Route path="/admin/*" element={
            <AdminAuthProvider>
              <AdminToastIntegration>
                <Routes>
                  <Route path="login" element={<AdminLogin />} />
                  <Route element={<AdminDashboardLayout />}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="management" element={<AdminManagement />} />
                    <Route path="investors" element={<InvestorManagement />} />
                    <Route path="activities" element={<Activities />} />
                    <Route path="halal-screener" element={<HalalScreenerManagement />} />
                    <Route path="validators" element={<ValidatorManagement />} />
                    <Route path="org-referral-codes" element={<OrgReferralCodeManagement />} />
                  </Route>
                </Routes>
              </AdminToastIntegration>
            </AdminAuthProvider>
          } />

          {/* Investor Dashboard */}
          <Route path="/investor/*" element={
            <ProtectedRoute>
              <InvestorToastProvider>
                <Routes>
                  <Route element={<InvestorDashboardLayout />}>
                    <Route path="portfolio" element={<InvestorPortfolio />} />
                    <Route path="halal-screener" element={<HalalScreener />} />
                    <Route path="validators" element={<Validators />} />
                    <Route path="transactions" element={<Transactions />} />
                    <Route path="referral-bonus" element={<ReferralBonus />} />
                    <Route path="settings" element={<Settings />} />
                    <Route index element={<InvestorPortfolio />} />
                  </Route>
                </Routes>
              </InvestorToastProvider>
            </ProtectedRoute>
          } />

        </Routes>
      </ToastProvider>
    </Suspense>
  );
}

export default App;
