import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'

// The 3D engine is big, so it loads separately, after the page itself
const RobotModel = lazy(() => import('./RobotModel'))

// ---- Feel ------------------------------------------------------------------
const FOLLOW = 0.0016 // how strongly it's pulled toward the target
const DRAG = 0.9 // water resistance (lower = more drag)
const MAX_TILT = 22 // degrees it tips up/down when climbing or diving
const IDLE_AFTER = 2500 // ms without input before it starts wandering
const BUBBLE_EVERY = 70 // ms between bubbles while it's moving quickly
const SIDE_VIEW = 0.5 // radians: how far it turns its face toward you while swimming sideways
// ------------------------------------------------------------------------------

// A robot that lazily swims after your cursor inside its section (or to where
// you tap on a phone), turning to face where it's going, tilting into climbs
// and dives, and leaving a trail of bubbles. When nobody steers, it wanders.
//
// With `model` it's the real 3D robot (front = +x); until that loads, or if
// 3D isn't available, it's the photo `src`, which faces left and is mirrored.
export default function SwimmingRobot({ src, model, alt = '' }) {
  const areaRef = useRef(null)
  const bodyRef = useRef(null)
  const bubblesRef = useRef(null)
  const modelRef = useRef(null)
  const [modelReady, setModelReady] = useState(false)
  const onModelReady = useCallback(() => setModelReady(true), [])

  useEffect(() => {
    const area = areaRef.current
    const body = bodyRef.current
    const bubbles = bubblesRef.current
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const box = () => area.getBoundingClientRect()
    let { width: w, height: h } = box()
    const pos = { x: w * 0.3, y: h * 0.55 }
    const vel = { x: 0, y: 0 }
    const target = { x: w * 0.5, y: h * 0.5 }
    let facing = 1 // 1 = swimming left, -1 = swimming right
    let flip = 1 // eases between the two, so turns are gradual
    let lastInput = -Infinity
    let lastBubble = 0
    let visible = false
    let raf = 0
    let last = performance.now()
    let modelOn = false // true once the 3D robot has rendered a frame

    const setTarget = (e) => {
      const b = box()
      target.x = Math.min(b.width, Math.max(0, e.clientX - b.left))
      target.y = Math.min(b.height, Math.max(0, e.clientY - b.top))
      lastInput = performance.now()
    }
    // While a mouse is over the section, the robot stays with it, even if the
    // cursor rests; it only wanders once the mouse leaves (or a while after a tap)
    let mouseInside = false
    const onMove = (e) => {
      if (e.pointerType !== 'mouse') return
      mouseInside = true
      setTarget(e)
    }
    const onLeave = (e) => {
      if (e.pointerType === 'mouse') mouseInside = false
    }
    const onDown = (e) => setTarget(e) // tap on touch screens
    area.addEventListener('pointermove', onMove)
    area.addEventListener('pointerleave', onLeave)
    area.addEventListener('pointerdown', onDown)

    const onResize = () => ({ width: w, height: h } = box())
    window.addEventListener('resize', onResize)

    const spawnBubble = (x, y) => {
      if (bubbles.childElementCount > 24) return
      const b = document.createElement('span')
      const size = 3 + Math.random() * 7
      b.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px;--drift:${(Math.random() - 0.5) * 30}px`
      b.addEventListener('animationend', () => b.remove())
      bubbles.appendChild(b)
    }

    const frame = (now) => {
      raf = visible ? requestAnimationFrame(frame) : 0
      const dt = Math.min(48, now - last) / 16.67
      last = now

      // Nobody steering: wander in a slow loop around the middle
      if (!mouseInside && now - lastInput > IDLE_AFTER) {
        const t = now / 1000
        target.x = w * (0.5 + 0.32 * Math.sin(t * 0.37))
        target.y = h * (0.5 + 0.22 * Math.sin(t * 0.61 + 1.2))
      }

      vel.x = (vel.x + (target.x - pos.x) * FOLLOW * dt) * Math.pow(DRAG, dt)
      vel.y = (vel.y + (target.y - pos.y) * FOLLOW * dt) * Math.pow(DRAG, dt)
      pos.x += vel.x * dt
      pos.y += vel.y * dt

      // Turn around only when the target is clearly on the other side and it's
      // heading there, so overshooting a little doesn't make it flip back and forth
      const ahead = target.x - pos.x
      if (ahead > 70 && vel.x > 0.4) facing = -1
      else if (ahead < -70 && vel.x < -0.4) facing = 1
      flip += (facing - flip) * Math.min(1, 0.08 * dt)
      const tilt = Math.max(-MAX_TILT, Math.min(MAX_TILT, vel.y * 4)) // + = diving
      const bob = Math.sin(now / 620) * 5
      const move = `translate3d(${pos.x.toFixed(1)}px, ${(pos.y + bob).toFixed(1)}px, 0) translate(-50%, -50%)`

      const m = modelRef.current
      if (m && modelOn) {
        // 3D: turning from one side to the other passes through facing you
        const right = (1 - flip) / 2 // 0 = facing left, 1 = facing right
        const yaw = -Math.PI + SIDE_VIEW + right * (Math.PI - 2 * SIDE_VIEW)
        const roll = (-tilt * Math.PI) / 180 * -flip + Math.sin(now / 900) * 0.04
        body.style.transform = move
        modelOn = m.render({ yaw, roll })
      } else {
        modelOn = !!m?.render({ yaw: -SIDE_VIEW }) // switch to 3D once it's ready
        body.style.transform = `${move} rotate(${(-tilt * facing).toFixed(1)}deg) scaleX(${flip.toFixed(3)})`
      }

      const speed = Math.hypot(vel.x, vel.y)
      if (speed > 1.6 && now - lastBubble > BUBBLE_EVERY) {
        lastBubble = now
        // From its back: the side it's swimming away from
        const back = body.offsetWidth * 0.32 * facing
        spawnBubble(pos.x + back, pos.y + bob + (Math.random() - 0.5) * 16)
      }
    }

    // Only animate while the section is on screen
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible && !raf && !reduce) {
        last = performance.now()
        raf = requestAnimationFrame(frame)
      }
    })
    io.observe(area)
    if (reduce) {
      body.style.transform = `translate3d(${w / 2}px, ${h / 2}px, 0) translate(-50%, -50%)`
      modelRef.current?.render({ yaw: -SIDE_VIEW })
    }

    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
      area.removeEventListener('pointermove', onMove)
      area.removeEventListener('pointerleave', onLeave)
      area.removeEventListener('pointerdown', onDown)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <div className="swim-area" ref={areaRef}>
      <div className="swim-bubbles" ref={bubblesRef} aria-hidden="true" />
      <div ref={bodyRef} className={`swim-body ${model ? 'has-model' : ''} ${modelReady ? 'model-ready' : ''}`}>
        <img className="swim-photo" src={src} alt={alt} draggable="false" />
        {model && (
          <Suspense fallback={null}>
            <RobotModel ref={modelRef} url={model} className="swim-model" onReady={onModelReady} />
          </Suspense>
        )}
      </div>
    </div>
  )
}
