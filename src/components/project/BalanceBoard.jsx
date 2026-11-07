import { useCallback, useEffect, useRef, useState } from 'react'
import './BalanceBoard.css'

// Balansir, to try: write a task on the note, drag it onto the beam, and the
// beam tips with the weight and settles. Notes can be dragged off again.
// The object is the real photo in two layers: the stand stays still, the
// beam (with its rods and counterweights) turns on the needle point.

// Where things are in the cut-out photos (stand.webp / beam.webp, 1705 × 1070)
const IMG_W = 1705
const IMG_H = 1070
const PIVOT_X = 865 / IMG_W // the needle tip on the agate
const PIVOT_Y = 182 / IMG_H
const BEAM_Y = 97 / IMG_H // the beam's centre line
const BEAM_FROM = 60 / IMG_W // notes hang between these points
const BEAM_TO = 1645 / IMG_W
const CLEAR = 95 / IMG_W // kept clear around the centre pin
const NOTE = 0.17 // a note's width, as a share of the object's width

// How it moves
const MAX_DEG = 14 // as far as the beam can tip before a counterweight meets the post
const PER_NOTE = 6.5 // roughly the tilt one note at the very end gives
const FREQ = 0.85 // swings per second
const DAMP = 0.13 // how quickly the swinging dies down
const MAX_NOTES = 6

const IDEAS = [
  'Reply to emails',
  'Call grandma',
  'Finish the report',
  'Gym at 7',
  'Water the plants',
  'Book the dentist',
  'Read a chapter',
  'Plan the weekend',
]
// The pad's colours, one note after another: yellow, green, pink, blue
const COLORS = ['#f3ea4c', '#a8db8a', '#f39cc2', '#8ecdf0']
// Where Enter hangs a note, in turn (both sides, further out each time)
const SLOTS = [0.8, 0.24, 0.93, 0.1, 0.68, 0.36]

let nextId = 1

