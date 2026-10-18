import { useEffect } from 'react'

// No orphan words, site-wide: the last two words of every paragraph, heading,
// caption and list item are joined with a non-breaking space, so a line never
// ends with a single word on its own. (CSS text-wrap: pretty does this too,
// but browsers only treat it as a hint.) Runs again whenever content changes.
const SELECTOR = 'p, li, dd, figcaption, h1, h2, h3, .label-text'
const NBSP = ' '

function fix(el) {
  // The last text node that has visible text
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  let last = null
  for (let n = walker.nextNode(); n; n = walker.nextNode()) if (n.data.trim()) last = n
  if (!last) return
  const text = last.data
  const m = text.match(/(\S+)\s*$/)
  if (!m) return
  const i = m.index - 1 // the character before the final word
  if (i > 0 && text[i] === ' ' && /\S/.test(text[i - 1])) {
    last.data = text.slice(0, i) + NBSP + text.slice(i + 1)
  }
}

export function useNoOrphans() {
  useEffect(() => {
    const root = document.getElementById('root')
    let raf = 0
    const run = () => {
      raf = 0
      root.querySelectorAll(SELECTOR).forEach(fix)
    }
    run()
    const mo = new MutationObserver(() => {
      if (!raf) raf = requestAnimationFrame(run)
    })
    mo.observe(root, { childList: true, subtree: true, characterData: true })
    return () => {
      mo.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [])
}
