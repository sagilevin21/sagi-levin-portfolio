import { useEffect, useRef } from 'react'

// Soft rippling light, like sunlight through a water surface, over the whole
// screen. `strengthRef.current` (0–1) sets how visible it is, so a page can
// fade it out as you scroll deeper. Rendered small and scaled up, ~30 fps,
// and paused when invisible.
const FRAG = `
precision mediump float;
uniform float t;
uniform vec2 res;
void main() {
  vec2 uv = gl_FragCoord.xy / res.y * 1.6;
  vec2 p = mod(uv * 6.28318, 6.28318) - 250.0;
  vec2 i = p;
  float c = 1.0;
  float inten = 0.005;
  for (int n = 0; n < 4; n++) {
    float tt = t * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / inten), p.y / (cos(i.y + tt) / inten)));
  }
  c /= 4.0;
  c = 1.17 - pow(c, 1.4);
  float v = clamp(pow(abs(c), 8.0), 0.0, 1.0);
  gl_FragColor = vec4(vec3(v), 1.0);
}`

const SCALE = 1 / 3 // render at a third of the screen size
const MAX_OPACITY = 0.14

export default function WaterLight({ strengthRef }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false })
    if (!gl) return
    const sh = (type, src) => {
      const s = gl.createShader(type)
      gl.shaderSource(s, src)
      gl.compileShader(s)
      return s
    }
    const prog = gl.createProgram()
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }'))
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return
    gl.useProgram(prog)
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'p')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    const uT = gl.getUniformLocation(prog, 't')
    const uRes = gl.getUniformLocation(prog, 'res')

    const size = () => {
      canvas.width = Math.max(1, Math.round(window.innerWidth * SCALE))
      canvas.height = Math.max(1, Math.round(window.innerHeight * SCALE))
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.uniform2f(uRes, canvas.width, canvas.height)
    }
    size()
    window.addEventListener('resize', size)

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const t0 = performance.now()
    let raf = 0
    let last = 0
    const frame = (now) => {
      raf = requestAnimationFrame(frame)
      const strength = Math.max(0, Math.min(1, strengthRef.current ?? 1))
      canvas.style.opacity = (strength * MAX_OPACITY).toFixed(3)
      if (strength <= 0.001 || document.hidden) return
      if (now - last < 33) return // ~30 fps is plenty for slow water light
      last = now
      gl.uniform1f(uT, still ? 4.0 : ((now - t0) / 1000) * 0.35 + 23.0)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', size)
    }
  }, [strengthRef])

  return <canvas ref={canvasRef} className="water-light" aria-hidden="true" />
}
