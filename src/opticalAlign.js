import { useLayoutEffect } from 'react'

// Large type has a little built-in space before its first letter (the glyph's
// "side bearing"), so a big title looks slightly indented next to small text
// that starts at the same edge. This measures the real first letter in the
// element's own font and pulls the text left by exactly that amount (in em,
// so it stays right at every screen size).
const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null

function bearing(el) {
  const s = getComputedStyle(el)
  const ctx = canvas.getContext('2d')
  ctx.font = `${s.fontStyle} ${s.fontWeight} 1000px ${s.fontFamily}`
  const text = el.textContent.trim()
  if (!text) return 0
  return -ctx.measureText(text).actualBoundingBoxLeft / 1000
}

export function useOpticalAlign(ref, deps = []) {
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    let cancelled = false
    const apply = () => {
      if (!cancelled) el.style.marginLeft = `${-bearing(el).toFixed(3)}em`
    }
    apply()
    // Measure again once the web font has loaded
    document.fonts?.ready.then(apply)
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
