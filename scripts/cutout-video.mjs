// Cuts an object out of a video shot against a plain, neutral backdrop (grey,
// white) and makes a web copy with transparency that plays in every browser.
//
// Browsers don't agree on a transparent video format, so the result is an
// ordinary MP4 twice as tall: the object's colours on top, its transparency
// (white = solid) below. The site's CutoutVideo component puts the two back
// together.
//
// Usage: node scripts/cutout-video.mjs <in.mp4> <out.mp4> [key=value ...]
//   start=0       where to start (seconds)
//   length=       how long to keep (seconds; default: to the end)
//   width=540     output width (height follows the video)
//   soft=10,42    how different from the backdrop a pixel must be to start
//                 showing, and to be fully solid (0–255 colour distance)
//   crf=22        quality, lower = better and bigger
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import ffmpeg from 'ffmpeg-static'
import sharp from 'sharp'

const [input, output, ...rest] = process.argv.slice(2)
if (!input || !output) {
  console.log('Usage: node scripts/cutout-video.mjs <in.mp4> <out.mp4> [start= length= width= soft= crf=]')
  process.exit(1)
}
const opt = Object.fromEntries(rest.map((a) => a.split('=')))
const width = +(opt.width ?? 540)
const [t0, t1] = (opt.soft ?? '10,42').split(',').map(Number)
const crf = opt.crf ?? '22'

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cutout-'))
const inDir = path.join(tmp, 'in')
const outDir = path.join(tmp, 'out')
fs.mkdirSync(inDir)
fs.mkdirSync(outDir)

// 1. Frames, trimmed and scaled (ffmpeg -i alone exits with an error, but
// prints the frame rate)
let rate = '24'
try {
  execFileSync(ffmpeg, ['-hide_banner', '-i', input], { stdio: ['ignore', 'ignore', 'pipe'] })
} catch (e) {
  rate = String(e.stderr).match(/(\d+(?:\.\d+)?) fps/)?.[1] ?? rate
}
const trim = [...(opt.start ? ['-ss', opt.start] : []), ...(opt.length ? ['-t', opt.length] : [])]
execFileSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', ...trim, '-i', input, '-vf', `scale=${width}:-2:flags=lanczos`, path.join(inDir, 'f%04d.png')])
const frames = fs.readdirSync(inDir).sort()
console.log(`${frames.length} frames`)

// The backdrop: a smooth, slightly uneven light (a curved surface fitted to
// the neutral pixels), so its gradient doesn't read as part of the object
function fitBackdrop(data, W, H) {
  const rows = []
  const vals = [[], [], []]
  for (let y = 0; y < H; y += 6)
    for (let x = 0; x < W; x += 6) {
      const i = (y * W + x) * 3
      const r = data[i], g = data[i + 1], b = data[i + 2]
      if (Math.max(r, g, b) - Math.min(r, g, b) > 14) continue
      const l = (r + g + b) / 3
      if (l < 120 || l > 235) continue
      const u = x / W - 0.5, v = y / H - 0.5
      rows.push([1, u, v, u * u, u * v, v * v])
      vals[0].push(r); vals[1].push(g); vals[2].push(b)
    }
  const solve = (ys) => {
    // Normal equations for a 6-term surface
    const n = 6
    const A = Array.from({ length: n }, () => new Float64Array(n))
    const z = new Float64Array(n)
    rows.forEach((row, k) => {
      for (let i = 0; i < n; i++) {
        z[i] += row[i] * ys[k]
        for (let j = 0; j < n; j++) A[i][j] += row[i] * row[j]
      }
    })
    for (let i = 0; i < n; i++) {
      let p = i
      for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r
      ;[A[i], A[p]] = [A[p], A[i]]
      ;[z[i], z[p]] = [z[p], z[i]]
      for (let r = i + 1; r < n; r++) {
        const f = A[r][i] / A[i][i]
        for (let c = i; c < n; c++) A[r][c] -= f * A[i][c]
        z[r] -= f * z[i]
      }
    }
    const c = new Float64Array(n)
    for (let i = n - 1; i >= 0; i--) {
      let s = z[i]
      for (let j = i + 1; j < n; j++) s -= A[i][j] * c[j]
      c[i] = s / A[i][i]
    }
    return c
  }
  return vals.map(solve)
}

