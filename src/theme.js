import { useEffect } from 'react'

// Sets the page colors (used by the header, background, text, ripple…).
// --field is the highlight for the project's field: shared by the index list
// and the summary label, so they always match. It falls back to the accent.
// --num is the color of the index number (falls back to the text color).
export function useTheme({ bg, ink, accent, field, num }) {
  useEffect(() => {
    const root = document.documentElement.style
    root.setProperty('--bg', bg)
    root.setProperty('--ink', ink)
    root.setProperty('--accent', accent)
    root.setProperty('--field', field ?? accent)
    if (num) {
      root.setProperty('--num', num)
      root.setProperty('--num-opacity', '1')
    } else {
      root.removeProperty('--num')
      root.removeProperty('--num-opacity')
    }
  }, [bg, ink, accent, field, num])
}
