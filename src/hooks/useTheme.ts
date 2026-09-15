import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

function getInitialTheme(): Theme {
  try {
    return localStorage.getItem('doclimpo-theme') === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.style.colorScheme = theme
    try { localStorage.setItem('doclimpo-theme', theme) } catch { /* Theme still works when browser storage is blocked. */ }
  }, [theme])

  return {
    theme,
    dark: theme === 'dark',
    toggleTheme: () => setTheme(current => current === 'light' ? 'dark' : 'light'),
  }
}
