import { useRef } from 'react'
import { getProject } from '../../data/projects'
import { useTheme } from '../../theme'
import { useProjectScroll } from '../../components/project/useProjectScroll'
import { useOpticalAlign } from '../../opticalAlign'
import BlockBoard from '../../components/project/BlockBoard'
import NextProject from '../../components/project/NextProject'
import ShirtZoom from '../../components/project/ShirtZoom'
import './project.css'
import './Facets.css'

// Page colors while the shirt scene is on screen: the color of the shirt
const DARK = { bg: '#0e0d0d', ink: '#ece7df' }

const PRINT = {
  src: '/images/facets/shirt-print.webp',
  alt: 'The shirt print: nine block compositions in teal, grey and white, signed facets 07\\26 and PYNK',
}

// The same mockup framed wide (screens) and tall (phones). quad: the print's
// corners on each photo (top-left, top-right, bottom-right, bottom-left as
// x, y shares of its width/height), found by matching the print file
// against the photo pixel by pixel
const MOCKUPS = [
  {
    src: '/images/facets/shirt-mockup-wide.webp',
    ratio: 1672 / 941,
    quad: [0.4161, 0.3569, 0.5897, 0.3569, 0.5865, 0.7004, 0.4205, 0.7001],
  },
  {
    src: '/images/facets/shirt-mockup.webp',
    ratio: 1728 / 2444,
    quad: [0.2978, 0.3357, 0.7107, 0.3354, 0.703, 0.6738, 0.3062, 0.6745],
  },
]

// Work in progress: opening, the concept, the block board, the kit and the
// personalized print. More sections may come.
export default function Facets() {
  const project = getProject('facets')
  useTheme(project.colors)
  const pageRef = useRef(null)
  const titleRef = useRef(null)
  useOpticalAlign(titleRef)
  useProjectScroll(pageRef)

  return (
    <main className="project facets" ref={pageRef}>
      <section className="f-hero">
        <h1 className="p-title p-enter" ref={titleRef}>
          {project.title}
        </h1>
        <p className="p-lede p-enter">
          <em className="f-quote">&ldquo;things to think with&rdquo;</em> a tactile and expressive experience for
          men&rsquo;s circles
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
            <dt>Designers</dt>
            <dd>{project.team.join(', ')}</dd>
          </div>
        </dl>
      </section>

      <section className="p-statement">
        <p className="label-kicker" data-reveal>
          The concept
        </p>
        <p className="p-statement-text f-concept" data-reveal>
          A system that encourages men to explore and express themselves emotionally and aesthetically, fostering a
          broader culture of openness, connection, and safe masculinity.
        </p>
      </section>

      <section className="f-board">
        <BlockBoard />
      </section>

      {/* ---- The kit: the open tray, a finished composition beside it, and
          how the activity works, set in the photo's white space ---- */}
      <section className="f-kit">
        <figure className="f-kit-photo">
          <img
            data-speed="0.06"
            src="/images/facets/111.webp"
            alt="The Facets box open with its blocks in a foam tray, beside a finished composition in the acrylic frame"
            loading="lazy"
            decoding="async"
          />
        </figure>
        <p className="f-kit-text" data-reveal>
          Different colors, shapes, textures, and weights invite participants to express their feelings by arranging
          physical objects within a 2D format. Each composition is documented and eventually transformed into a
          graphic souvenir. This visual language becomes a code in everyday life, expanding a network of trust and
          signaling safety to others.
        </p>
      </section>

      {/* ---- The shirt: the print alone, then the view pulls back to the shirt ---- */}
      <ShirtZoom
        print={PRINT}
        mockups={MOCKUPS}
        alt="Someone wearing the black PYNK shirt in an empty brick hall, seen from the back, the Facets print across it"
        light={project.colors}
        dark={DARK}
      >
        <p className="label-kicker">The personalized print</p>
        <p className="shirt-line">
          A unique pattern combining compositions from each session, printed on the back of a PYNK shirt.
        </p>
      </ShirtZoom>

      <NextProject slug={project.slug} />
    </main>
  )
}
