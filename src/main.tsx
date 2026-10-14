import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import { logCrash } from './services/firebase.ts'
import './index.css'

// Global Unhandled Errors
window.addEventListener('error', (event) => {
  logCrash(event.error || event.message, true, { source: 'window.onerror' });
});

// Global Unhandled Promise Rejections (e.g. failed GitHub fetch or zip streams)
window.addEventListener('unhandledrejection', (event) => {
  logCrash(event.reason, true, { source: 'unhandledrejection' });
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
