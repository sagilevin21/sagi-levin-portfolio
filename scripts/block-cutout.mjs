// Cuts a block out of a top-down photo shot on paper, and evens out the light.
//
//   node scripts/block-cutout.mjs <photo.jpg> <out.webp> [options as key=value]
//
// 1. Models the paper's own lighting (it's brighter in the middle, darker in
//    the corners) from the area around the block, then divides it out, so the
//    paper becomes a flat neutral white in every photo. That puts all blocks
//    under the same "light", whatever the original exposure.
// 2. Everything that clearly differs from flat paper (colour, darkness, or
//    texture) is the block; soft shadows are only a little darker and stay
//    paper. Holes, specks and the shadow are cleaned up.
// 3. Optional perspective fix: maps the block's four outer corners to a square.
//
// Options: thr=  (sensitivity, default 0.13)   square=1 (straighten to a square)
//          hull=1 (faint objects: outline around all detected pieces)
//          alpha=clear (clear material: partly see-through)
//          punch=1 (open frames: paper seen through the middle becomes see-through)
//          defringe=0 (keep bright edge pixels: for white or pale blocks)
//          box=x,y;x,y;x,y;x,y (manual outline, as shares of the photo)
//          keepHoles=1 (keep enclosed paper areas, e.g. inside a frame, solid)
//          size= (output size in px, default 700)   debug=path (mask preview)

import fs from 'node:fs'
import sharp from 'sharp'

const [input, output, ...opts] = process.argv.slice(2)
const opt = Object.fromEntries(opts.map((o) => o.split('=')))
const THR = +(opt.thr ?? 0.13)
const W = 1400

const { data, info } = await sharp(input).rotate().resize({ width: W }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
const w = info.width, h = info.height
const N = w * h
const R = new Float32Array(N), G = new Float32Array(N), B = new Float32Array(N)
for (let i = 0; i < N; i++) {
  R[i] = data[i * 3] / 255
  G[i] = data[i * 3 + 1] / 255
  B[i] = data[i * 3 + 2] / 255
}

// ---- 1. Paper lighting model ------------------------------------------------
// Fit a smooth surface (2nd-order polynomial in x, y) per channel to paper
// samples taken from a frame around the image, away from the block.
function fitSurface(ch) {
  const rows = []
  const vals = []
  const step = 12
  for (let y = 0; y < h; y += step)
    for (let x = 0; x < w; x += step) {
      const nx = x / w - 0.5, ny = y / h - 0.5
      if (Math.abs(nx) < 0.3 && Math.abs(ny) < 0.3) continue // skip the middle (block)
      rows.push([1, nx, ny, nx * nx, ny * ny, nx * ny])
      vals.push(ch[y * w + x])
    }
  // Least squares (normal equations, 6x6)
  const A = Array.from({ length: 6 }, () => new Float64Array(6))
  const b = new Float64Array(6)
  rows.forEach((r, k) => {
    for (let i = 0; i < 6; i++) {
      b[i] += r[i] * vals[k]
      for (let j = 0; j < 6; j++) A[i][j] += r[i] * r[j]
    }
  })
  for (let i = 0; i < 6; i++) {
    let p = i
    for (let r = i + 1; r < 6; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r
    ;[A[i], A[p]] = [A[p], A[i]]
    ;[b[i], b[p]] = [b[p], b[i]]
    for (let r = 0; r < 6; r++) {
      if (r === i) continue
      const f = A[r][i] / A[i][i]
      for (let c = i; c < 6; c++) A[r][c] -= f * A[i][c]
      b[r] -= f * b[i]
    }
  }
  const k = b.map((v, i) => v / A[i][i])
  const surf = new Float32Array(N)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const nx = x / w - 0.5, ny = y / h - 0.5
      surf[y * w + x] = k[0] + k[1] * nx + k[2] * ny + k[3] * nx * nx + k[4] * ny * ny + k[5] * nx * ny
    }
  return surf
}
const pR = fitSurface(R), pG = fitSurface(G), pB = fitSurface(B)

// Flat-lit image: divide the paper's lighting out, so paper = 1.0 (white)
const fR = new Float32Array(N), fG = new Float32Array(N), fB = new Float32Array(N)
for (let i = 0; i < N; i++) {
  fR[i] = R[i] / pR[i]
  fG[i] = G[i] / pG[i]
  fB[i] = B[i] / pB[i]
}

// ---- 2. Block mask ------------------------------------------------------------
const lum = (i) => 0.3 * fR[i] + 0.59 * fG[i] + 0.11 * fB[i]
// Local texture: difference to the neighbours (paper is smooth)
const tex = new Float32Array(N)
for (let y = 1; y < h - 1; y++)
  for (let x = 1; x < w - 1; x++) {
    const i = y * w + x
    tex[i] = Math.abs(lum(i) - lum(i - 1)) + Math.abs(lum(i) - lum(i + 1)) + Math.abs(lum(i) - lum(i - w)) + Math.abs(lum(i) - lum(i + w))
  }
// Smooth the texture measure a little
const texS = new Float32Array(N)
for (let y = 2; y < h - 2; y++)
  for (let x = 2; x < w - 2; x++) {
    let s = 0
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) s += tex[(y + dy) * w + x + dx]
    texS[y * w + x] = s / 25
  }

