import { useEffect, useRef, useState } from 'react'
import { whenIdle, whenIntroDone } from '../intro'

// ---- Feel of the liquid glass ------------------------------------------
const DURATION = 750 // ms for the liquid to settle flat
const FADE = 260 // ms for the old image to cross-fade into the new one
const SIZE = 1.6 // size of the liquid swells (lower = bigger, softer)
const BEND = 0.028 // how strongly the liquid bends the image
const FLOW = 1.1 // how fast the surface flows while it settles
const RAINBOW = 0.35 // faint colour fringe where the bend is strongest (0 = none)
const SHEEN = 0.3 // soft light catching the surface (0 = none)
const FROST = 0.007 // how far frost scatters the light (0 = clear glass)
const FROST_AMOUNT = 0.75 // how much of the glass is frosted (0–1)
// -------------------------------------------------------------------------

const VERT = `
attribute vec2 p;
varying vec2 uv;
void main() { uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`

// A smooth, flowing height field acts as a liquid lens over the image: its
// slope bends the picture, splits colour slightly, and catches a soft light.
// Frost scatters each pixel over a few nearby points in a random direction,
// which gives the soft, slightly grainy look of frosted glass.
const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 uv;
uniform sampler2D a, b;
uniform vec2 coverA, coverB;
uniform float mixAB, k, aspect, time, size, bend, rainbow, sheen, frost, frostAmount;

