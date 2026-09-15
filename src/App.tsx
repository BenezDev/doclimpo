import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { PageMetadata } from './components/PageMetadata'
import { CookieConsent } from './components/ui/CookieConsent'
import { withDocumentIntent } from './lib/public-content'
import './styles/public-pages.css'

const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Landing = lazy(() => import('./pages/Landing_1'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const DocumentoDetalhe = lazy(() => import('./pages/DocumentoDetalhe'))
const NotFound = lazy(() => import('./pages/NotFound'))
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
  return user ? children : <Navigate to={withDocumentIntent('/login', search)} replace />
}

function App() {
  return (
    <BrowserRouter>
      <PageMetadata />
      <CookieConsent />
      <Suspense fallback={<AppLoading />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Login isCadastro />} />
          <Route path="/obrigado" element={<ThankYou />} />
          <Route path="/privacidade" element={<Privacy />} />
          <Route path="/termos" element={<Termos />} />
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