// Measure this photo's own paper: how much colour, darkness and grain plain
// paper has here (in the outer frame, away from the block), and set each
// threshold just above that
const chromaOf = (i) => {
  const l = lum(i)
  return Math.max(Math.abs(fR[i] - l), Math.abs(fG[i] - l), Math.abs(fB[i] - l))
}
const pc = [], pd = [], pt = []
for (let y = 4; y < h - 4; y += 3)
  for (let x = 4; x < w - 4; x += 3) {
    const nx = x / w - 0.5, ny = y / h - 0.5
    if (Math.abs(nx) < 0.34 && Math.abs(ny) < 0.34) continue
    const i = y * w + x
    pc.push(chromaOf(i))
    pd.push(Math.abs(1 - lum(i)))
    pt.push(texS[i])
  }
const pct = (a, p) => a.sort((x, y) => x - y)[Math.floor(a.length * p)]
const K = THR / 0.13 // sensitivity multiplier from the thr option
const tChroma = Math.max(0.05, pct(pc, 0.995) * 1.6) * K
// Soft shadows are smooth, colourless and up to ~40% darker: only darker than
// that counts on its own (block faces that are plain grey are filled in later,
// because they're enclosed by the block's textured edges)
const tDark = Math.max(0.42, pct(pd, 0.995) * 1.5 + 0.12) * K
const tTex = Math.max(0.05, pct(pt, 0.995) * 2.2) * K
console.log(`  paper noise -> thresholds: colour ${tChroma.toFixed(3)}, dark ${tDark.toFixed(3)}, texture ${tTex.toFixed(3)}`)

let mask = new Uint8Array(N)
for (let i = 0; i < N; i++) {
  const l = lum(i)
  // Coloured blocks bounce a faint tint onto the paper around them: near-white
  // pixels need much more colour to count as block
  const tC = tChroma * (1 + Math.max(0, l - 0.82) * 14)
  const isBlock = chromaOf(i) > tC || 1 - l > tDark || l > 1.08 || texS[i] > tTex
  mask[i] = isBlock ? 1 : 0
}

