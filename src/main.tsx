import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BrowserRouter } from 'react-router'
import { ThemeProvider } from './contexts/ThemeContext'
import { WalletProvider } from './contexts/WalletContext'

// Polyfill Buffer and process for browser compatibility with Namada SDK
import { Buffer } from 'buffer'

// Set up global polyfills
;(globalThis as any).Buffer = Buffer
;(globalThis as any).global = globalThis
;(globalThis as any).process = {
  env: {},
  version: '',
  platform: 'browser',
  nextTick: (fn: Function) => setTimeout(fn, 0)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <WalletProvider>
          <App />
        </WalletProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
