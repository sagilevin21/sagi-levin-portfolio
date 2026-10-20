import { useEffect, useLayoutEffect, useState } from 'react'
import { filmDone, filmStarted } from '../intro'
import './FilmIn.css'

// The page arrives like projected film, in the spirit of the home page
// images: it rises out of the page color under fine grain, a warm tint, a
// flicker and darker corners, then settles into the clean page. Fixed
// layers over the screen, so they cover whatever the visitor first sees
// (text, photos, all of it) on any screen size; they remove themselves once
// played. Heavy setup elsewhere (3D) waits for it (whenFilmDone).
//
// Everything here is a CSS animation of opacity and position, which the
// browser runs on its own, so it stays smooth even while the new page is
// busy loading. Timings and strength live in FilmIn.css. It plays on every
// project page (ProjectPage).
const LENGTH = 950 // ms until the layers are removed (just after the longest animation)

// One tile of grain, made once: random greys around the middle, which the
// "overlay" blend turns into lighter and darker specks. Like the home page
// grain: soft specks about 1.7 screen pixels across, mixed with a larger,
// fainter layer, so it reads as clumpy film rather than digital noise.
const GRAIN_SIZE = 1.7 // screen pixels
let grainTile = null
function makeGrainTile() {
  if (grainTile) return grainTile
  const css = 220
  const px = Math.round(css * Math.min(window.devicePixelRatio || 1, 2))
  const noise = (size) => {
    const c = document.createElement('canvas')
    c.width = c.height = size
    const ctx = c.getContext('2d')
    const img = ctx.createImageData(size, size)
    for (let i = 0; i < img.data.length; i += 4) {
      img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.random() * 255
      img.data[i + 3] = 255
    }
    ctx.putImageData(img, 0, 0)
    return c
  }
  const c = document.createElement('canvas')
  c.width = c.height = px
  const ctx = c.getContext('2d')
  ctx.imageSmoothingEnabled = true
  // Scaled up smoothly, each random value becomes a soft speck
  ctx.drawImage(noise(Math.round(px / GRAIN_SIZE)), 0, 0, px, px)
  ctx.globalAlpha = 0.4
  ctx.drawImage(noise(Math.round(px / (GRAIN_SIZE * 2.4))), 0, 0, px, px)
  grainTile = { url: `url(${c.toDataURL()})`, size: `${css}px` }
  return grainTile
}

export default function FilmIn() {
  const [done, setDone] = useState(
    () => typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const [tile] = useState(() => (done ? null : makeGrainTile()))

  // Mark the page before anything else sets up
  useLayoutEffect(() => {
    if (done) return
    filmStarted()
    return filmDone
  }, [done])

  useEffect(() => {
    if (done) return
    const timer = setTimeout(() => setDone(true), LENGTH)
    return () => clearTimeout(timer)
  }, [done])

  if (done) return null
  return (
    <div className="film-in" aria-hidden="true">
      <div className="film-in-veil" />
      <div className="film-in-tint" />
      <div className="film-in-grain">
        <div style={{ backgroundImage: tile.url, backgroundSize: tile.size }} />
      </div>
      <div className="film-in-vignette" />
    </div>
  )
}