const W = width
for (const [k, name] of frames.entries()) {
  const { data, info } = await sharp(path.join(inDir, name)).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const H = info.height
  const coef = fitBackdrop(data, W, H)
  const alpha = new Float32Array(W * H)
  const color = Buffer.alloc(W * H * 3)
  const B = [0, 0, 0]
  for (let y = 0; y < H; y++) {
    const v = y / H - 0.5
    for (let x = 0; x < W; x++) {
      const u = x / W - 0.5
      for (let c = 0; c < 3; c++) {
        const q = coef[c]
        B[c] = q[0] + q[1] * u + q[2] * v + q[3] * u * u + q[4] * u * v + q[5] * v * v
      }
      const i = (y * W + x) * 3
      // How the pixel differs from the backdrop: in colour (the object has
      // a tint the grey doesn't), and in brightness. Darker than the
      // backdrop counts; lighter and still neutral is mostly the backdrop's
      // own glow, so it counts little
      const mc = (data[i] + data[i + 1] + data[i + 2]) / 3
      const mb = (B[0] + B[1] + B[2]) / 3
      const cr = data[i] - mc - (B[0] - mb)
      const cg = data[i + 1] - mc - (B[1] - mb)
      const cb = data[i + 2] - mc - (B[2] - mb)
      const lum = mc - mb
      const dL = lum < 0 ? -lum * 0.55 : lum * 0.3
      const d = Math.sqrt(cr * cr + cg * cg + cb * cb + dL * dL)
      let a = Math.min(1, Math.max(0, (d - t0) / (t1 - t0)))
      a = a * a * (3 - 2 * a)
      alpha[y * W + x] = a
      // Take the backdrop back out of the edges, so no grey halo remains
      for (let c = 0; c < 3; c++) {
        const val = a > 0.02 ? (data[i + c] - (1 - a) * B[c]) / a : B[c]
        color[i + c] = Math.max(0, Math.min(255, Math.round(val)))
      }
    }
  }
  // Close small gaps (bright highlights on the object that look like the
  // backdrop): the solid shape grown by a few pixels, then shrunk back
  const grow = (src, r, pick) => {
    const tmp1 = new Float32Array(W * H)
    const out = new Float32Array(W * H)
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        let m = src[y * W + x]
        for (let xx = Math.max(0, x - r); xx <= Math.min(W - 1, x + r); xx++) m = pick(m, src[y * W + xx])
        tmp1[y * W + x] = m
      }
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        let m = tmp1[y * W + x]
        for (let yy = Math.max(0, y - r); yy <= Math.min(H - 1, y + r); yy++) m = pick(m, tmp1[yy * W + x])
        out[y * W + x] = m
      }
    return out
  }
  const closed = grow(grow(alpha, 2, Math.max), 2, Math.min)
  for (let p = 0; p < W * H; p++) {
    if (closed[p] > alpha[p]) {
      // A filled gap: keep the photo's own colour there
      const i = p * 3
      for (let c = 0; c < 3; c++) color[i + c] = data[i + c]
      alpha[p] = closed[p]
    }
  }

  // Clear lone specks of noise: a pixel stays only if enough of its
  // neighbours show too
  const clean = Buffer.alloc(W * H * 3)
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let a = alpha[y * W + x]
      if (a > 0 && a < 0.9) {
        let sum = 0
        for (let yy = Math.max(0, y - 1); yy <= Math.min(H - 1, y + 1); yy++)
          for (let xx = Math.max(0, x - 1); xx <= Math.min(W - 1, x + 1); xx++) sum += alpha[yy * W + xx]
        if (sum < 1.2) a = 0
      }
      const g = Math.round(a * 255)
      const j = (y * W + x) * 3
      clean[j] = clean[j + 1] = clean[j + 2] = g
    }
  // Colours on top, transparency below
  await sharp({ create: { width: W, height: H * 2, channels: 3, background: '#000' } })
    .composite([
      { input: color, raw: { width: W, height: H, channels: 3 }, top: 0, left: 0 },
      { input: clean, raw: { width: W, height: H, channels: 3 }, top: H, left: 0 },
    ])
    .png({ compressionLevel: 1 })
    .toFile(path.join(outDir, name))
  if (k % 24 === 0) process.stdout.write(`\r${k + 1}/${frames.length}`)
}
console.log('\nencoding')

execFileSync(ffmpeg, [
  '-y', '-hide_banner', '-loglevel', 'error',
  '-framerate', rate, '-i', path.join(outDir, 'f%04d.png'),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', crf, '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart', '-an', output,
])
fs.rmSync(tmp, { recursive: true, force: true })
console.log('done:', output, `${Math.round(fs.statSync(output).size / 1024)} KB`)
