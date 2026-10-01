import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

// Mesma regra de public/theme.js, que já aplicou o tema antes da primeira
// pintura: o escolhido vale; sem escolha, segue o sistema. Sem `window` (SSR,
// pré-renderização) o padrão é claro.
function getInitialTheme(): Theme {
  let salvo: string | null = null
  try { salvo = localStorage.getItem('doclimpo-theme') } catch { /* Sem storage, o tema segue o sistema. */ }
  if (salvo === 'light' || salvo === 'dark') return salvo
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.style.colorScheme = theme
  }, [theme])

  // Só a escolha explícita é guardada; quem nunca alternou continua seguindo o sistema.
  const toggleTheme = () => {
    const proximo: Theme = theme === 'light' ? 'dark' : 'light'
    try { localStorage.setItem('doclimpo-theme', proximo) } catch { /* Theme still works when browser storage is blocked. */ }
    setTheme(proximo)
  }

  return { theme, dark: theme === 'dark', toggleTheme }
}
