import { useRef, useState } from 'react'
import { getProject } from '../../data/projects'
import { useTheme } from '../../theme'
import { useProjectScroll } from '../../components/project/useProjectScroll'
import { useOpticalAlign } from '../../opticalAlign'
import NextProject from '../../components/project/NextProject'
import CutoutVideo from '../../components/project/CutoutVideo'
import BalanceBoard from '../../components/project/BalanceBoard'
import ScrollGallery from '../../components/project/ScrollGallery'
import './project.css'
import './Balansir.css'

// The scroll gallery, in order (ar: width / height)
const GALLERY = [
  {
    src: '/images/balansir/hand-note.webp',
    ar: 1,
    alt: 'A hand sliding a pink note onto the end of the brass beam, which tips toward it',
  },
  {
    src: '/images/balansir/detail.webp',
    ar: 1,
    alt: 'Close-up of the needle point resting on the polished stone pivot, under the brass beam',
  },
  {
    src: '/images/balansir/swinging.webp',
    ar: 1,
    alt: 'Balansir in motion: the beam tilted, the counterweights blurred mid-swing',
  },
  {
    src: '/images/balansir/desk.webp',
    ar: 1800 / 1234,
    alt: 'Balansir on a wooden office desk with three yellow notes on its beam and two fountain pens in its stand',
  },
]

export default function Balansir() {
  const project = getProject('balansir')
  useTheme(project.colors)
  const pageRef = useRef(null)
  const titleRef = useRef(null)
  useOpticalAlign(titleRef)
  useProjectScroll(pageRef)
  // Clicking the opening plays the turn again
  const [replay, setReplay] = useState(0)

  return (
    <main className="project balansir" ref={pageRef}>
      {/* ---- Opening: the object turns to face you and settles, level ---- */}
      <section className="bz-hero" onClick={() => setReplay((n) => n + 1)}>
        <div className="bz-turn">
          <CutoutVideo
            src="/video/balansir-turn.mp4"
            fallback="/images/balansir/front.webp"
            alt="Balansir turning to face the front: a brass beam on a needle point, its stone counterweights swinging into balance"
            once
            delay={700}
            replay={replay}
          />
        </div>
        <div className="bz-hero-text">
          <h1 className="p-title p-enter" ref={titleRef}>
            {project.title}
          </h1>
          <p className="p-lede p-enter">
            A physical interpretation of balancing between work and life through gestures and movement.
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
              <dt>Context</dt>
              <dd>{project.context}</dd>
            </div>
            <div>
              <dt>Designer</dt>
              <dd>{project.team.join(', ')}</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* ---- Concept ---- */}
      <section className="p-statement">
        <p className="label-kicker" data-reveal>
          The concept
        </p>
        <p className="p-statement-text" data-reveal>
          An organizer that allows the user to externalize and prioritize everyday tasks.
        </p>
      </section>

      {/* ---- Try it yourself ---- */}
      <section className="bz-try">
        <BalanceBoard />
      </section>

      {/* ---- Materials: the parts laid out flat, the full screen, the line on it ---- */}
      <section className="bz-materials">
        <picture>
          {/* Wide screens: the photo with its wall continued to the sides */}
          <source media="(min-width: 761px)" srcSet="/images/balansir/parts-wide.webp" />
          <img
            src="/images/balansir/parts.webp"
            alt="Balansir taken apart and laid out flat: the brass beam, two stone counterweights on brass rods, a round stone pivot, and the brass stand"
            loading="lazy"
            decoding="async"
          />
        </picture>
        <p className="p-statement-text bz-materials-line" data-reveal>
          Handcrafted from brass and natural stone.
        </p>
      </section>

      {/* ---- More photos: a strip that moves sideways as you scroll ---- */}
      <ScrollGallery images={GALLERY} />

      <NextProject slug={project.slug} />
    </main>
  )
}