// Morphology helpers
const dilate = (m, r) => {
  const out = new Uint8Array(N)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!m[y * w + x]) continue
      for (let dy = -r; dy <= r; dy++) {
        const yy = y + dy
        if (yy < 0 || yy >= h) continue
        for (let dx = -r; dx <= r; dx++) {
          const xx = x + dx
          if (xx >= 0 && xx < w && dx * dx + dy * dy <= r * r) out[yy * w + xx] = 1
        }
      }
    }
  return out
}
const erode = (m, r) => {
  const inv = new Uint8Array(N)
  for (let i = 0; i < N; i++) inv[i] = m[i] ? 0 : 1
  const d = dilate(inv, r)
  const out = new Uint8Array(N)
  for (let i = 0; i < N; i++) out[i] = d[i] ? 0 : 1
  return out
}
// Close small gaps, then keep the biggest connected piece near the middle
mask = erode(dilate(mask, 4), 4)
const comp = new Int32Array(N).fill(-1)
let best = -1, bestScore = -1
for (let s = 0; s < N; s++) {
  if (!mask[s] || comp[s] !== -1) continue
  const id = s
  const st = [s]
  comp[s] = id
  let size = 0, cx = 0, cy = 0
  while (st.length) {
    const i = st.pop()
    size++
    const x = i % w, y = (i / w) | 0
    cx += x
    cy += y
    for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1])
      if (j >= 0 && mask[j] && comp[j] === -1) {
        comp[j] = id
        st.push(j)
      }
  }
  const dc = Math.hypot(cx / size / w - 0.5, cy / size / h - 0.5)
  const score = size * (1 - Math.min(0.9, dc * 1.6))
  if (score > bestScore) (bestScore = score), (best = id)
}
if (opt.box) {
  // Manual outline: four corners as shares of the photo (x,y;x,y;x,y;x,y),
  // for blocks the camera can't tell apart from their shadow or the paper
  const corners = opt.box.split(';').map((p) => p.split(',').map(Number)).map(([x, y]) => [x * w, y * h])
  mask = new Uint8Array(N)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (inHull(corners, x, y)) mask[y * w + x] = 1
} else if (opt.hull === '1') {
  // Faint objects (clear acrylic, white mesh) are found in scattered pieces:
  // take every piece near the middle and fill the outline around all of them
  const pts = []
  for (let y = 0; y < h; y += 2)
    for (let x = 0; x < w; x += 2) {
      const i = y * w + x
      if (mask[i] && Math.abs(x / w - 0.5) < 0.4 && Math.abs(y / h - 0.5) < 0.4) pts.push([x, y])
    }
  const hull = convexHull(pts)
  let bx0 = w, by0 = h, bx1 = 0, by1 = 0
  for (const [x, y] of hull) {
    bx0 = Math.min(bx0, x)
    by0 = Math.min(by0, y)
    bx1 = Math.max(bx1, x)
    by1 = Math.max(by1, y)
  }
  mask = new Uint8Array(N)
  for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) if (inHull(hull, x, y)) mask[y * w + x] = 1
} else {
  for (let i = 0; i < N; i++) mask[i] = comp[i] === best ? 1 : 0
  if (opt.peel !== '0') {
    // Peel the shadow off: starting from the outside, remove block pixels that
    // look like shadow (no colour, smooth, only moderately dark), stopping as
    // soon as real block surface (coloured, textured or dark) is reached
    const shadowLike = (i) => {
      const l = lum(i)
      // (shadows next to coloured blocks pick up a faint tint from them)
      return chromaOf(i) < Math.max(0.085, tChroma * 1.7) && texS[i] < tTex * 0.5 && l > 0.45 && l < 1.12
    }
    const peeled = new Uint8Array(N)
    const st = []
    for (let i = 0; i < N; i++) {
      if (!mask[i]) continue
      const x = i % w, y = (i / w) | 0
      const edge = (x > 0 && !mask[i - 1]) || (x < w - 1 && !mask[i + 1]) || (y > 0 && !mask[i - w]) || (y < h - 1 && !mask[i + w])
      if (edge && shadowLike(i)) st.push(i)
    }
    while (st.length) {
      const i = st.pop()
      if (peeled[i] || !mask[i] || !shadowLike(i)) continue
      peeled[i] = 1
      const x = i % w, y = (i / w) | 0
      if (x > 0) st.push(i - 1)
      if (x < w - 1) st.push(i + 1)
      if (y > 0) st.push(i - w)
      if (y < h - 1) st.push(i + w)
    }
    let n = 0
    for (let i = 0; i < N; i++) if (peeled[i]) (mask[i] = 0), n++
    // Smooth the new edge
    mask = dilate(erode(mask, 2), 2)
    console.log(`  peeled ${((n / N) * 100).toFixed(1)}% of the photo as shadow`)
  }
}

// Fill enclosed paper areas (unless the block is open, like a frame)
if (opt.keepHoles !== '1') {
  // keepHoles=0 (default): enclosed areas that look like plain paper stay see-through
}
{
  const outside = new Uint8Array(N)
  const st = []
  for (let x = 0; x < w; x++) st.push(x, (h - 1) * w + x)
  for (let y = 0; y < h; y++) st.push(y * w, y * w + w - 1)
  while (st.length) {
    const i = st.pop()
    if (outside[i] || mask[i]) continue
    outside[i] = 1
    const x = i % w, y = (i / w) | 0
    if (x > 0) st.push(i - 1)
    if (x < w - 1) st.push(i + 1)
    if (y > 0) st.push(i - w)
    if (y < h - 1) st.push(i + w)
  }
  // Enclosed non-block pixels: fill if small (specks) or if keepHoles=1
  const enclosed = new Int32Array(N).fill(-1)
  for (let s = 0; s < N; s++) {
    if (mask[s] || outside[s] || enclosed[s] !== -1) continue
    const st2 = [s]
    const members = []
    enclosed[s] = s
    while (st2.length) {
      const i = st2.pop()
      members.push(i)
      const x = i % w, y = (i / w) | 0
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1])
        if (j >= 0 && !mask[j] && !outside[j] && enclosed[j] === -1) {
          enclosed[j] = s
          st2.push(j)
        }
    }
    // Fill it unless it's plain paper seen through an opening (bright and smooth)
    let sumL = 0
    for (const i of members) sumL += lum(i)
    const looksLikePaper = sumL / members.length > 0.86
    if (opt.keepHoles === '1' || members.length < N * 0.0015 || !looksLikePaper) for (const i of members) mask[i] = 1
  }
}

