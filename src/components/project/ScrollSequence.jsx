import { useEffect, useRef, useState } from 'react'

// A full-screen picture that changes as you scroll: the section is pinned
// while each step takes a turn, cross-fading into the next. A row of ticks
// shows where you are. Scrolling back steps back.
//
// The pictures always show whole; around them the screen takes each one's
// edge color (bg), so it reads as one full-screen picture on any screen.
//
// steps: [{ src, alt, label, bg }]
const PER_STEP = 70 // how much scrolling each step takes, in % of the screen's height

export default function ScrollSequence({ steps, className = '' }) {
  const ref = useRef(null)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const el = ref.current
    let raf = 0
    const update = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      const run = r.height - window.innerHeight
      const p = run > 0 ? Math.min(0.9999, Math.max(0, -r.top / run)) : 0
      setIndex(Math.floor(p * steps.length))
    }
    const request = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', request, { passive: true })
    window.addEventListener('resize', request)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', request)
      window.removeEventListener('resize', request)
    }
  }, [steps.length])

  return (
    <section
      className={`seq ${className}`}
      ref={ref}
      style={{ height: `calc(${steps.length * PER_STEP}svh + 100svh)` }}
    >
      <div className="seq-stage" style={{ backgroundColor: steps[index].bg }}>
        {steps.map((s, i) => (
          <img
            key={s.src}
            className={i === index ? 'is-on' : ''}
            src={s.src}
            alt={s.alt}
            aria-hidden={i !== index}
            loading="lazy"
            decoding="async"
          />
        ))}
        {/* For screen readers: which step is showing */}
        <p className="visually-hidden" aria-live="polite">
          {steps[index].label}, {index + 1} of {steps.length}
        </p>
        <ol className="seq-ticks" aria-hidden="true">
          {steps.map((s, i) => (
            <li key={s.src} className={i <= index ? 'is-on' : ''} />
          ))}
        </ol>
      </div>
    </section>
  )
}
