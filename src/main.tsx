// Import polyfills FIRST before any other imports
import './polyfills'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { WalletProvider } from './contexts/WalletContext'
import { ReferralProvider } from './contexts/ReferralContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <ReferralProvider>
          <WalletProvider>
            <App />
          </WalletProvider>
        </ReferralProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
