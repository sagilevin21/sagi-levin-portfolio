import { useCallback, useEffect, useRef, useState } from 'react'
import { monogramPaths, monogramViewBox } from '../data/monogram'
import { penSegments } from '../data/monogramPen'
import { INTRO_SEEN_KEY, announceIntroDone } from '../intro'

// ---- Timing (ms) ---------------------------------------------------------
const START = 220 // short pause on the dark screen before the pen starts
const DRAW = 1650 // the pen writes the monogram from one end to the other
const SETTLE_AT = START + DRAW + 40 // any last slivers the pen missed fill in
const LEAVE_AT = START + DRAW + 480 // screen starts dissolving
const DISSOLVE = 900
// -------------------------------------------------------------------------

// The full mark as one shape, so both loops keep their holes
const markPath = monogramPaths.join(' ')

// A dark screen where the SL monogram is written in solid ink, like a pen
// moving from the top hook through both loops to the tail, then dissolves
// to reveal the site. Click or press any key to skip.
export default function Intro({ onDone }) {
  // wait → draw → settle → out. "wait" holds the pen until the page has
  // finished its own start-up work, so the first strokes don't stutter.
  const [phase, setPhase] = useState('wait')
  const leaving = useRef(false)

  const leave = useCallback(() => {
    if (leaving.current) return
    leaving.current = true
    setPhase('out')
    // Lets the page underneath start its entrance while the screen dissolves
    delete document.documentElement.dataset.intro
    setTimeout(() => {
      onDone()
      announceIntroDone()
    }, DISSOLVE)
  }, [onDone])

  useEffect(() => {
    try {
      window.sessionStorage.setItem(INTRO_SEEN_KEY, '1')
    } catch {
      /* private mode: it will simply play again next time */
    }
    let timers = []
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        setPhase((p) => (p === 'wait' ? 'draw' : p))
        timers = [
          setTimeout(() => setPhase((p) => (p === 'draw' ? 'settle' : p)), SETTLE_AT),
          setTimeout(leave, LEAVE_AT),
        ]
      })
    })
    window.addEventListener('pointerdown', leave)
    window.addEventListener('keydown', leave)
    return () => {
      cancelAnimationFrame(raf)
      timers.forEach(clearTimeout)
      window.removeEventListener('pointerdown', leave)
      window.removeEventListener('keydown', leave)
    }
  }, [leave])

  return (
    <div
      className={`intro is-${phase}`}
      style={{ '--dissolve': `${DISSOLVE}ms` }}
      aria-hidden="true"
    >
      <svg viewBox={monogramViewBox}>
        <defs>
          <mask id="intro-pen" maskUnits="userSpaceOnUse">
            {/* One piece per nib width; each starts when the previous ends,
                so the pen moves at an even speed */}
            {penSegments
              .filter((s) => !s.ink)
              .map((s, i) => (
                <PenStroke key={i} segment={s} stroke="#fff" />
              ))}
          </mask>
        </defs>
        {/* Ink revealed along the pen's route */}
        <path className="intro-ink" d={markPath} mask="url(#intro-pen)" />
        {/* Plain ink lines where the pen passes the unfinished crossing */}
        {penSegments
          .filter((s) => s.ink)
          .map((s, i) => (
            <PenStroke key={i} segment={s} stroke="currentColor" className="intro-line" />
          ))}
        {/* Full mark underneath, shown at the end to catch any missed slivers */}
        <path className="intro-mark" d={markPath} />
      </svg>
    </div>
  )
}

function PenStroke({ segment, stroke, className = '' }) {
  return (
    <path
      className={`intro-pen ${className}`}
      d={segment.d}
      pathLength="1"
      fill="none"
      stroke={stroke}
      strokeWidth={segment.width}
      strokeLinejoin="round"
      style={{
        animationDelay: `${START + segment.start * DRAW}ms`,
        animationDuration: `${segment.length * DRAW}ms`,
      }}
    />
  )
}
