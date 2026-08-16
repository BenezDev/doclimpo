import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Landing from './pages/Landing_1'
import Onboarding from './pages/Onboarding'
import DocumentoDetalhe from './pages/DocumentoDetalhe'

function App() {
  const { user, loading } = useAuth()

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Inter, system-ui, sans-serif', color: '#64748b' }}>Carregando...</div>

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
        <Route path="/onboarding" element={user ? <Onboarding /> : <Navigate to="/login" />} />
        <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" />} />
        <Route path="/documento/:id" element={user ? <DocumentoDetalhe /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App