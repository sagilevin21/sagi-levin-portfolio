import { useEffect, useRef } from 'react'

// ---- The fish ----------------------------------------------------------------
// Blueprint-style drawings, heads facing left.
// size: length as a share of the tank width; depth: 0 = far back, 1 = front
const FISH = [
  { src: '/images/gillbot/bp-fish1.webp', size: 0.2, depth: 0.95, y: 0.4, speed: 0.55 },
  { src: '/images/gillbot/bp-fish2.webp', size: 0.15, depth: 0.8, y: 0.26, speed: 0.75 },
  { src: '/images/gillbot/bp-fish2.webp', size: 0.09, depth: 0.35, y: 0.55, speed: 0.6 },
  { src: '/images/gillbot/bp-fish1.webp', size: 0.08, depth: 0.25, y: 0.2, speed: 0.45 },
]
const FLEE_DISTANCE = 210 // px: how close the robot gets before a fish darts away
// ------------------------------------------------------------------------------

// Fish cruise across the tank, wrap around at the sides, turn when they change
// direction, and dart away from the robot (robotRef: its position in px).
export default function BlueprintFish({ robotRef }) {
  const layerRef = useRef(null)
  const refs = useRef([])

  useEffect(() => {
    const root = layerRef.current
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let w = root.clientWidth
    let h = root.clientHeight
    const fish = FISH.map((f, i) => ({
      ...f,
      x: ((i * 0.29 + 0.12) % 1) * w,
      y: f.y * h,
      dir: i % 2 ? 1 : -1,
      vx: 0,
      vy: 0,
      face: i % 2 ? -1 : 1, // 1 = facing left (as drawn), -1 = facing right
      phase: i * 1.7,
    }))
    const onResize = () => {
      w = root.clientWidth
      h = root.clientHeight
    }
    window.addEventListener('resize', onResize)

    let raf = 0
    let visible = false
    let last = performance.now()
    const frame = (now) => {
      raf = visible ? requestAnimationFrame(frame) : 0
      const dt = Math.min(48, now - last) / 16.67
      last = now
      const r = robotRef.current
      fish.forEach((f, i) => {
        const el = refs.current[i]
        if (!el) return
        // Sized by the tank's width, or its height on tall (phone) screens
        const len = f.size * Math.max(w, h * 1.1)
        const cruise = f.dir * f.speed * (0.6 + f.depth * 0.6)
        f.vx += (cruise - f.vx) * 0.02 * dt
        const homeY = f.y0 ?? (f.y0 = f.y)
        f.vy += ((homeY + Math.sin(now / 1500 + f.phase) * 22 - f.y) * 0.004 - f.vy * 0.06) * dt
        if (r) {
          const dx = f.x - r.x
          const dy = f.y - r.y
          const d = Math.hypot(dx, dy)
          const reach = FLEE_DISTANCE * (0.6 + f.depth * 0.5)
          if (d < reach && d > 0.1) {
            const push = (1 - d / reach) * 0.9 * dt
            f.vx += (dx / d) * push
            f.vy += (dy / d) * push
            f.dir = Math.sign(dx) || f.dir
          }
        }
        f.vx = Math.max(-6, Math.min(6, f.vx))
        f.vy = Math.max(-4, Math.min(4, f.vy))
        f.x += f.vx * dt
        f.y = Math.max(h * 0.1, Math.min(h * 0.72, f.y + f.vy * dt))
        if (f.x > w + len) f.x = -len
        if (f.x < -len) f.x = w + len
        // Turn: ease between facing left and right
        const want = f.vx <= 0 ? 1 : -1
        f.face += (want - f.face) * Math.min(1, 0.12 * dt)
        // Smoothed, so the tilt eases instead of twitching
        const wantTilt = Math.max(-8, Math.min(8, f.vy * 4)) * Math.sign(f.face || 1)
        f.tilt = (f.tilt ?? 0) + (wantTilt - (f.tilt ?? 0)) * Math.min(1, 0.08 * dt)
        const tilt = f.tilt
        el.style.width = `${len.toFixed(0)}px`
        el.style.transform = `translate3d(${f.x.toFixed(1)}px, ${f.y.toFixed(1)}px, 0) translate(-50%, -50%) rotate(${tilt.toFixed(1)}deg) scaleX(${f.face.toFixed(3)})`
      })
    }
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible && !raf && !reduce) {
        last = performance.now()
        raf = requestAnimationFrame(frame)
      }
    })
    io.observe(root)
    if (reduce) {
      fish.forEach((f, i) => {
        const el = refs.current[i]
        if (el) {
          el.style.width = `${f.size * w}px`
          el.style.transform = `translate3d(${f.x}px, ${f.y}px, 0) translate(-50%, -50%)`
        }
      })
    }
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [robotRef])

  return (
    <div className="bp-fish" ref={layerRef}>
      {FISH.map((f, i) => (
        <span
          key={i}
          ref={(el) => (refs.current[i] = el)}
          className="bp-fish-one"
          style={{ opacity: 0.45 + f.depth * 0.55, zIndex: Math.round(f.depth * 10), animationDelay: `${-i * 0.4}s` }}
        >
          <img src={f.src} alt="" draggable="false" />
        </span>
      ))}
    </div>
  )
}
