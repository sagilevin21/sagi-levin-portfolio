// Usage: node scripts/plant-in-scene.mjs <scene.png> <rock.png> <out.webp> [cx=0.52] [width=0.19] [ground=0.835]
// Draws a blueprint-style object into the blueprint scene so it looks native:
// cut out (enclosed openings see-through), recoloured to the scene's blue,
// lines softened to the scene's weight, base sunk into the sand, soft shadow.
import { createRequire } from 'node:module'
const sharp = createRequire(import.meta.url)('sharp')
const [scenePath, rockPath, out, cxArg, wArg, gArg] = process.argv.slice(2)
const CX = +(cxArg ?? 0.52), WIDTH = +(wArg ?? 0.19), GROUND = +(gArg ?? 0.835)

const scene = await sharp(scenePath).removeAlpha().raw().toBuffer({ resolveWithObject: true })
const SW = scene.info.width, SH = scene.info.height
const rw = Math.round(SW * WIDTH)
const rock = await sharp(rockPath).resize({ width: rw }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
const { width: w, height: h } = rock.info
const d = rock.data

// Background colour of the drawing (corners)
const px = (x, y) => [0, 1, 2].map((k) => d[(y * w + x) * 3 + k])
const corners = [px(2, 2), px(w - 3, 2), px(2, h - 3), px(w - 3, h - 3)]
const bg = [0, 1, 2].map((k) => corners.reduce((a, c) => a + c[k], 0) / 4)
const isBgCol = (i) => Math.hypot(d[i * 3] - bg[0], d[i * 3 + 1] - bg[1], d[i * 3 + 2] - bg[2]) < 30

// Label every connected background-coloured area; the one touching the border
// is outside, big enclosed ones are openings (the tunnel), small ones are texture
const label = new Int32Array(w * h).fill(-1)
const sizes = []
const touches = []
const cents = []
for (let s = 0; s < w * h; s++) {
  if (label[s] !== -1 || !isBgCol(s)) continue
  const id = sizes.length
  let size = 0, edge = false, cxs = 0, cys = 0
  const st = [s]
  label[s] = id
  while (st.length) {
    const i = st.pop()
    size++
    const x = i % w, y = (i / w) | 0
    cxs += x
    cys += y
    if (x === 0 || y === 0 || x === w - 1 || y === h - 1) edge = true
    for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1])
      if (j >= 0 && label[j] === -1 && isBgCol(j)) {
        label[j] = id
        st.push(j)
      }
  }
  sizes.push(size)
  touches.push(edge)
  cents.push([cxs / size, cys / size])
}
// The drawing's body is filled with the same blue as its background, so
// enclosed blue areas are mostly body. The see-through tunnel is the largest
// enclosed area near the middle.
let hole = -1
sizes.forEach((sz, id) => {
  if (touches[id]) return
  const [cx, cy] = cents[id]
  if (Math.abs(cx / w - 0.5) > 0.2 || Math.abs(cy / h - 0.5) > 0.2) return
  if (hole === -1 || sz > sizes[hole]) hole = id
})
const open = new Uint8Array(w * h)
for (let i = 0; i < w * h; i++) {
  const id = label[i]
  if (id >= 0 && (touches[id] || id === hole)) open[i] = 1
}
const openings = hole === -1 ? 0 : 1
// The far opening of the tunnel, as drawn (an oval near the middle of the image)
const inTunnel = (x, y) => label[y * w + x] === hole && ((x / w - 0.537) / 0.085) ** 2 + ((y / h - 0.495) / 0.135) ** 2 < 1
// Close gaps in the outline: the stone is roughly round, so fill each row
// solidly between its outermost drawn pixels (except the tunnel itself)
for (let y = 0; y < h; y++) {
  let l = -1, r = -1
  for (let x = 0; x < w; x++) if (!open[y * w + x]) { if (l === -1) l = x; r = x }
  if (l === -1) continue
  for (let x = l; x <= r; x++) if (!inTunnel(x, y)) open[y * w + x] = 0
}

