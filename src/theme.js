import { useEffect } from 'react'

// Sets the page colors (used by the header, background, text, ripple…)
export function useTheme({ bg, ink, accent }) {
  useEffect(() => {
    const root = document.documentElement.style
    root.setProperty('--bg', bg)
    root.setProperty('--ink', ink)
    root.setProperty('--accent', accent)
  }, [bg, ink, accent])
}