export default function BalanceBoard() {
  const [notes, setNotes] = useState([]) // { id, text, x } x: share of width
  const [text, setText] = useState('')
  const [idea, setIdea] = useState(0)
  const [drag, setDrag] = useState(null) // { text, w } while a note is held
  const sceneRef = useRef(null)
  const rockerRef = useRef(null)
  const ghostRef = useRef(null)
  const heldRef = useRef(null)
  const statusRef = useRef(null)
  const sim = useRef({ theta: 0, omega: 0, target: 0, raf: 0, last: 0 })

  const placeholder = IDEAS[idea % IDEAS.length]
  // The top note's colour, and the next two showing as the pad's edges
  const color = COLORS[idea % COLORS.length]
  const padStyle = {
    '--c': color,
    '--c2': COLORS[(idea + 1) % COLORS.length],
    '--c3': COLORS[(idea + 2) % COLORS.length],
  }

  // ---- The swing: a damped spring toward the tilt the notes ask for ----
  const step = useCallback(function tick(now) {
    const s = sim.current
    const dt = Math.min(0.033, (now - (s.last || now)) / 1000)
    s.last = now
    const w = Math.PI * 2 * FREQ
    s.omega += (-w * w * (s.theta - s.target) - 2 * DAMP * w * s.omega) * dt
    s.theta += s.omega * dt
    const el = rockerRef.current
    if (el) {
      el.style.rotate = `${s.theta}deg`
      el.style.setProperty('--tilt', `${s.theta}deg`)
      // The notes hang from the beam and lag behind as it swings
      el.style.setProperty('--sway', `${Math.max(-9, Math.min(9, -s.omega * 0.14))}deg`)
    }
    if (Math.abs(s.theta - s.target) < 0.01 && Math.abs(s.omega) < 0.02) {
      s.raf = 0
      s.last = 0
      return
    }
    s.raf = requestAnimationFrame(tick)
  }, [])

  const wake = useCallback(() => {
    const s = sim.current
    if (!s.raf) s.raf = requestAnimationFrame(step)
  }, [step])

  // Each note pulls by its distance from the centre; the counterweights pull back
  useEffect(() => {
    const half = (BEAM_TO - BEAM_FROM) / 2
    const pull = notes.reduce((sum, n) => sum + (n.x - PIVOT_X) / half, 0)
    const s = sim.current
    s.target = MAX_DEG * Math.tanh((pull * PER_NOTE) / MAX_DEG)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // No swinging: straight to where it settles
      s.theta = s.target
      s.omega = 0
    }
    wake()
    if (statusRef.current) {
      const t = s.target
      const lean = Math.abs(t) < 0.8 ? 'balanced' : t > 0 ? 'leaning right' : 'leaning left'
      statusRef.current.textContent = notes.length
        ? `${notes.length} ${notes.length === 1 ? 'note' : 'notes'} on the beam, ${lean}.`
        : 'The beam is empty and balanced.'
    }
  }, [notes, wake])

  useEffect(() => {
    const s = sim.current
    return () => {
      cancelAnimationFrame(s.raf)
      s.raf = 0
      s.last = 0
    }
  }, [])

  // ---- Where on the beam a held note would hang (null if too far away) ----
  const spotFor = (clientX, clientY) => {
    const r = sceneRef.current.getBoundingClientRect()
    const px = clientX - r.left - PIVOT_X * r.width
    const py = clientY - r.top - PIVOT_Y * r.height
    // Into the beam's own direction (undo its tilt)
    const a = (sim.current.theta * Math.PI) / 180
    const lx = px * Math.cos(a) + py * Math.sin(a)
    const ly = -px * Math.sin(a) + py * Math.cos(a)
    const beamY = (BEAM_Y - PIVOT_Y) * r.height
    if (ly < beamY - r.height * 0.14 || ly > beamY + r.height * 0.2) return null
    let x = (lx + PIVOT_X * r.width) / r.width
    if (x < BEAM_FROM - 0.06 || x > BEAM_TO + 0.06) return null
    x = Math.max(BEAM_FROM, Math.min(BEAM_TO, x))
    if (Math.abs(x - PIVOT_X) < CLEAR) x = PIVOT_X + Math.sign(x - PIVOT_X || 1) * CLEAR
    return x
  }

  // ---- Dragging: from the pad, or a note back off the beam ----
  const startDrag = (e, noteText, noteColor, onLift) => {
    if (e.button !== undefined && e.button !== 0) return
    const x0 = e.clientX
    const y0 = e.clientY
    const box = e.currentTarget.getBoundingClientRect()
    // Where in the note it was picked up, as a share of its size
    const gx = (x0 - box.left) / box.width
    const gy = (y0 - box.top) / box.height
    let lifted = false
    let spot = null
    let w = 0

    const place = (cx, cy) => {
      const held = heldRef.current
      if (held) held.style.translate = `${cx - gx * w}px ${cy - gy * w}px`
      // The note's top edge, where it would fold over the beam
      spot = spotFor(cx - gx * w + w / 2, cy - gy * w + w * 0.06)
      const ghost = ghostRef.current
      if (ghost) {
        ghost.style.setProperty('--x', spot ?? 0.5)
        ghost.classList.toggle('is-on', spot !== null)
      }
    }
    const move = (ev) => {
      if (!lifted) {
        if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) return
        if (notes.length >= MAX_NOTES && !onLift.fromBeam) return
        lifted = true
        document.activeElement?.blur?.()
        w = sceneRef.current.getBoundingClientRect().width * NOTE
        onLift()
        setDrag({ text: noteText, color: noteColor, w })
        // Position once the held note is drawn
        requestAnimationFrame(() => place(ev.clientX, ev.clientY))
      }
      ev.preventDefault()
      place(ev.clientX, ev.clientY)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      if (!lifted) return
      ghostRef.current?.classList.remove('is-on')
      setDrag(null)
      if (spot !== null) setNotes((list) => [...list, { id: nextId++, text: noteText, color: noteColor, x: spot }])
    }
    window.addEventListener('pointermove', move, { passive: false })
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  // Tearing the top note off the pad
  const fromPad = (e) => {
    const noteText = text.trim() || placeholder
    const lift = () => {
      setText('')
      setIdea((i) => i + 1)
    }
    startDrag(e, noteText, color, lift)
  }

  // Taking a note back off the beam
  const fromBeam = (e, note) => {
    const lift = () => setNotes((list) => list.filter((n) => n.id !== note.id))
    lift.fromBeam = true
    startDrag(e, note.text, note.color, lift)
  }

  // Enter (or the button) hangs the note at the next free spot
  const hangNow = () => {
    if (notes.length >= MAX_NOTES) return
    const x = SLOTS.find((s) => notes.every((n) => Math.abs(n.x - s) > 0.06)) ?? SLOTS[notes.length % SLOTS.length]
    setNotes((list) => [...list, { id: nextId++, text: text.trim() || placeholder, color, x }])
    setText('')
    setIdea((i) => i + 1)
  }

  const full = notes.length >= MAX_NOTES

  return (
    <div className="bz-board">
      <div className="bz-side">
        <p className="label-kicker" data-reveal>
          Try it yourself
        </p>
        <p className="p-body bz-how" data-reveal>
          Write a task on the note and drag it onto the beam. Take it off again when it&rsquo;s done.
        </p>

        {/* The pad of notes */}
        <div className={`bz-pad ${full ? 'is-full' : ''}`} style={padStyle} data-reveal>
          <div className="bz-pad-note" onPointerDown={full ? undefined : fromPad}>
            <textarea
              value={full ? '' : text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  hangNow()
                }
              }}
              placeholder={full ? 'The beam is full. Take a note off first.' : placeholder}
              maxLength={42}
              rows={3}
              disabled={full}
              aria-label="Task for a new note. Press Enter to hang it on the beam, or drag the note onto the beam."
            />
          </div>
        </div>
        <div className="bz-actions" data-reveal>
          <span className="bz-tip">{full ? 'Six is plenty.' : 'Drag the note, or press Enter'}</span>
          {notes.length > 0 && (
            <button type="button" className="bz-clear" onClick={() => setNotes([])}>
              Clear the beam
            </button>
          )}
        </div>
      </div>

      <div className="bz-stage" data-reveal>
        <div className="bz-scene" ref={sceneRef}>
          <img className="bz-stand" src="/images/balansir/stand.webp" alt="" draggable="false" />
          <div className="bz-rocker" ref={rockerRef}>
            <img
              className="bz-beam"
              src="/images/balansir/beam.webp"
              alt="Balansir: a brass beam balanced on a needle point, with stone counterweights hanging below"
              draggable="false"
            />
            <div className="bz-ghost" ref={ghostRef} aria-hidden="true" />
            {notes.map((n) => (
              <button
                key={n.id}
                type="button"
                className="bz-note"
                style={{ '--x': n.x, '--c': n.color }}
                onPointerDown={(e) => fromBeam(e, n)}
                onKeyDown={(e) => {
                  if (e.key === 'Delete' || e.key === 'Backspace' || e.key === 'Enter') {
                    e.preventDefault()
                    setNotes((list) => list.filter((m) => m.id !== n.id))
                  }
                }}
                aria-label={`${n.text}. Press Enter to take it off the beam.`}
              >
                <span className="bz-paper">{n.text}</span>
              </button>
            ))}
          </div>
        </div>
        <p className="visually-hidden" aria-live="polite" ref={statusRef} />
      </div>

      {/* The note in hand, following the pointer */}
      {drag && (
        <div className="bz-held" ref={heldRef} style={{ width: drag.w, fontSize: drag.w * 0.075, '--c': drag.color }} aria-hidden="true">
          <span className="bz-paper">{drag.text}</span>
        </div>
      )}
    </div>
  )
}
