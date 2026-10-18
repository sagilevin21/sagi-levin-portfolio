import { useEffect, useRef } from 'react'

// The shirt, told in one scroll: the print file fills the screen on its own,
// then the view pulls back. The print lands exactly where it sits on the
// shirt in the mockup, hands over to it, and the person wearing it comes
// into view.
//
// While the scene is on screen the page "turns the lights down": the page
// colors switch to `dark`, and back to `light` when it leaves.
//
// `mockup.box` is where the print sits on the mockup, as shares of its width
// and height: { x, y, w, h } (left, top, width, height).

// Scroll positions (0 = scene starts, 1 = scene ends) of each beat
const PULL = [0.04, 0.8] // the view pulls back
const SHIRT_IN = [0.08, 0.42] // the mockup fades in around the print
const PRINT_OUT = [0.3, 0.55] // the print file hands over to the mockup's

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const range = (p, [a, b]) => clamp01((p - a) / (b - a))
const ease = (t) => t * t * (3 - 2 * t)

export default function ShirtZoom({ print, mockup, light, dark, children }) {
  const sceneRef = useRef(null)
  const stageRef = useRef(null)
  const zoomRef = useRef(null)
  const shirtRef = useRef(null)
  const printRef = useRef(null)

  useEffect(() => {
    const scene = sceneRef.current
    const stage = stageRef.current
    const zoom = zoomRef.current
    const shirt = shirtRef.current
    const printEl = printRef.current
    const { box, ratio } = mockup
    const root = document.documentElement.style
    let start = 1 // how much bigger the view is at the start than at the end
    let raf = 0
    let isDark = false

    // The zoom layer is laid out at its largest and only ever scaled down,
    // so the print stays sharp
    const size = () => {
      const W = stage.clientWidth
      const H = stage.clientHeight
      // Start: the print alone, as large as fits the screen
      start = Math.min((0.76 * H) / (box.h * H), (0.86 * W) / (box.w * ratio * H))
      zoom.style.height = `${H * start}px`
      zoom.style.width = `${H * start * ratio}px`
    }

    const frame = () => {
      raf = 0
      const r = scene.getBoundingClientRect()
      const vh = window.innerHeight
      const run = r.height - vh
      const p = run > 0 ? clamp01(-r.top / run) : 0

      // Lights down while the scene fills the middle of the screen
      const dim = r.top < vh * 0.5 && r.bottom > vh * 0.6
      if (dim !== isDark) {
        isDark = dim
        const c = dim ? dark : light
        root.setProperty('--bg', c.bg)
        root.setProperty('--ink', c.ink)
      }

      const s = 1 + (1 / start - 1) * ease(range(p, PULL))
      zoom.style.transform = `translate(${-(box.x + box.w / 2) * 100}%, ${-(box.y + box.h / 2) * 100}%) scale(${s.toFixed(4)})`
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
      window.removeEventListener('scroll', request)
      window.removeEventListener('resize', resize)
      if (isDark) {
        root.setProperty('--bg', light.bg)
        root.setProperty('--ink', light.ink)
      }
    }
  }, [mockup, light, dark])

  const { box } = mockup
  return (
    <section className="shirt" ref={sceneRef}>
      <div className="shirt-stage" ref={stageRef}>
        <div
          className="shirt-zoom"
          ref={zoomRef}
          style={{ transformOrigin: `${(box.x + box.w / 2) * 100}% ${(box.y + box.h / 2) * 100}%` }}
        >
          <img className="shirt-mockup" ref={shirtRef} src={mockup.src} alt={mockup.alt} decoding="async" />
          <img
            className="shirt-print"
            ref={printRef}
            src={print.src}
            alt={print.alt}
            decoding="async"
            style={{ left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.w * 100}%`, height: `${box.h * 100}%` }}
          />
        </div>
        <div className="shirt-text">{children}</div>
      </div>
    </section>
  )
}
