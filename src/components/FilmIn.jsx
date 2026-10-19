import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { FILM_FRAG, GRAIN_LOOK, VERT, grainStrength } from './filmGrain'
import { filmDone, filmStarted } from '../intro'

// The page arrives like projected film, the same look as the home page
// images: it rises out of the page color under heavy grain, a warm tint, a
// flicker and darker corners, then settles into the clean page. A fixed
// layer over the screen, so it covers whatever the visitor first sees
// (text, photos, all of it) on any screen size; it removes itself once it
// has played. Heavy setup elsewhere (3D) waits for it (whenFilmDone).
const DURATION = 1100 // ms for the film look to fade away
const FADE = 520 // ms for the page to rise out of its color
const DELAY = 220 // ms held at the start, while the page finishes building
// The grain is drawn at up to 1.5× the screen's CSS size (not its full
// pixel density) and only when the film frame changes, so it stays light
const GRAIN_SIZE = 0.85 // size of a grain, in CSS px
const MAX_SCALE = 1.5
// How strong the grain layer is (its opacity) is set in project.css

export default function FilmIn() {
  const veilRef = useRef(null)
  const canvasRef = useRef(null)
  const [done, setDone] = useState(
    () => typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  // Mark the page before anything else sets up
  useLayoutEffect(() => {
    if (done) return
    filmStarted()
    return filmDone
  }, [done])

  useEffect(() => {
    if (done) return
    const veil = veilRef.current
    const canvas = canvasRef.current
    let raf = 0

    // Grain: a small shader (if WebGL is missing, the page still rises in)
    const scale = Math.min(window.devicePixelRatio || 1, MAX_SCALE)
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false })
    let uK = null
    let uTime = null
    if (gl) {
      const compile = (type, source) => {
        const s = gl.createShader(type)
        gl.shaderSource(s, source)
        gl.compileShader(s)
        return s
      }
      const prog = gl.createProgram()
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT))
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FILM_FRAG))
      gl.linkProgram(prog)
      if (gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        gl.useProgram(prog)
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
        const loc = gl.getAttribLocation(prog, 'p')
        gl.enableVertexAttribArray(loc)
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
        for (const [name, value] of Object.entries({ ...GRAIN_LOOK, grainSize: GRAIN_SIZE * scale })) {
          gl.uniform1f(gl.getUniformLocation(prog, name), value)
        }
        uK = gl.getUniformLocation(prog, 'k')
        uTime = gl.getUniformLocation(prog, 'time')
      }
    }
    let shownFrame = -1
    const drawGrain = (k, time) => {
      if (!uK) return
      const frame = Math.floor(time * 24)
      if (frame === shownFrame) return
      shownFrame = frame
      const w = Math.round(canvas.clientWidth * scale)
      const h = Math.round(canvas.clientHeight * scale)
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      gl.viewport(0, 0, w, h)
      gl.uniform1f(uK, k)
      gl.uniform1f(uTime, time)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }

    // The page is busy loading as it opens: each frame moves the clock on by
    // at most 1/20 s, so a stall pauses the effect instead of skipping it
    let t = -DELAY
    let last = 0
    const tick = (now) => {
      t += last ? Math.min(now - last, 50) : 0
      last = now
      const p = Math.max(0, t)
      const k = grainStrength(Math.min(1, p / DURATION))
      const m = Math.min(1, p / FADE)
      veil.style.opacity = (1 - m * m * (3 - 2 * m)).toFixed(3)
      drawGrain(k, p / 1000)
      if (p < DURATION) raf = requestAnimationFrame(tick)
      else setDone(true)
    }
    drawGrain(1, 0)
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [done])

  if (done) return null
  return (
    <div className="film-in" aria-hidden="true">
      <div className="film-in-veil" ref={veilRef} />
      <canvas className="film-in-grain" ref={canvasRef} />
    </div>
  )
}
