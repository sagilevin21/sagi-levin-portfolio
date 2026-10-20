import { useEffect, useRef, useState } from 'react'

// Plays a cut-out video (made with scripts/cutout-video.mjs) with real
// transparency, so the object sits straight on the page. The file holds the
// colours on top and the transparency below; this draws the two together.
// Loops while on screen; holds still with reduced motion. Without WebGL it
// shows `fallback` (a photo) instead.
const VERT = `
attribute vec2 p;
varying vec2 uv;
void main() { uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`

const FRAG = `
precision mediump float;
varying vec2 uv;
uniform sampler2D v;
void main() {
  vec3 c = texture2D(v, vec2(uv.x, 0.5 + uv.y * 0.5)).rgb;
  float a = texture2D(v, vec2(uv.x, uv.y * 0.5)).r;
  gl_FragColor = vec4(c * a, a);
}`

// speed: playback speed (1 = as filmed)
export default function CutoutVideo({ src, fallback, alt, speed = 1, className = '' }) {
  const canvasRef = useRef(null)
  const videoRef = useRef(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const video = videoRef.current
    const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false })
    if (!gl) {
      setFailed(true)
      return
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    video.defaultPlaybackRate = speed
    video.playbackRate = speed
    const compile = (type, source) => {
      const s = gl.createShader(type)
      gl.shaderSource(s, source)
      gl.compileShader(s)
      return s
    }
    const prog = gl.createProgram()
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      setFailed(true)
      return
    }
    gl.useProgram(prog)
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'p')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    const tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)

    let raf = 0
    let visible = false
    const draw = () => {
      if (video.readyState < 2) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = Math.round(canvas.clientWidth * dpr)
      const h = Math.round(canvas.clientHeight * dpr)
      if (!w || !h) return
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      gl.viewport(0, 0, w, h)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }
    // A new picture each time the video shows a new frame
    const onFrame = () => {
      draw()
      raf = video.requestVideoFrameCallback ? video.requestVideoFrameCallback(onFrame) : requestAnimationFrame(onFrame)
    }
    const stop = () => {
      if (video.cancelVideoFrameCallback) video.cancelVideoFrameCallback(raf)
      cancelAnimationFrame(raf)
      raf = 0
    }

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible && !reduce) {
        video.playbackRate = speed
        video.play().catch(() => {})
        if (!raf) onFrame()
      } else {
        video.pause()
        stop()
      }
    })
    io.observe(canvas)
    const onReady = () => draw()
    video.addEventListener('loadeddata', onReady)
    video.addEventListener('seeked', onReady)
    window.addEventListener('resize', onReady)

    return () => {
      io.disconnect()
      stop()
      video.pause()
      video.removeEventListener('loadeddata', onReady)
      video.removeEventListener('seeked', onReady)
      window.removeEventListener('resize', onReady)
    }
  }, [src, speed])

  if (failed) return <img className={className} src={fallback} alt={alt} />
  return (
    <div className={`cutout ${className}`}>
      <canvas ref={canvasRef} role="img" aria-label={alt} />
      <video ref={videoRef} src={src} muted loop playsInline preload="auto" aria-hidden="true" />
    </div>
  )
}