float hash(vec2 q) { return fract(sin(dot(q, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 q) {
  vec2 i = floor(q), f = fract(q);
  vec2 s = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float n00 = hash(i), n10 = hash(i + vec2(1.0, 0.0));
  float n01 = hash(i + vec2(0.0, 1.0)), n11 = hash(i + vec2(1.0, 1.0));
  return mix(mix(n00, n10, s.x), mix(n01, n11, s.x), s.y);
}
float height(vec2 q) {
  vec2 drift = vec2(time * 0.35, -time * 0.5);
  return noise(q + drift) * 0.7 + noise(q * 1.9 - drift * 1.4 + 4.7) * 0.3;
}
vec2 cover(vec2 q, vec2 s) { return clamp((q - 0.5) * s + 0.5, 0.0, 1.0); }
vec4 pick(vec2 q) {
  q = clamp(q, 0.0, 1.0);
  return mix(texture2D(a, cover(q, coverA)), texture2D(b, cover(q, coverB)), mixAB);
}

void main() {
  vec2 q = vec2(uv.x * aspect, uv.y) * size;
  float e = 0.015;
  float h = height(q);
  vec2 slope = vec2(height(q + vec2(e, 0.0)) - h, height(q + vec2(0.0, e)) - h) / e;

  vec2 off = slope * bend * k;
  vec2 split = slope * bend * rainbow * 0.25 * k;
  vec4 c = pick(uv + off);
  c.r = pick(uv + off + split).r;
  c.b = pick(uv + off - split).b;

  // Frost: six taps on a small ring, turned by a random angle per pixel
  float angle = hash(uv * 1013.0) * 6.2832;
  float radius = frost * k;
  vec4 frosted = vec4(0.0);
  for (int i = 0; i < 6; i++) {
    float t = angle + float(i) * 1.0472;
    float r = radius * (0.45 + 0.55 * hash(uv * 733.0 + float(i)));
    frosted += pick(uv + off + vec2(cos(t), sin(t) * aspect) * r);
  }
  c = mix(c, frosted / 6.0, frostAmount * min(1.0, k * 1.6));
  c.rgb += 0.025 * k;

  vec3 normal = normalize(vec3(-slope * 0.5, 1.0));
  float light = pow(max(dot(normal, normalize(vec3(-0.45, 0.55, 1.0))), 0.0), 24.0);
  c.rgb += light * sheen * k;
  gl_FragColor = c;
}`

const easeOut = (t) => 1 - Math.pow(1 - t, 3)

// Shows the active image. Each time it changes, the picture appears through
// flowing liquid glass that quickly settles flat.
export default function GlassBackdrop({ images, active }) {
  const canvasRef = useRef(null)
  const glRef = useRef(null) // { gl, u, textures: Map, current, previous }
  const [fallback, setFallback] = useState(false)

  // Set up WebGL once
  useEffect(() => {
    const canvas = canvasRef.current
    const gl = canvas.getContext('webgl', { premultipliedAlpha: false, antialias: false })
    if (!gl) {
      setFallback(true)
      return
    }
    const compile = (type, src) => {
      const s = gl.createShader(type)
      gl.shaderSource(s, src)
      gl.compileShader(s)
      return s
    }
    const prog = gl.createProgram()
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      setFallback(true)
      return
    }
    gl.useProgram(prog)

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'p')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    const u = {}
    for (const name of ['a', 'b', 'coverA', 'coverB', 'mixAB', 'k', 'aspect', 'time', 'size', 'bend', 'rainbow', 'sheen', 'frost', 'frostAmount']) {
      u[name] = gl.getUniformLocation(prog, name)
    }
    gl.uniform1i(u.a, 0)
    gl.uniform1i(u.b, 1)
    gl.uniform1f(u.size, SIZE)
    gl.uniform1f(u.bend, BEND)
    gl.uniform1f(u.rainbow, RAINBOW)
    gl.uniform1f(u.sheen, SHEEN)
    gl.uniform1f(u.frost, FROST)
    gl.uniform1f(u.frostAmount, FROST_AMOUNT)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)

    const state = { gl, u, textures: new Map(), current: null, previous: null, k: 0, mix: 1, time: 0 }
    glRef.current = state

    // Load the images as textures once the intro is over, one at a time in
    // quiet moments, so nothing stutters (uploading big images is heavy work)
    let cancelled = false
    const loadAll = async () => {
      await whenIntroDone()
      for (const src of images) {
        const img = new Image()
        img.src = src
        try {
          await img.decode() // decodes off the main thread
        } catch {
          continue
        }
        await whenIdle()
        if (cancelled) return
        const tex = gl.createTexture()
        gl.bindTexture(gl.TEXTURE_2D, tex)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
        state.textures.set(src, { tex, w: img.naturalWidth, h: img.naturalHeight })
        state.onTexture?.(src)
      }
    }
    loadAll()

    const ro = new ResizeObserver(() => draw(state))
    ro.observe(canvas)
    return () => {
      cancelled = true
      ro.disconnect()
    }
    // images is a fixed list for the page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Play the glass each time the active image changes
  useEffect(() => {
    const state = glRef.current
    if (!state || !active) return
    let raf

    const start = () => {
      state.previous = state.current ?? active
      state.current = active
      const hold = new URLSearchParams(window.location.search).has('glass-hold')
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (hold || reduce) {
        state.k = hold ? 1 : 0
        state.mix = 1
        draw(state)
        return
      }
      const t0 = performance.now()
      const tick = (now) => {
        const t = Math.max(0, now - t0)
        state.k = 1 - easeOut(Math.min(1, t / DURATION))
        state.time = (t / 1000) * FLOW
        state.mix = Math.min(1, t / FADE)
        draw(state)
        if (t < DURATION) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }

    if (state.textures.has(active)) start()
    else state.onTexture = (src) => src === active && start()

    return () => {
      cancelAnimationFrame(raf)
      state.onTexture = null
    }
  }, [active])

  if (fallback) {
    return (
      <div className="glass">
        {images.map((src) => (
          <img key={src} src={src} alt="" className={src === active ? 'is-active' : ''} />
        ))}
      </div>
    )
  }

  return (
    <div className="glass">
      <canvas ref={canvasRef} aria-hidden="true" />
    </div>
  )
}

function draw(state) {
  const { gl, u, textures, current, previous, k, mix, time } = state
  const canvas = gl.canvas
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = Math.round(canvas.clientWidth * dpr)
  const h = Math.round(canvas.clientHeight * dpr)
  if (!w || !h) return
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w
    canvas.height = h
  }
  gl.viewport(0, 0, w, h)

  const next = textures.get(current)
  const prev = textures.get(previous) ?? next
  if (!next) return

  // Scale factors that make each image fill the frame (like object-fit: cover)
  const aspect = w / h
  const coverOf = (t) => {
    const ia = t.w / t.h
    return ia > aspect ? [aspect / ia, 1] : [1, ia / aspect]
  }

  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, prev.tex)
  gl.activeTexture(gl.TEXTURE1)
  gl.bindTexture(gl.TEXTURE_2D, next.tex)
  gl.uniform2fv(u.coverA, coverOf(prev))
  gl.uniform2fv(u.coverB, coverOf(next))
  gl.uniform1f(u.mixAB, mix)
  gl.uniform1f(u.k, k)
  gl.uniform1f(u.aspect, aspect)
  gl.uniform1f(u.time, time)
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
}
