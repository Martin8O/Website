import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './fonts' // self-hosted brand fonts — before index.css so faces are registered first
import App from './App.tsx'
import { DeferredInsights } from './DeferredInsights.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    {/* Vercel Web Analytics + Speed Insights — cookieless, same-origin
        (/_vercel/*), strict-CSP-safe. Held until after `window.load` so their
        two script fetches never compete during boot (DeferredInsights). */}
    <DeferredInsights />
  </StrictMode>,
)
