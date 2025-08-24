import { Suspense } from 'react';
import { Route, Routes } from 'react-router';
import './App.css';

// Landing Pages
import PublicLayout from './layouts/PublicLayout';
import Home from './pages/landing/Home';
import Blogs from './pages/landing/Blogs';
import BlogDetail from './pages/landing/BlogDetail';

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
      <Routes>
        {/* Landing Pages */}
        <Route element={<PublicLayout />} >
          <Route index element={<Home />} />
          <Route path="/blogs" element={<Blogs />} />
          <Route path="/blog/:slug" element={<BlogDetail />} />
          <Route path='*' element={<Home />} />
        </Route>

        {/* Admin Dashboard */}
        {/* <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
        </Route> */}

        {/* Investor Dashboard */}
        {/* <Route path="/investor" element={<InvestorLayout />}>
          <Route index element={<InvestorDashboard />} />
          <Route path="/investor/portfolio" element={<InvestorPortfolio />} />
          <Route path="/investor/reports" element={<InvestorReports />} />
        </Route> */}

      </Routes>
    </Suspense>
  );
}

export default App;
