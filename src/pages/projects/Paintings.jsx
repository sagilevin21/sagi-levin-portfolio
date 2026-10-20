import { useRef } from 'react'
import { getProject } from '../../data/projects'
import { useTheme } from '../../theme'
import { useProjectScroll } from '../../components/project/useProjectScroll'
import { useOpticalAlign } from '../../opticalAlign'
import NextProject from '../../components/project/NextProject'
import './project.css'
import './Paintings.css'

const img = (name) => `/images/paintings/${name}.webp`

// The paintings, shown whole (never cropped), in pairs with the landscape
// one on its own between them
const ROWS = [
  [
    { src: img('sl_002'), alt: 'A young woman in a white dress holding a basket, seen in profile against green foliage' },
    { src: img('sl_003'), alt: 'Sunset over the sea, waves breaking on rocks, a small boat on the horizon' },
  ],
  [{ src: img('sl_004'), alt: 'Still life: red and yellow cherries with a leaf on a white cloth' }],
  [
    { src: img('sl_005'), alt: 'Still life: a bottle of white wine and a crystal glass against red and violet drapery' },
    { src: img('sl_006'), alt: 'A woman in a red dress standing in a lake at sunset, the trees reflected in the water' },
  ],
]

export default function Paintings() {
  const project = getProject('paintings')
  useTheme(project.colors)
  const pageRef = useRef(null)
  const titleRef = useRef(null)
  useOpticalAlign(titleRef)
  useProjectScroll(pageRef)

  return (
    <main className="project paintings" ref={pageRef}>
      <section className="p-hero">
        <div className="p-hero-media">
          <img
            src={img('sl_001')}
            alt="An abstract painting in warm ochre, with swirling dark strokes and glowing glass spheres"
            decoding="async"
            fetchPriority="high"
          />
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

      {/* ---- The paintings ---- */}
      <section className="pt-gallery">
        {ROWS.map((row, i) => (
          <div key={i} className={`pt-row ${row.length === 1 ? 'is-single' : ''}`}>
            {row.map((p, j) => (
              <figure key={p.src} className="pt-piece" data-reveal style={{ transitionDelay: `${j * 120}ms` }}>
                <img src={p.src} alt={p.alt} loading="lazy" decoding="async" />
              </figure>
            ))}
          </div>
        ))}
      </section>

      <NextProject slug={project.slug} />
    </main>
  )
}
