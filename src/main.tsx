import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/common/ErrorBoundary'

// Global safeguard: Catch unhandled promise rejections and script errors in Android WebView
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled Promise Rejection caught globally:', event.reason)
  })

  window.addEventListener('error', (event) => {
    console.error('Global window error caught:', event.message, event.filename, event.lineno)
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