// Object extent, to know where its base is
let top = h, bottom = 0
for (let i = 0; i < w * h; i++) if (!open[i]) {
  const y = (i / w) | 0
  if (y < top) top = y
  if (y > bottom) bottom = y
}
const objH = bottom - top
const left = Math.round(SW * CX - w / 2)
const sinkBy = objH * 0.07 // how far the base sits into the sand
const topY = Math.round(SH * GROUND - (bottom - sinkBy))

// Alpha: solid body, feathered edge, base fading into the sand
let alpha = Buffer.alloc(w * h)
for (let i = 0; i < w * h; i++) alpha[i] = open[i] ? 0 : 255
alpha = await sharp(alpha, { raw: { width: w, height: h, channels: 1 } }).blur(0.9).extractChannel(0).raw().toBuffer()
// Solid down to the sand line; below it the base is hidden in the sand,
// with a short soft transition right at the line
const groundRow = bottom - sinkBy
for (let y = 0; y < h; y++) {
  const t = (groundRow + sinkBy * 0.35 - y) / (sinkBy * 0.7) // 1 above the line, 0 below
  const k = Math.max(0, Math.min(1, t))
  const ease = k * k * (3 - 2 * k)
  for (let x = 0; x < w; x++) alpha[y * w + x] *= ease
}

// Scene colour right behind the object (for recolouring)
const sceneAt = (x, y) => {
  const sx = Math.max(0, Math.min(SW - 1, x)), sy = Math.max(0, Math.min(SH - 1, y))
  return [0, 1, 2].map((k) => scene.data[(sy * SW + sx) * 3 + k])
}
const behind = sceneAt(left - 20, Math.round(SH * GROUND - objH * 0.5))
const LINE = 0.9 // scene lines are a little dimmer than the drawing's
const out4 = Buffer.alloc(SW * SH * 3)
scene.data.copy(out4)

// Soft contact shadow on the sand, under the base
const shCx = SW * CX, shCy = SH * GROUND + objH * 0.015, shRx = w * 0.5, shRy = objH * 0.07
for (let y = Math.floor(shCy - shRy * 2); y < shCy + shRy * 2; y++)
  for (let x = Math.floor(shCx - shRx * 1.3); x < shCx + shRx * 1.3; x++) {
    if (x < 0 || y < 0 || x >= SW || y >= SH) continue
    const dd = ((x - shCx) / shRx) ** 2 + ((y - shCy) / shRy) ** 2
    const k = Math.max(0, 1 - dd) ** 1.6 * 0.32
    for (let c = 0; c < 3; c++) out4[(y * SW + x) * 3 + c] *= 1 - k
  }

for (let y = 0; y < h; y++)
  for (let x = 0; x < w; x++) {
    const i = y * w + x
    const a = alpha[i] / 255
    if (!a) continue
    const sx = left + x, sy = topY + y
    if (sx < 0 || sy < 0 || sx >= SW || sy >= SH) continue
    // How "line" a pixel is: its brightness above the drawing's blue
    const r = d[i * 3], g = d[i * 3 + 1], b = d[i * 3 + 2]
    const lift = Math.max(0, Math.min(1, ((r + g + b) / 3 - (bg[0] + bg[1] + bg[2]) / 3) / (255 - (bg[0] + bg[1] + bg[2]) / 3)))
    // Body takes the scene's blue (slightly darker, it's solid), lines go toward white
    const body = behind.map((v) => v * 0.93)
    const col = body.map((v) => v + (238 - v) * lift * LINE)
    const o = (sy * SW + sx) * 3
    for (let c = 0; c < 3; c++) out4[o + c] = out4[o + c] * (1 - a) + col[c] * a
  }
await sharp(out4, { raw: { width: SW, height: SH, channels: 3 } }).webp({ quality: 86 }).toFile(out)
console.log(`placed ${w}x${h} at ${left},${topY}; openings made see-through: ${openings}`)
