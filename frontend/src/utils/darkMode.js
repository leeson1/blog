import { useState, useCallback } from 'react'

export function useDarkMode() {
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains('dark')
  )
  const toggle = useCallback(() => {
    const next = !document.documentElement.classList.contains('dark')
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('darkMode', next)
    setDark(next)
  }, [])
  return [dark, toggle]
}
