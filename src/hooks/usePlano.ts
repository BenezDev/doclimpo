import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../integrations/supabase/client'
import { normalizarPlano, type PlanType } from '../lib/planos'
import { useAuth } from './useAuth'

// Plano efetivo: a mesma função SQL que a trigger de limite usa (inclui o
// plano herdado da família). Se o banco ainda não tiver a função, cai no
// plan_type do perfil — nunca em "pago".
export function usePlano() {
  const { user } = useAuth()
  const [plano, setPlano] = useState<PlanType>('FREE')
  const [versao, setVersao] = useState(0)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    const carregar = async () => {
      const { data, error } = await supabase.rpc('meu_plano')
      if (cancelled) return
      if (!error && typeof data === 'string') { setPlano(normalizarPlano(data)); return }
      const { data: perfil } = await supabase.from('profiles').select('plan_type').eq('user_id', user.id).maybeSingle()
      if (!cancelled) setPlano(normalizarPlano(perfil?.plan_type))
    }
    carregar()
    return () => { cancelled = true }
  }, [user, versao])

  const recarregar = useCallback(() => setVersao(value => value + 1), [])

  return { plano, recarregar }
}
