import { useRef, useState } from 'react'
import { getProject } from '../../data/projects'
import { useTheme } from '../../theme'
import { useProjectScroll } from '../../components/project/useProjectScroll'
import { useOpticalAlign } from '../../opticalAlign'
import NextProject from '../../components/project/NextProject'
import CanvasStack from '../../components/project/CanvasStack'
import './project.css'
import './Paintings.css'

const img = (name) => `/images/paintings/${name}.webp`

// The paintings, in order. title and year are printed on the top edge of each
// canvas (year can stay empty). ar = width / height of the photo.
const PIECES = [
  {
    src: img('sl_001'),
    ar: 2,
    title: 'Abstract',
    year: '',
    alt: 'An abstract painting in warm ochre, with swirling dark strokes and glowing glass spheres',
  },
  {
    src: img('sl_002'),
    ar: 0.78,
    title: 'Tom',
    year: '',
    alt: 'A young woman in a white dress holding a basket, seen in profile against green foliage',
  },
  {
    src: img('sl_003'),
    ar: 0.75,
    title: 'Horizon',
    year: '',
    alt: 'Sunset over the sea, waves breaking on rocks, a small boat on the horizon',
  },
  {
    src: img('sl_004'),
    ar: 1.4,
    title: 'Still life: cherries',
    year: '',
    alt: 'Still life: red and yellow cherries with a leaf on a white cloth',
  },
  {
    src: img('sl_005'),
    ar: 0.75,
    title: 'Still life: Tokaj and glass',
    year: '',
    alt: 'Still life: a bottle of white wine and a crystal glass against red and violet drapery',
  },
  {
    src: img('sl_006'),
    ar: 0.78,
    title: 'Freedom',
    year: '',
    alt: 'A woman in a red dress standing in a lake at sunset, the trees reflected in the water',
  },
]

// Gallery mode: the paintings whole, the wide ones on their own and the
// upright ones in pairs
const ROWS = [[PIECES[0]], [PIECES[1], PIECES[2]], [PIECES[3]], [PIECES[4], PIECES[5]]]

export default function Paintings() {
  const project = getProject('paintings')
  useTheme(project.colors)
  const pageRef = useRef(null)
  const titleRef = useRef(null)
  const [mode, setMode] = useState('canvas')
  useOpticalAlign(titleRef)
  useProjectScroll(pageRef)

  return (
    <main className="project paintings" ref={pageRef}>
      <section className="p-hero">
        <div className="p-hero-media">
          <img src={img('sl_001')} alt="" decoding="async" fetchPriority="high" />
        </div>
        <div className="p-hero-text">
          <h1 className="p-title p-enter" ref={titleRef}>
            {project.title}
          </h1>
          <p className="p-lede p-enter">A collection of oil paintings done over the years.</p>
          <dl className="p-meta p-enter">
            <div>
              <dt>Field</dt>
              <dd>{project.discipline}</dd>
            </div>
            <div>
              <dt>Artist</dt>
              <dd>{project.team.join(', ')}</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* ---- How to view them: flipping through the canvases, or all at once ---- */}
      <div className="pt-toggle" role="group" aria-label="View">
        <button type="button" aria-pressed={mode === 'canvas'} onClick={() => setMode('canvas')}>
          Canvases
        </button>
        <button type="button" aria-pressed={mode === 'gallery'} onClick={() => setMode('gallery')}>
          Gallery
        </button>
      </div>

      {mode === 'canvas' ? (
        <CanvasStack pieces={PIECES} />
      ) : (
        <section className="pt-gallery">
          {ROWS.map((row, i) => (
            <div key={i} className={`pt-row ${row.length === 1 ? 'is-single' : ''}`}>
              {row.map((p, j) => (
                <figure key={p.src} className="pt-piece" style={{ animationDelay: `${(i * 2 + j) * 90}ms` }}>
                  <img src={p.src} alt={p.alt} loading="lazy" decoding="async" />
                  <figcaption>
                    {p.title}
                    {p.year && <span>{p.year}</span>}
                  </figcaption>
                </figure>
              ))}
            </div>
          ))}
        </section>
      )}

      <NextProject slug={project.slug} />
    </main>
  )
}