// ---- 3. Bounding box, optional straightening, output ---------------------------
let x0 = w, y0 = h, x1 = 0, y1 = 0
for (let i = 0; i < N; i++)
  if (mask[i]) {
    const x = i % w, y = (i / w) | 0
    if (x < x0) x0 = x
    if (x > x1) x1 = x
    if (y < y0) y0 = y
    if (y > y1) y1 = y
  }

// Soft edge
let alpha = Buffer.alloc(N)
for (let i = 0; i < N; i++) alpha[i] = mask[i] ? 255 : 0
alpha = await sharp(alpha, { raw: { width: w, height: h, channels: 1 } }).erode(2).blur(1.1).extractChannel(0).raw().toBuffer()
if (opt.punch === '1') {
  // Open the middle: plain paper seen through the block (bright, colourless,
  // smooth) becomes see-through, even where it touches the block's edges
  const paperish = (i) => lum(i) > 0.78 && chromaOf(i) < 0.14 && texS[i] < tTex * 0.7
  const seen = new Uint8Array(N)
  for (let s0 = 0; s0 < N; s0++) {
    if (seen[s0] || !alpha[s0] || !paperish(s0)) continue
    const st = [s0]
    const members = []
    seen[s0] = 1
    while (st.length) {
      const i = st.pop()
      members.push(i)
      const x = i % w, y = (i / w) | 0
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1])
        if (j >= 0 && !seen[j] && alpha[j] && paperish(j)) {
          seen[j] = 1
          st.push(j)
        }
    }
    if (members.length > N * 0.003) for (const i of members) alpha[i] = 0
  }
  alpha = await sharp(alpha, { raw: { width: w, height: h, channels: 1 } }).erode(1).blur(1).extractChannel(0).raw().toBuffer()
}if (opt.defringe !== '0') {
  // Defringe: within a few pixels of the edge, bright near-white pixels are
  // paper peeking through (between spikes, in gaps): make them see-through.
  // (Turned off for white or pale blocks, where it would eat the block.)
  const solid = new Uint8Array(N)
  for (let i = 0; i < N; i++) solid[i] = alpha[i] > 8 ? 1 : 0
  const inner = erode(solid, 5)
  for (let i = 0; i < N; i++) {
    if (!solid[i] || inner[i]) continue
    if (lum(i) > 0.8 && chromaOf(i) < 0.13 + Math.max(0, lum(i) - 0.85) * 0.5) alpha[i] = 0
  }
  alpha = await sharp(alpha, { raw: { width: w, height: h, channels: 1 } }).blur(0.8).extractChannel(0).raw().toBuffer()
}
if (opt.alpha === 'clear') {
  // Clear material: as opaque as it is different from the paper behind it,
  // with a faint glassy minimum, so the board shows through like real acrylic
  for (let i = 0; i < N; i++) {
    if (!alpha[i]) continue
    // Only colour and edges count (not the paper's shading under it), so the
    // glass reads evenly clear with its edges and corners visible
    const strength = Math.max(chromaOf(i) / tChroma, texS[i] / tTex)
    alpha[i] = Math.round(alpha[i] * Math.min(1, 0.16 + Math.max(0, strength - 0.6) * 1.2))
  }
  alpha = await sharp(alpha, { raw: { width: w, height: h, channels: 1 } }).blur(1.6).extractChannel(0).raw().toBuffer()
}

const rgba = Buffer.alloc(N * 4)
const c = (v) => Math.max(0, Math.min(255, Math.round(v * 255)))
for (let i = 0; i < N; i++) {
  // Flat-lit colours, nudged so pure paper white stays white
  rgba[i * 4] = c(fR[i] * 0.97)
  rgba[i * 4 + 1] = c(fG[i] * 0.97)
  rgba[i * 4 + 2] = c(fB[i] * 0.97)
  rgba[i * 4 + 3] = alpha[i]
}

