import { useEffect, useRef } from 'react'
import Matter from 'matter-js'

// The board, seen from above: real block photos lying on a table. Drag them,
// throw them, push one into another. Each material has its own weight,
// grip and bounce. In the middle lies the clear acrylic frame the participants
// arrange their blocks in, as in the real activity.
//
// All blocks are about the same size (the concrete cube is the guide).
// density: weight; friction: grip against other blocks; slide: how far it
// slides when thrown (lower = stops sooner); bounce.
const BLOCKS = [
  { id: 'concrete', density: 0.006, friction: 0.6, slide: 0.16, bounce: 0.05 },
  { id: 'aluminum', density: 0.007, friction: 0.25, slide: 0.07, bounce: 0.1 },
  { id: 'coal', density: 0.003, friction: 0.7, slide: 0.15, bounce: 0.02 },
  { id: 'wood', density: 0.0018, friction: 0.5, slide: 0.12, bounce: 0.15 },
  { id: 'jelly', density: 0.0016, friction: 0.9, slide: 0.2, bounce: 0.7, round: true },
  { id: 'spikes', density: 0.0014, friction: 0.95, slide: 0.18, bounce: 0.05 },
  { id: 'pinkPLA', density: 0.0012, friction: 0.4, slide: 0.1, bounce: 0.3 },
  { id: 'confuse', density: 0.001, friction: 0.4, slide: 0.1, bounce: 0.3 },
  { id: 'infinity', density: 0.0009, friction: 0.4, slide: 0.1, bounce: 0.3 },
  { id: 'blank', density: 0.0008, friction: 0.4, slide: 0.1, bounce: 0.3 },
  { id: 'mesh', density: 0.0006, friction: 0.5, slide: 0.12, bounce: 0.35 },
]
const { Engine, Bodies, Body, Composite, Constraint, Events, Vector } = Matter

