import { useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { AuthContext } from './auth-context'

// O cliente do Supabase (~190 KB) fica fora do pacote inicial: as páginas
// públicas aparecem sem esperar por ele e a sessão é conferida logo depois.
// Enquanto isso, `loading` segue true e as rotas protegidas esperam.
const carregarSupabase = () => import('../integrations/supabase/client').then(modulo => modulo.supabase)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ativo = true
    let cancelarAssinatura: (() => void) | undefined

    carregarSupabase().then(supabase => {
      if (!ativo) return
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!ativo) return
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      })

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
      })
      cancelarAssinatura = () => subscription.unsubscribe()
    })

    return () => {
      ativo = false
      cancelarAssinatura?.()
    }
  }, [])

  const signOut = async () => {
    const supabase = await carregarSupabase()
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
