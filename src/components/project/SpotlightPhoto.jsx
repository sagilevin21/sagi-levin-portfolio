import { useEffect, useRef } from 'react'

// A photo seen in the dark, lit by a spotlight you hold: the light follows
// the cursor with a gentle lag, like a lamp being moved, revealing the
// pieces and the shadows they throw. On touch screens it drifts across the
// scene as you scroll, and jumps to wherever you tap. When the pointer
// leaves, the light settles back on `rest`.
//
// The photo sits in a frame that CSS sizes and places (filling the area,
// or larger than a phone screen); the light is measured on that frame.
// rest: where the light waits, as shares of the photo's width and height.
const RADIUS = 0.2 // size of the pool of light, as a share of the photo's width
const FOLLOW = 0.09 // how quickly the light catches up (0–1 per frame)

export default function SpotlightPhoto({ src, alt, rest = { x: 0.5, y: 0.5 }, eager = false, className = '' }) {
  const ref = useRef(null)
  const frameRef = useRef(null)

  useEffect(() => {
    const el = ref.current
    const frame = frameRef.current
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const touch = window.matchMedia('(hover: none)').matches
    const pos = { ...rest } // where the light is
    const target = { ...rest } // where it is heading
    let size = 0.75 // grows from a small glow to the full pool when held
    let sizeTarget = 0.75
    let raf = 0
    let visible = false

    const apply = () => {
      frame.style.setProperty('--x', `${(pos.x * 100).toFixed(2)}%`)
      frame.style.setProperty('--y', `${(pos.y * 100).toFixed(2)}%`)
      frame.style.setProperty('--r', `${(RADIUS * size * frame.clientWidth).toFixed(1)}px`)
    }
    const step = () => {
      raf = 0
      const k = reduce ? 1 : FOLLOW
      pos.x += (target.x - pos.x) * k
      pos.y += (target.y - pos.y) * k
      size += (sizeTarget - size) * k
      apply()
      const still = Math.abs(target.x - pos.x) + Math.abs(target.y - pos.y) + Math.abs(sizeTarget - size) < 0.0005
      if (!still && visible) raf = requestAnimationFrame(step)
    }
    const wake = () => {
      if (!raf && visible) raf = requestAnimationFrame(step)
    }
    const aim = (e) => {
      const r = frame.getBoundingClientRect()
      target.x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
      target.y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
      sizeTarget = 1
      wake()
    }
    const settle = () => {
      target.x = rest.x
      target.y = rest.y
      sizeTarget = 0.75
      wake()
    }

    // Touch: the light sweeps across the scene as it scrolls past, left to
    // right, reaching the middle when the photo fills the screen
    const onScroll = () => {
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight
      const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)))
      target.x = rest.x + (p - 0.5) * 0.5
      target.y = rest.y - Math.sin(p * Math.PI) * 0.12
      sizeTarget = 1
      wake()
    }

    if (touch) {
      el.addEventListener('pointerdown', aim)
      window.addEventListener('scroll', onScroll, { passive: true })
    } else {
      el.addEventListener('pointermove', aim)
      el.addEventListener('pointerleave', settle)
    }
    window.addEventListener('resize', apply)

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible) {
        if (touch) onScroll()
        wake()
      }
    })
    io.observe(el)
    apply()

    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      el.removeEventListener('pointerdown', aim)
      el.removeEventListener('pointermove', aim)
      el.removeEventListener('pointerleave', settle)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', apply)
    }
  }, [rest.x, rest.y]) // eslint-disable-line react-hooks/exhaustive-deps

  const loading = eager ? 'eager' : 'lazy'
  return (
    <div className={`spotlight ${className}`} ref={ref}>
      <div className="spotlight-frame" ref={frameRef}>
        {/* The scene in the dark, and the same scene lit, seen only inside the light */}
        <img className="spotlight-dark" src={src} alt="" aria-hidden="true" loading={loading} decoding="async" />
        <img
          className="spotlight-lit"
          src={src}
          alt={alt}
          loading={loading}
          decoding="async"
          fetchPriority={eager ? 'high' : undefined}
        />
      </div>
    </div>
  )
}