export default function BlockBoard() {
  const boardRef = useRef(null)
  const elsRef = useRef({})
  const apiRef = useRef(null)

  useEffect(() => {
    const board = boardRef.current
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const engine = Engine.create({ gravity: { x: 0, y: 0, scale: 0 } })
    engine.positionIterations = 8
    let bodies = []
    let walls = []
    let W = 0
    let H = 0
    let unit = 0

    // Start positions: spread evenly along the board's edges (a rectangle just
    // inside the border), so they always sit outside the format
    const layout = () => {
      const m = unit * 0.9
      const x0 = m, y0 = m, x1 = W - m, y1 = H - m
      const per = 2 * (x1 - x0 + y1 - y0)
      return BLOCKS.map((b, i) => {
        const d = ((i + 0.5) / BLOCKS.length) * per
        const jitter = ((i * 37) % 11) / 11 - 0.5
        const top = x1 - x0
        const side = y1 - y0
        let p
        if (d < top) p = { x: x0 + d, y: y0 }
        else if (d < top + side) p = { x: x1, y: y0 + d - top }
        else if (d < 2 * top + side) p = { x: x1 - (d - top - side), y: y1 }
        else p = { x: x0, y: y1 - (d - 2 * top - side) }
        return { ...p, angle: jitter * 0.6 }
      })
    }
    const build = (keep) => {
      const rect = board.getBoundingClientRect()
      const old = { W, H }
      W = rect.width
      H = rect.height
      // Base block size: fits 13 blocks around the format on any screen
      unit = W < 600 ? Math.min(W * 0.15, H * 0.1) : Math.min(W * 0.095, H * 0.13, 150)
      // The format: a square in the middle, leaving a ring for the blocks
      board.style.setProperty('--fmt', `${Math.min(W, H) - unit * 4}px`)
      Composite.clear(engine.world, false)
      const pos = keep && old.W ? bodies.map((b) => ({ x: (b.position.x / old.W) * W, y: (b.position.y / old.H) * H, angle: b.angle })) : layout()
      bodies = BLOCKS.map((b, i) => {
        const s = unit
        const body = Bodies.rectangle(pos[i].x, pos[i].y, s, s, {
          chamfer: { radius: b.round ? s * 0.22 : s * 0.04 },
          density: b.density,
          friction: b.friction,
          frictionAir: b.slide,
          restitution: b.bounce,
          angle: pos[i].angle,
        })
        body.plugin.block = b
        body.plugin.size = s
        return body
      })
      const t = 400
      walls = [
        Bodies.rectangle(W / 2, -t / 2, W * 2, t, { isStatic: true }),
        Bodies.rectangle(W / 2, H + t / 2, W * 2, t, { isStatic: true }),
        Bodies.rectangle(-t / 2, H / 2, t, H * 2, { isStatic: true }),
        Bodies.rectangle(W + t / 2, H / 2, t, H * 2, { isStatic: true }),
      ]
      Composite.add(engine.world, [...bodies, ...walls])
      bodies.forEach((body) => {
        const el = elsRef.current[body.plugin.block.id]
        if (el) {
          el.style.width = `${body.plugin.size}px`
          el.style.height = `${body.plugin.size}px`
        }
      })
      draw()
    }

    const draw = () => {
      for (const body of bodies) {
        const el = elsRef.current[body.plugin.block.id]
        if (!el) continue
        const s = body.plugin.size
        // Move the block; only its photo turns, so the name stays upright
        el.style.transform = `translate3d(${(body.position.x - s / 2).toFixed(1)}px, ${(body.position.y - s / 2).toFixed(1)}px, 0)`
        el.firstChild.style.transform = `rotate(${body.angle.toFixed(4)}rad)`
      }
    }

    // ---- Dragging: a soft spring between the pointer and the grabbed spot ----
    let drag = null
    const toBoard = (e) => {
      const r = board.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    const onDown = (e) => {
      const id = e.target.closest('[data-block]')?.dataset.block
      if (!id) return
      const body = bodies.find((b) => b.plugin.block.id === id)
      if (!body) return
      e.preventDefault()
      e.target.setPointerCapture?.(e.pointerId)
      const p = toBoard(e)
      const local = Vector.rotate(Vector.sub(p, body.position), -body.angle)
      const c = Constraint.create({ pointA: p, bodyB: body, pointB: local, stiffness: 0.12, damping: 0.08, length: 0 })
      Composite.add(engine.world, c)
      drag = { c, body, id: e.pointerId }
      board.classList.add('is-dragging')
      elsRef.current[id].classList.add('is-held')
      wake()
    }
    const onMove = (e) => {
      if (!drag || e.pointerId !== drag.id) return
      drag.c.pointA = toBoard(e)
    }
    const onUp = (e) => {
      if (!drag || e.pointerId !== drag.id) return
      Composite.remove(engine.world, drag.c)
      elsRef.current[drag.body.plugin.block.id]?.classList.remove('is-held')
      board.classList.remove('is-dragging')
      drag = null
    }
    board.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)

    // ---- Loop: runs only while something moves and the board is on screen ----
    let raf = 0
    let last = 0
    let visible = false
    let calm = 0
    const step = (now) => {
      raf = 0
      const dt = Math.min(32, last ? now - last : 16.7)
      last = now
      Engine.update(engine, dt)
      draw()
      const moving = drag || bodies.some((b) => b.speed > 0.05 || b.angularSpeed > 0.002)
      calm = moving ? 0 : calm + 1
      if (visible && calm < 30) raf = requestAnimationFrame(step)
      else last = 0
    }
    const wake = () => {
      calm = 0
      if (!raf && visible) raf = requestAnimationFrame(step)
    }
    Events.on(engine, 'collisionStart', wake)

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible) wake()
    })
    io.observe(board)

    let resizeTimer = 0
    const ro = new ResizeObserver(() => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        const r = board.getBoundingClientRect()
        if (Math.abs(r.width - W) > 2 || Math.abs(r.height - H) > 2) build(true)
      }, 120)
    })
    ro.observe(board)

    build(false)
    // A gentle settle on first view: blocks drift into place
    if (!reduce)
      bodies.forEach((b, i) => {
        const a = (i / bodies.length) * Math.PI * 2
        Body.setVelocity(b, { x: Math.cos(a) * -1.2, y: Math.sin(a) * -1.2 })
        Body.setAngularVelocity(b, ((i % 3) - 1) * 0.01)
      })

    apiRef.current = {
      scatter() {
        bodies.forEach((b, i) => {
          const p = layout()[i]
          Body.setPosition(b, p)
          Body.setAngle(b, p.angle)
          Body.setVelocity(b, { x: 0, y: 0 })
          Body.setAngularVelocity(b, 0)
        })
        draw()
        wake()
      },
    }

    return () => {
      io.disconnect()
      ro.disconnect()
      clearTimeout(resizeTimer)
      cancelAnimationFrame(raf)
      board.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      Engine.clear(engine)
    }
  }, [])

  return (
    <div className="board-wrap">
      <div className="board" ref={boardRef} role="img" aria-label="Interactive board: the Facets blocks around the acrylic frame, which can be dragged and arranged">
        {/* The composition frame: the real clear acrylic frame, lying flat */}
        <img className="board-frame" src="/images/facets/blocks/acrylic.webp" alt="" draggable="false" />
        {BLOCKS.map((b) => (
          <div
            key={b.id}
            className="block"
            data-block={b.id}
            ref={(el) => (elsRef.current[b.id] = el)}
            aria-hidden="true"
          >
            <span className="block-turn">
              <img src={`/images/facets/blocks/${b.id}.webp`} alt="" draggable="false" />
            </span>
          </div>
        ))}
      </div>
      <button type="button" className="board-reset" onClick={() => apiRef.current?.scatter()}>
        Scatter the blocks
      </button>
    </div>
  )
}
