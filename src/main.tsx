import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import './fonts' // self-hosted brand fonts — before index.css so faces are registered first
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    {/* Vercel Web Analytics — cookieless, same-origin (/_vercel/insights/*), passes the strict CSP. */}
    <Analytics />
  </StrictMode>,
)
