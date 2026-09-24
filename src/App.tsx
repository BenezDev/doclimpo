import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { PageMetadata } from './components/PageMetadata'
import { Analytics } from '@vercel/analytics/react'
import { CookieConsent } from './components/ui/CookieConsent'
import { withIntent } from './lib/public-content'
import './styles/public-pages.css'
import './styles/landing.css'
// Páginas públicas pré-renderizadas no build (scripts/prerender.mjs) entram no
// pacote principal: carregadas sob demanda, o React trocaria o HTML pronto pela
// tela de carregamento antes de mostrar a página de novo.
import Landing from './pages/Landing_1'
import DocumentosHub from './pages/DocumentosHub'
import DocumentoPublico from './pages/DocumentoPublico'
import Sobre from './pages/Sobre'
import Seguranca from './pages/Seguranca'
import NotFound from './pages/NotFound'

const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const DocumentoDetalhe = lazy(() => import('./pages/DocumentoDetalhe'))
const ThankYou = lazy(() => import('./pages/ThankYou'))
const Privacy = lazy(() => import('./pages/Privacy'))
const Termos = lazy(() => import('./pages/Termos'))
const RedefinirSenha = lazy(() => import('./pages/RedefinirSenha'))
const Conta = lazy(() => import('./pages/Conta'))

function AppLoading() {
  return (
    <div className="bz-page page-state">
      <span className="page-state__loader" />
      <p>Preparando seu painel…</p>
    </div>
  )
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const { search } = useLocation()
  if (loading) return <AppLoading />
  return user ? children : <Navigate to={withIntent('/login', search)} replace />
}

function App() {
  return (
    <BrowserRouter>
      <PageMetadata />
      <CookieConsent />
      {/* Vercel Web Analytics: métricas agregadas de página, sem cookie nem identificador persistente (same-origin /_vercel/insights). */}
      <Analytics />
      <Suspense fallback={<AppLoading />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Login isCadastro />} />
          <Route path="/obrigado" element={<ThankYou />} />
          <Route path="/privacidade" element={<Privacy />} />
          <Route path="/termos" element={<Termos />} />
          <Route path="/documentos" element={<DocumentosHub />} />
          <Route path="/documentos/:tipo" element={<DocumentoPublico />} />
          <Route path="/sobre" element={<Sobre />} />
          <Route path="/seguranca" element={<Seguranca />} />
          <Route path="/redefinir-senha" element={<RedefinirSenha />} />
          <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/conta" element={<ProtectedRoute><Conta /></ProtectedRoute>} />
          <Route path="/documento/:id" element={<ProtectedRoute><DocumentoDetalhe /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
