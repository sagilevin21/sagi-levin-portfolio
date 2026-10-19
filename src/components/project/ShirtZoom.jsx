import { useEffect, useRef, useState } from 'react'

// The shirt, told in one scroll: the print file fills the screen on its own,
// then the view pulls back. The print lands exactly where it sits on the
// shirt in the mockup, hands over to it, and the person wearing it comes
// into view, the photo ending up filling the screen.
//
// `mockups`: one or more photos of the same scene (e.g. a wide and a tall
// one); the one closest to the screen's shape is used. Each has its `ratio`
// (width / height) and `quad`: the four corners of the print on it (top-left,
// top-right, bottom-right, bottom-left, as x, y shares of its width and
// height). The print file is warped to those corners, so it lands exactly on
// the printed shirt, fabric and camera angle included.
//
// While the scene is on screen the page "turns the lights down": the page
// colors switch to `dark`, and back to `light` when it leaves.

// Scroll positions (0 = scene starts, 1 = scene ends) of each beat
const PULL = [0.04, 0.8] // the view pulls back
const SHIRT_IN = [0.08, 0.42] // the mockup fades in around the print
const PRINT_OUT = [0.3, 0.55] // the print file hands over to the mockup's

// The lights going down and back up: slow, easing in and out
const LIGHTS_TIME = '1500ms'
const LIGHTS_EASE = 'cubic-bezier(0.45, 0, 0.55, 1)'

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const range = (p, [a, b]) => clamp01((p - a) / (b - a))
const ease = (t) => t * t * (3 - 2 * t)
const lerp = (a, b, t) => a + (b - a) * t

// The print's bounding box on the photo, from its corners
const boxOf = (q) => {
  const xs = [q[0], q[2], q[4], q[6]]
  const ys = [q[1], q[3], q[5], q[7]]
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
}

// CSS matrix3d that maps a w×h element onto the quad (in px): the
// square-to-quad perspective transform (Heckbert)
const warp = ([x0, y0, x1, y1, x2, y2, x3, y3], w, h) => {
  const dx1 = x1 - x2
  const dx2 = x3 - x2
  const dy1 = y1 - y2
  const dy2 = y3 - y2
  const sx = x0 - x1 + x2 - x3
  const sy = y0 - y1 + y2 - y3
  const den = dx1 * dy2 - dx2 * dy1
  const g = (sx * dy2 - dx2 * sy) / den
  const k = (dx1 * sy - sx * dy1) / den
  const a = x1 - x0 + g * x1
  const b = x3 - x0 + k * x3
  const d = y1 - y0 + g * y1
  const e = y3 - y0 + k * y3
  const m = [a / w, d / w, 0, g / w, b / h, e / h, 0, k / h, 0, 0, 1, 0, x0, y0, 0, 1]
  return `matrix3d(${m.map((v) => +v.toFixed(8)).join(',')})`
}

// The photo whose shape is closest to the screen's
const pick = (mockups, W, H) => {
  const screen = Math.log(W / H)
  let best = 0
  mockups.forEach((m, i) => {
    if (Math.abs(Math.log(m.ratio) - screen) < Math.abs(Math.log(mockups[best].ratio) - screen)) best = i
  })
  return best
}