let img = rgba, iw = w, ih = h
if (opt.square === '1') {
  // Four outer corners: extreme points along the diagonals
  let tl = [x0, y0], tr = [x1, y0], br = [x1, y1], bl = [x0, y1]
  let a1 = Infinity, a2 = -Infinity, a3 = -Infinity, a4 = Infinity
  for (let i = 0; i < N; i++) {
    if (!mask[i]) continue
    const x = i % w, y = (i / w) | 0
    if (x + y < a1) (a1 = x + y), (tl = [x, y])
    if (x + y > a3) (a3 = x + y), (br = [x, y])
    if (x - y > a2) (a2 = x - y), (tr = [x, y])
    if (x - y < a4) (a4 = x - y), (bl = [x, y])
  }
  const side = Math.round((Math.hypot(tr[0] - tl[0], tr[1] - tl[1]) + Math.hypot(br[0] - bl[0], br[1] - bl[1]) + Math.hypot(bl[0] - tl[0], bl[1] - tl[1]) + Math.hypot(br[0] - tr[0], br[1] - tr[1])) / 4)
  const H = homography([[0, 0], [side, 0], [side, side], [0, side]], [tl, tr, br, bl])
  const out = Buffer.alloc(side * side * 4)
  for (let y = 0; y < side; y++)
    for (let x = 0; x < side; x++) {
      const d = H[6] * x + H[7] * y + 1
      const sx = (H[0] * x + H[1] * y + H[2]) / d
      const sy = (H[3] * x + H[4] * y + H[5]) / d
      sample(rgba, w, h, sx, sy, out, (y * side + x) * 4)
    }
  img = out
  iw = ih = side
  x0 = 0
  y0 = 0
  x1 = side - 1
  y1 = side - 1
  console.log('  straightened corners', JSON.stringify([tl, tr, br, bl]))
}

const pad = 4
const box = { left: Math.max(0, x0 - pad), top: Math.max(0, y0 - pad) }
box.width = Math.min(iw - box.left, x1 - x0 + pad * 2)
box.height = Math.min(ih - box.top, y1 - y0 + pad * 2)
const size = +(opt.size ?? 700)
await sharp(img, { raw: { width: iw, height: ih, channels: 4 } })
  .extract(box)
  .resize({ width: size, height: size, fit: 'inside' })
  .webp({ quality: 88, alphaQuality: 100 })
  .toFile(output)
// Record the block's size in the photo (px at 1400 wide), for relative sizing
console.log(`${input.split(/[\\/]/).pop()}: block ${x1 - x0}x${y1 - y0}px in photo -> ${output}`)

if (opt.debug) {
  const prev = Buffer.alloc(N * 3)
  for (let i = 0; i < N; i++) {
    const a = alpha[i] / 255
    prev[i * 3] = c(fR[i] * a + (1 - a) * 1)
    prev[i * 3 + 1] = c(fG[i] * a)
    prev[i * 3 + 2] = c(fB[i] * a + (1 - a) * 1)
  }
  await sharp(prev, { raw: { width: w, height: h, channels: 3 } }).resize({ width: 500 }).jpeg().toFile(opt.debug)
}

function sample(src, sw, sh, x, y, out, o) {
  const x0 = Math.floor(x), y0 = Math.floor(y)
  if (x0 < 0 || y0 < 0 || x0 >= sw - 1 || y0 >= sh - 1) return
  const fx = x - x0, fy = y - y0
  for (let k = 0; k < 4; k++) {
    const a = src[(y0 * sw + x0) * 4 + k], b = src[(y0 * sw + x0 + 1) * 4 + k]
    const cc = src[((y0 + 1) * sw + x0) * 4 + k], d = src[((y0 + 1) * sw + x0 + 1) * 4 + k]
    out[o + k] = Math.round(a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + cc * (1 - fx) * fy + d * fx * fy)
  }
}

// Homography mapping dst points to src points (solves the 8 unknowns)
function homography(dst, src) {
  const A = []
  const bb = []
  for (let i = 0; i < 4; i++) {
    const [x, y] = dst[i]
    const [u, v] = src[i]
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y])
    bb.push(u)
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y])
    bb.push(v)
  }
  for (let i = 0; i < 8; i++) {
    let p = i
    for (let r = i + 1; r < 8; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r
    ;[A[i], A[p]] = [A[p], A[i]]
    ;[bb[i], bb[p]] = [bb[p], bb[i]]
    for (let r = 0; r < 8; r++) {
      if (r === i) continue
      const f = A[r][i] / A[i][i]
      for (let c2 = i; c2 < 8; c2++) A[r][c2] -= f * A[i][c2]
      bb[r] -= f * bb[i]
    }
  }
  return bb.map((v, i) => v / A[i][i])
}

// Convex hull (monotone chain) and point-in-polygon test
function convexHull(points) {
  const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lower = []
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop()
    lower.push(q)
  }
  const upper = []
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop()
    upper.push(q)
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1))
}
function inHull(hull, x, y) {
  let inside = false
  for (let i = 0, j = hull.length - 1; i < hull.length; j = i++) {
    const [xi, yi] = hull[i], [xj, yj] = hull[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}
