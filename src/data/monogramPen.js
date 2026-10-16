// The route a pen would take to write the SL monogram, in the logo's own
// coordinates (viewBox 0 0 73.34 68.22): top hook → S → lower loop →
// up the diagonal → top loop → down the stem → tail.
// Each point is [x, y, thickness of the stroke there], measured from the logo
// file (where strokes merge, the thickness is estimated by hand).
const route = [
  [31.6, 5.0, 0.6], [25.99, 2.92, 2.35], [19, 1.85, 3.5], [11.97, 2.91, 4.5],
  [5.95, 6.32, 4.55], [2.54, 11.56, 4.4], [2.25, 15.49, 4.3], [4.38, 19.99, 3.85],
  [8.61, 22.98, 3.75], [13.66, 24.69, 3.5], [18.58, 25.55, 3.25], [23.88, 26.64, 3.15],
  [29.03, 29.15, 3.1], [32.95, 33.55, 2.7], [34.52, 40.97, 2.65], [33.41, 48.23, 3.1],
  [29.98, 54.86, 3.8], [24.29, 60.66, 4.3], [17.65, 64.46, 4.5], [11.99, 65.63, 5.05],
  [6.93, 64.27, 5.9], [3.41, 60.32, 6], [2.84, 56.06, 5.3], [4.93, 50.55, 3.45],
  [10.04, 45.44, 1.75], [16.74, 40.81, 1.65], [23.51, 36.27, 1.75], [29.05, 32.09, 2.4],
  [33.16, 29.79, 2.4], [38.34, 26.27, 2.35], [43, 22.4, 3.2], [45.8, 18.5, 5.5],
  [47.2, 14, 5.5], [48.89, 9.44, 4.75], [51.55, 5.54, 4.55], [54.97, 5.02, 4.75],
  [56.83, 6.46, 4.15], [57.63, 9.4, 4.05], [56.4, 13.14, 3.8], [53.62, 15.9, 3.55],
  [51, 19.3, 5], [47.4, 22.4, 6], [46.38, 26.88, 4.75], [46.33, 31.53, 4.45],
  [46.87, 37.25, 4], [48.46, 42.99, 3.35], [51.58, 48.53, 2.55], [55.99, 52.65, 1.75],
  [60.63, 54.6, 1.35], [65.37, 54.71, 1.1], [69.44, 52.93, 0.95], [72.45, 49.14, 0.75],
  [72.77, 43.6, 0.6],
]

export const penPoints = route.map(([x, y]) => [x, y])

// Extra nib width on top of the stroke's thickness, so edges are fully covered
const MARGIN = 1.2

// Where the S first passes through the crossing, the logo flares into the
// diagonal, which isn't written yet. There the pen draws a plain ink line the
// stroke's own thickness instead; the real junction appears when the diagonal
// crosses it later. (Indexes of the curves between points i → i+1.)
const PLAIN_LINE = new Set([11, 12, 13])

// Smooth curve through the points (Catmull-Rom turned into Bézier curves)
function smoothCurves(points) {
  const curves = []
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    curves.push([p1, c1, c2, p2])
  }
  return curves
}

const f = (n) => +n.toFixed(2)
const pt = (p) => `${f(p[0])},${f(p[1])}`

function curveLength([a, b, c, d], steps = 24) {
  let len = 0
  let prev = a
  for (let s = 1; s <= steps; s++) {
    const t = s / steps
    const u = 1 - t
    const p = [0, 1].map(
      (k) => u * u * u * a[k] + 3 * u * u * t * b[k] + 3 * u * t * t * c[k] + t * t * t * d[k],
    )
    len += Math.hypot(p[0] - prev[0], p[1] - prev[1])
    prev = p
  }
  return len
}

// One piece per curve: [{ d, width, ink, start, length }]
// start and length are fractions of the whole route, so the pen keeps an even speed.
export const penSegments = (() => {
  const curves = smoothCurves(penPoints)
  const segs = curves.map((curve, i) => {
    const ink = PLAIN_LINE.has(i)
    const t1 = route[i][2]
    const t2 = route[i + 1][2]
    const width = ink ? (t1 + t2) / 2 : Math.max(t1, t2) + MARGIN
    // Start each piece a hair early so neighbours overlap (no seam)
    const [p1, c1] = curve
    const dx = c1[0] - p1[0]
    const dy = c1[1] - p1[1]
    const k = i === 0 ? 0 : 0.3 / (Math.hypot(dx, dy) || 1)
    const lead = [p1[0] - dx * k, p1[1] - dy * k]
    const d = `M${pt(lead)} L${pt(p1)} C${pt(curve[1])} ${pt(curve[2])} ${pt(curve[3])}`
    return { d, width: f(width), ink, length: curveLength(curve) }
  })
  const total = segs.reduce((sum, s) => sum + s.length, 0)
  let start = 0
  return segs.map((s) => {
    const from = start / total
    const to = (start + s.length) / total
    start += s.length
    // When the pen reaches each end of the piece, following the easing curve
    const t0 = timeAt(from)
    const t1 = timeAt(to)
    return { ...s, start: t0, length: t1 - t0 }
  })
})()

// ---- Pen speed ------------------------------------------------------------
// For a share of the route (0–1), the share of the drawing time when the pen
// gets there. The curve gives a gentle start, then a long glide to a stop
// along the tail, like a pen lifting off the paper. Same numbers as a CSS
// cubic-bezier(x1, y1, x2, y2).
function timeAt(progress) {
  const [x1, y1, x2, y2] = [0.32, 0.02, 0.18, 1]
  const bez = (s, a, b) => 3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3
  let lo = 0
  let hi = 1
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (bez(mid, y1, y2) < progress) lo = mid
    else hi = mid
  }
  return bez((lo + hi) / 2, x1, x2)
}