export default function ShirtZoom({ print, mockups, alt, light, dark, children }) {
  const sceneRef = useRef(null)
  const stageRef = useRef(null)
  const zoomRef = useRef(null)
  const shirtRef = useRef(null)
  const printRef = useRef(null)
  const [which, setWhich] = useState(() =>
    typeof window === 'undefined' ? 0 : pick(mockups, window.innerWidth, window.innerHeight),
  )
  const mockup = mockups[which]

  useEffect(() => {
    const scene = sceneRef.current
    const stage = stageRef.current
    const zoom = zoomRef.current
    const shirt = shirtRef.current
    const printEl = printRef.current
    const { quad, ratio } = mockup
    const box = boxOf(quad)
    const root = document.documentElement.style
    let W = 0
    let H = 0
    let big = 0 // the zoom layer's height: its size at the start
    let end = 1 // its scale at the end, when the photo fills the screen
    let raf = 0
    let lightsRaf = 0
    let isDark = false

    // The zoom layer is laid out at its largest and only ever scaled down,
    // so the print stays sharp
    const size = () => {
      W = stage.clientWidth
      H = stage.clientHeight
      const best = pick(mockups, W, H)
      if (best !== which) setWhich(best)
      // Start: the print alone, as large as fits the screen
      big = Math.min((0.76 * H) / box.h, (0.86 * W) / (box.w * ratio))
      // End: the photo covers the screen
      end = Math.max(H, W / ratio) / big
      zoom.style.height = `${big}px`
      zoom.style.width = `${big * ratio}px`
      // The print, drawn at about its largest size, then warped onto the shirt
      const pw = box.w * big * ratio
      const ph = box.h * big
      printEl.style.width = `${pw}px`
      printEl.style.height = `${ph}px`
      printEl.style.transform = warp(
        quad.map((v, i) => v * (i % 2 ? big : big * ratio)),
        pw,
        ph,
      )
    }

    const frame = () => {
      raf = 0
      const r = scene.getBoundingClientRect()
      const run = r.height - H
      const p = run > 0 ? clamp01(-r.top / run) : 0

      // Lights down while the scene fills the middle of the screen: a slow,
      // even fade, like theatre lights
      const dim = r.top < H * 0.5 && r.bottom > H * 0.6
      if (dim !== isDark) {
        isDark = dim
        const c = dim ? dark : light
        root.setProperty('--color-time', LIGHTS_TIME)
        root.setProperty('--color-ease', LIGHTS_EASE)
        root.setProperty('--bg', c.bg)
        root.setProperty('--ink', c.ink)
        // The fade has started with these; other color changes go back to normal
        cancelAnimationFrame(lightsRaf)
        lightsRaf = requestAnimationFrame(() => {
          lightsRaf = requestAnimationFrame(() => {
            root.removeProperty('--color-time')
            root.removeProperty('--color-ease')
          })
        })
      }

      // The point held in the middle of the screen drifts from the print's
      // center to the photo's, so the photo ends up exactly covering it
      const z = ease(range(p, PULL))
      const s = lerp(1, end, z)
      const ax = lerp(box.x + box.w / 2, 0.5, z)
      const ay = lerp(box.y + box.h / 2, 0.5, z)
      const tx = W / 2 - ax * big * ratio * s
      const ty = H / 2 - ay * big * s
      zoom.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) scale(${s.toFixed(4)})`
      shirt.style.opacity = ease(range(p, SHIRT_IN)).toFixed(3)
      printEl.style.opacity = (1 - ease(range(p, PRINT_OUT))).toFixed(3)
    }
    const request = () => {
      if (!raf) raf = requestAnimationFrame(frame)
    }
    const resize = () => {
      size()
      request()
    }

    window.addEventListener('scroll', request, { passive: true })
    window.addEventListener('resize', resize)
    size()
    frame()

    return () => {
      cancelAnimationFrame(raf)
      cancelAnimationFrame(lightsRaf)
      root.removeProperty('--color-time')
      root.removeProperty('--color-ease')
      window.removeEventListener('scroll', request)
      window.removeEventListener('resize', resize)
      if (isDark) {
        root.setProperty('--bg', light.bg)
        root.setProperty('--ink', light.ink)
      }
    }
  }, [mockup, mockups, which, light, dark])

  return (
    <section className="shirt" ref={sceneRef}>
      <div className="shirt-stage" ref={stageRef}>
        <div className="shirt-zoom" ref={zoomRef}>
          <img className="shirt-mockup" ref={shirtRef} src={mockup.src} alt={alt} decoding="async" />
          <img className="shirt-print" ref={printRef} src={print.src} alt={print.alt} decoding="async" />
        </div>
        <div className="shirt-text">{children}</div>
      </div>
    </section>
  )
}
