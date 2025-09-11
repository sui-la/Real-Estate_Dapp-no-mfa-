import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Suppress annoying MetaMask RPC errors in console
const originalConsoleError = console.error
console.error = (...args) => {
  const message = args.join(' ')
  
  // Suppress common MetaMask RPC errors that are just noise
  if (
    message.includes('MetaMask - RPC Error: Internal JSON-RPC error') ||
    message.includes('missing revert data') ||
    message.includes('CALL_EXCEPTION') ||
    message.includes('could not decode result data')
  ) {
    // Only log to console in development, don't show to user
    if (import.meta.env.DEV) {
      console.log('🔇 Suppressed MetaMask RPC error:', message)
    }
    return
  }
  
  // Log all other errors normally
  originalConsoleError.apply(console, args)
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
