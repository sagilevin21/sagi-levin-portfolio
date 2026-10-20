import { useRef } from 'react'
import { getProject } from '../../data/projects'
import { useTheme } from '../../theme'
import { useProjectScroll } from '../../components/project/useProjectScroll'
import { useOpticalAlign } from '../../opticalAlign'
import NextProject from '../../components/project/NextProject'
import ScrollSequence from '../../components/project/ScrollSequence'
import './project.css'
import './Ritual.css'

const img = (name) => `/images/ritual/${name}.webp`

// What's in the kit
const TOOLS = [
  { name: 'Jigger', note: "Based on the 'greedy cup' design" },
  { name: 'Brass swizzle stick' },
  { name: 'Peeler', note: 'For the orange garnish' },
  { name: 'Essential oil spray', note: "For when I'm out of oranges" },
  { name: 'Tray' },
]

// The ritual, step by step, then the five pieces and the tray they live on.
// bg: the color at the photo's edges, so it melts into the screen around it
const STEPS = [
  { src: img('pour-copy'), bg: '#dfdbdb', label: 'Pour', alt: 'Pouring a Negroni through the ceramic Pythagorean jigger into the crystal glass' },
  { src: img('stir-copy'), bg: '#e1dfdf', label: 'Stir', alt: 'Stirring the drink with the brass swizzle stick' },
  { src: img('garnish-copy'), bg: '#d9d4d3', label: 'Garnish', alt: 'The finished Negroni with an orange peel, beside the spray and the peeler' },
  { src: img('r-cup'), bg: '#edeef0', label: 'Jigger', alt: "The ceramic jigger on its own, based on the 'greedy cup'" },
  { src: img('r-swizzle'), bg: '#d6d6d6', label: 'Swizzle', alt: 'The brass swizzle stick with its hammered spoon end' },
  { src: img('r-peeler'), bg: '#dbd9d9', label: 'Peeler', alt: 'The peeler: a brass head on a dark walnut handle' },
  { src: img('r-spray'), bg: '#c8c6c6', label: 'Spray', alt: 'The red glass spray bottle for the orange essential oil' },
  { src: img('r-tray'), bg: '#ececee', label: 'Tray', alt: 'The walnut tray holding the whole kit, with a slot for a phone playing music' },
]

export default function Ritual() {
  const project = getProject('ritual')
  useTheme(project.colors)
  const pageRef = useRef(null)
  const titleRef = useRef(null)
  useOpticalAlign(titleRef)
  useProjectScroll(pageRef)

  return (
    <main className="project ritual" ref={pageRef}>
      <section className="p-hero">
        <div className="p-hero-media">
          <img
            src={img('hero')}
            alt="A Negroni with an orange peel in a cut crystal glass, against black"
            decoding="async"
            fetchPriority="high"
          />
        </div>
        <div className="p-hero-text">
          <h1 className="p-title p-enter" ref={titleRef}>
            {project.title}
          </h1>
          <p className="p-lede p-enter">
            Negroni kit: five items for a personal ritual of making a cocktail for yourself when you&rsquo;re home
            alone.
          </p>
          <dl className="p-meta p-enter">
            <div>
              <dt>Field</dt>
              <dd>{project.discipline}</dd>
            </div>
            <div>
              <dt>Year</dt>
              <dd>{project.year}</dd>
            </div>
            <div>
              <dt>Duration</dt>
              <dd>{project.duration}</dd>
            </div>
            <div>
              <dt>Designer</dt>
              <dd>{project.team.join(', ')}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="p-statement">
        <p className="label-kicker" data-reveal>
          The concept
        </p>
        <p className="p-statement-text r-concept" data-reveal>
          Personal ritual
          <br />
          Negroni-making tool kit
        </p>
        <p className="p-body r-concept-body" data-reveal>
          My go-to cocktail is a Negroni, so I created a kit that would feel luxurious and serve me in this ritual. I
          have a preferred glass, which is included in the design, and I usually enjoy listening to music while
          preparing the drink.
        </p>

        {/* The kit, numbered like the project list on the Home page */}
        <ol className="r-tools" data-reveal>
          {TOOLS.map((t, i) => (
            <li key={t.name}>
              <span className="r-tool-num">{String(i + 1).padStart(2, '0')}</span>
              <span className="r-tool-name">{t.name}</span>
              {t.note && <span className="r-tool-note">{t.note}</span>}
            </li>
          ))}
        </ol>
      </section>

      {/* ---- The ritual, scrolled through one step at a time ---- */}
      <ScrollSequence steps={STEPS} />

      <NextProject slug={project.slug} />
    </main>
  )
}
