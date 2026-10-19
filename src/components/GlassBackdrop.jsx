import { useEffect, useRef, useState } from 'react'
import { whenIdle, whenIntroDone } from '../intro'
import { COMMON, GRAIN_FRAG, GRAIN_LOOK, VERT, grainStrength } from './filmGrain'

// Which transition plays between project images: 'grain' or 'liquid'
const EFFECT = 'grain'

// ---- Liquid glass ----------------------------------------------------------
// A smooth, flowing height field acts as a liquid lens over the image: its
// slope bends the picture, splits colour slightly, and catches a soft light.
// Frost scatters each pixel over a few nearby points in a random direction.
const LIQUID_FRAG = `${COMMON}
uniform float size, bend, rainbow, sheen, frost, frostAmount;

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

// ---- Feel of each effect -----------------------------------------------------
const EFFECTS = {
  grain: {
    frag: GRAIN_FRAG, // the shared film-grain look (filmGrain.js)
    duration: 500, // ms for the grain to fade into the clean photo
    fade: 200, // ms for the old image to cross-fade into the new one
    timeScale: 1,
    strength: grainStrength,
    settings: GRAIN_LOOK,
  },
  liquid: {
    frag: LIQUID_FRAG,
    duration: 750,
    fade: 260,
    timeScale: 1.1,
    strength: (t) => Math.pow(1 - t, 3),
    settings: { size: 1.6, bend: 0.028, rainbow: 0.35, sheen: 0.3, frost: 0.007, frostAmount: 0.75 },
  },
}
const FX = EFFECTS[EFFECT]
// -----------------------------------------------------------------------------

// Shows the active image. Each time it changes, the new picture arrives
// through the chosen effect, which quickly settles into the clean photo.
export default function GlassBackdrop({ images, active, shifts = {} }) {
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
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FX.frag))
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
    for (const name of ['a', 'b', 'coverA', 'coverB', 'shiftA', 'shiftB', 'mixAB', 'k', 'aspect', 'time']) {
      u[name] = gl.getUniformLocation(prog, name)
    }
    gl.uniform1i(u.a, 0)
    gl.uniform1i(u.b, 1)
    for (const [name, value] of Object.entries(FX.settings)) {
      gl.uniform1f(gl.getUniformLocation(prog, name), value)
    }
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)

    const state = { gl, u, shifts, textures: new Map(), current: null, previous: null, k: 0, mix: 1, time: 0 }
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

  // Play the effect each time the active image changes
  useEffect(() => {
    const state = glRef.current
    if (!state || !active) return
    let raf

    const start = () => {
      state.previous = state.current ?? active
      state.current = active
      // Add ?glass-hold to the address to freeze the effect at full strength
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
        state.k = FX.strength(Math.min(1, t / FX.duration))
        state.time = (t / 1000) * FX.timeScale
        state.mix = Math.min(1, t / FX.fade)
        draw(state)
        if (t < FX.duration) raf = requestAnimationFrame(tick)
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
          <img
            key={src}
            src={src}
            alt=""
            className={src === active ? 'is-active' : ''}
            style={shifts[src] ? { transform: `translateX(${shifts[src] * 100}%)` } : undefined}
          />
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
  const { gl, u, shifts, textures, current, previous, k, mix, time } = state
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
  gl.uniform1f(u.shiftA, shifts[previous ?? current] ?? 0)
  gl.uniform1f(u.shiftB, shifts[current] ?? 0)
  gl.uniform1f(u.mixAB, mix)
  gl.uniform1f(u.k, k)
  gl.uniform1f(u.aspect, aspect)
  gl.uniform1f(u.time, time)
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
}
