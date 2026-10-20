import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { projects } from '../data/projects'
import { idleColors } from '../data/site'
import { useTheme } from '../theme'
import './Work.css'

// All work: every project as a small picture, scattered across the page like
// prints laid out on a table. Pointing at one brings it forward, larger, and
// the others fade back; clicking opens it. On touch screens they line up in a
// loose column, and the one in the middle of the screen is the active one.
//
// Thumbnails come from public/images/thumbs/<slug>.webp (npm run thumbs).

// Where each picture lies (all in vw, so the layout keeps its shape at any
// width): left, top and width. More projects than spots start the pattern
// again further down.
const SPOTS = [
  { x: 7, y: 4, w: 24 },
  { x: 41, y: 0, w: 17 },
  { x: 66, y: 9, w: 25 },
  { x: 12, y: 34, w: 16 },
  { x: 36, y: 28, w: 27 },
  { x: 74, y: 40, w: 15 },
]
const PATTERN_HEIGHT = 66 // vw, the height of one round of SPOTS

// Featured projects in their Home page order, then the rest
const ordered = [...projects].sort((a, b) => (b.featured - a.featured) || a.order - b.order)
const pad = (n) => String(n).padStart(2, '0')

// Each project's field shows in its own highlight color (as on the Home
// page), darkened just enough to read on the page's light background.
// Near-white or grey highlights use the project's accent instead.
const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const luminance = (rgb) => {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
function readableField(colors, bg) {
  let hex = colors.field ?? colors.accent
  let rgb = hexToRgb(hex)
  if (Math.max(...rgb) - Math.min(...rgb) < 30) rgb = hexToRgb((hex = colors.accent))
  const back = hexToRgb(bg)
  for (let i = 0; i < 40 && contrast(rgb, back) < 4.5; i++) rgb = rgb.map((v) => v * 0.93)
  return `rgb(${rgb.map(Math.round).join(',')})`
}

export default function Work() {
  const [activeSlug, setActiveSlug] = useState(null)
  const active = ordered.find((p) => p.slug === activeSlug)
  const listRef = useRef(null)
  useTheme(idleColors)

  // Touch screens: the picture in the middle of the screen is the active one
  useEffect(() => {
    if (!window.matchMedia('(hover: none)').matches) return
    const items = listRef.current.querySelectorAll('[data-slug]')
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          const slug = e.target.dataset.slug
          if (e.isIntersecting) setActiveSlug(slug)
          else setActiveSlug((cur) => (cur === slug ? null : cur))
        }),
      { rootMargin: '-45% 0px -45% 0px' },
    )
    items.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  const rounds = Math.ceil(ordered.length / SPOTS.length)
  return (
    <main className={`work ${active ? 'has-active' : ''}`}>
      <h1 className="work-title">
        All work <sup>{pad(ordered.length)}</sup>
      </h1>

      <ol
        className="work-table"
        ref={listRef}
        style={{ '--table-h': `${rounds * PATTERN_HEIGHT}vw` }}
        onMouseLeave={() => setActiveSlug(null)}
      >
        {ordered.map((p, i) => {
          const s = SPOTS[i % SPOTS.length]
          const round = Math.floor(i / SPOTS.length)
          return (
            <li
              key={p.slug}
              className={`work-item ${p.slug === activeSlug ? 'is-active' : ''}`}
              style={{
                '--x': `${s.x}vw`,
                '--y': `${s.y + round * PATTERN_HEIGHT}vw`,
                '--w': `${s.w}vw`,
                '--i': i,
                '--field': readableField(p.colors, idleColors.bg),
              }}
            >
              <Link
                to={`/projects/${p.slug}`}
                data-slug={p.slug}
                onMouseEnter={() => setActiveSlug(p.slug)}
                onFocus={() => setActiveSlug(p.slug)}
                onBlur={() => setActiveSlug(null)}
              >
                <span className="work-pic">
                  <img src={`/images/thumbs/${p.slug}.webp`} alt="" loading={i < 6 ? 'eager' : 'lazy'} decoding="async" />
                </span>
                <span className="work-cap">
                  <span className="work-name">{p.title}</span>
                  <span className="work-field">{p.field}</span>
                </span>
              </Link>
            </li>
          )
        })}
      </ol>
    </main>
  )
}
