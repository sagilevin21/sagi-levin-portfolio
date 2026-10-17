import { useEffect, useRef } from 'react'

// Shared scroll effects for project pages, all inside `ref`:
//  - [data-reveal] elements fade and rise in the first time they come into view
//  - [data-speed] elements drift slightly slower/faster than the page (light
//    parallax); e.g. data-speed="0.08"
//  - onProgress(p) is called with how far down the page you are (0 at the top,
//    1 at the bottom)
export function useProjectScroll(ref, onProgress) {
  const progressRef = useRef(onProgress)
  useEffect(() => {
    progressRef.current = onProgress
  })

  useEffect(() => {
    const root = ref.current
    if (!root) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          e.target.classList.add('is-in')
          io.unobserve(e.target)
        }
      },
      { rootMargin: '0px 0px -12% 0px' },
    )
    root.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el))

    const drifting = reduce ? [] : [...root.querySelectorAll('[data-speed]')]
    let raf = 0
    const update = () => {
      raf = 0
      const vh = window.innerHeight
      const max = document.documentElement.scrollHeight - vh
      progressRef.current?.(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0)
      for (const el of drifting) {
        const box = el.parentElement.getBoundingClientRect()
        if (box.bottom < -200 || box.top > vh + 200) continue
        const offset = box.top + box.height / 2 - vh / 2
        el.style.transform = `translate3d(0, ${(-offset * +el.dataset.speed).toFixed(1)}px, 0)`
      }
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [ref])
}

// Blends between a list of hex colors; t from 0 to 1
export function mixColors(stops, t) {
  const n = stops.length - 1
  const x = Math.min(n, Math.max(0, t * n))
  const i = Math.min(n - 1, Math.floor(x))
  const f = x - i
  const a = parseInt(stops[i].slice(1), 16)
  const b = parseInt(stops[i + 1].slice(1), 16)
  const ch = (v, s) => (v >> s) & 255
  const mix = (s) => Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * f)
  return `rgb(${mix(16)}, ${mix(8)}, ${mix(0)})`
}
