import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './context/AuthContext'
import App from './App.tsx'
// Fontes servidas pelo próprio site (sem pedido a servidores do Google).
import '@fontsource-variable/inter'
import '@fontsource-variable/onest'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)