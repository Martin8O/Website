import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './fonts' // self-hosted brand fonts — before index.css so faces are registered first
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
