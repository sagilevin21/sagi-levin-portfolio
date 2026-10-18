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

// box: where the print sits on the mockup photo (shares of its width/height)
const MOCKUP = {
  src: '/images/facets/shirt-mockup.webp',
  alt: 'Someone wearing the black PYNK shirt, seen from the back, the Facets print across it',
  ratio: 1728 / 2444,
  box: { x: 0.2988, y: 0.3404, w: 0.411, h: 0.3335 },
}

// Work in progress: opening, the activity, the block board, the kit and the
// shirt. More sections may come.
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
          A set of blocks to think with: an activity for men&rsquo;s circles, made for the fictional brand PYNK.
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
          The activity
        </p>
        <p className="p-statement-text" data-reveal>
          The different colors, shapes, textures and weight prompt the participant to project his feelings through
          the blocks, and arrange them within a set 2D format.
        </p>
      </section>

      <section className="f-board">
        <BlockBoard />
      </section>

      {/* ---- The kit: the open tray, and a finished composition beside it ---- */}
      <figure className="f-kit">
        <img
          data-speed="0.06"
          src="/images/facets/111.webp"
          alt="The Facets box open with its blocks in a foam tray, beside a finished composition in the acrylic frame"
          loading="lazy"
          decoding="async"
        />
      </figure>

      {/* ---- The shirt: the print alone, then the view pulls back to the shirt ---- */}
      <ShirtZoom print={PRINT} mockup={MOCKUP} light={project.colors} dark={DARK}>
        <p className="label-kicker">The shirt</p>
        <p className="shirt-line">Nine block compositions, printed on the back of a PYNK shirt.</p>
      </ShirtZoom>

      <NextProject slug={project.slug} />
    </main>
  )
}
