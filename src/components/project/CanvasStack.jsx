import { useCallback, useEffect, useRef, useState } from 'react'
import './CanvasStack.css'

// A stack of stretched canvases facing you, each with its name and year
// printed along the top edge. Scrolling flips through them: the front canvas
// tips down toward you, its top edge (and the title) turning into view as it
// drops away, and the next one is revealed. Clicking the stack, Previous /
// Next or the arrow keys flip too. Only the front painting is ever seen.
//
// pieces: [{ src, alt, ar (width / height), title, year }]
export default function CanvasStack({ pieces }) {
  const sectionRef = useRef(null)
  const canvasRefs = useRef([])
  const [current, setCurrent] = useState(0)
  const n = pieces.length

  // ---- Scroll drives the stack ----
  useEffect(() => {
    const section = sectionRef.current
    let raf = 0
    let shown = -1

    const update = () => {
      raf = 0
      const r = section.getBoundingClientRect()
      const run = r.height - window.innerHeight
      const raw = Math.min(1, Math.max(0, -r.top / run)) * (n - 1)
      // Each canvas rests a moment before the next flip begins
      const i = Math.min(n - 2, Math.floor(raw))
      const f = raw - i
      const t = Math.min(1, Math.max(0, (f - 0.18) / 0.64))
      const ease = t * t * (3 - 2 * t)
      const p = raw >= n - 1 ? n - 1 : i + ease

      canvasRefs.current.forEach((el, k) => {
        if (!el) return
        const d = k - p
        let transform
        let opacity = 1
        if (d <= -1) {
          opacity = 0
          transform = 'translate3d(0, 40%, 120px) rotateX(-80deg)'
        } else if (d < 0) {
          // Tipping forward off the front of the stack
          const a = -d
          transform = `translate3d(0, ${(a * 34).toFixed(2)}%, ${(a * 120).toFixed(1)}px) rotateX(${(-a * 80).toFixed(2)}deg)`
          opacity = 1 - a ** 4
        } else {
          // Waiting behind, already at its own size and still. Only the next
          // one shows, and only once the front canvas is mostly down.
          transform = `translate3d(0, 0, ${(-Math.min(d, 1) * 4).toFixed(2)}px)`
          opacity = Math.min(1, Math.max(0, (1 - d) / 0.45))
        }
        el.style.transform = transform
        // Faded on its parts, not the canvas itself, so it keeps its depth
        el.style.setProperty('--o', opacity.toFixed(3))
        el.style.visibility = opacity <= 0.001 ? 'hidden' : 'visible'
        el.style.zIndex = String(n - k)
      })

      const now = Math.round(p)
      if (now !== shown) {
        shown = now
        setCurrent(now)
      }
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [n])

  // ---- Clicks and keys: scroll to the chosen canvas ----
  const goTo = useCallback(
    (k) => {
      const section = sectionRef.current
      const idx = Math.min(n - 1, Math.max(0, k))
      const top = section.getBoundingClientRect().top + window.scrollY
      const run = section.offsetHeight - window.innerHeight
      window.scrollTo({ top: top + (run * idx) / (n - 1), behavior: 'smooth' })
    },
    [n],
  )

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
      const r = sectionRef.current.getBoundingClientRect()
      if (r.top > window.innerHeight * 0.5 || r.bottom < window.innerHeight * 0.5) return
      e.preventDefault()
      goTo(current + (e.key === 'ArrowRight' ? 1 : -1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current, goTo])

  const label = (p) => (p.year ? `${p.title}, ${p.year}` : p.title)

  return (
    <section className="cv" ref={sectionRef} style={{ '--n': n }}>
      <div className="cv-stage">
        <div
          className="cv-stack"
          onClick={() => goTo(current < n - 1 ? current + 1 : 0)}
          role="button"
          tabIndex={-1}
          aria-label="Next painting"
        >
          {pieces.map((p, k) => (
            <div
              key={p.src}
              className="cv-canvas"
              ref={(el) => (canvasRefs.current[k] = el)}
              style={{ '--ar': p.ar }}
            >
              <div className="cv-face">
                <img src={p.src} alt={p.alt} loading={k < 2 ? 'eager' : 'lazy'} decoding="async" draggable="false" />
              </div>
              {/* The stretcher: the top edge with its label, and the two sides */}
              <div className="cv-top">
                <span>{label(p)}</span>
              </div>
              <div className="cv-side is-left" />
              <div className="cv-side is-right" />
            </div>
          ))}
        </div>

        <div className="cv-controls">
          <button type="button" onClick={() => goTo(current - 1)} disabled={current === 0} aria-label="Previous painting">
            Previous
          </button>
          <button type="button" onClick={() => goTo(current + 1)} disabled={current === n - 1} aria-label="Next painting">
            Next
          </button>
        </div>
      </div>
    </section>
  )
}
