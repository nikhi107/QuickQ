import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { DisplayBoard } from './DisplayBoard.tsx'

if (window.location.pathname.startsWith('/display')) {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <DisplayBoard />
    </StrictMode>,
  )
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
