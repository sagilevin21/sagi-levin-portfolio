import { useRef } from 'react'
import { getProject } from '../../data/projects'
import { useTheme } from '../../theme'
import { useProjectScroll } from '../../components/project/useProjectScroll'
import { useOpticalAlign } from '../../opticalAlign'
import NextProject from '../../components/project/NextProject'
import SpotlightPhoto from '../../components/project/SpotlightPhoto'
import './project.css'
import './ShatteredForm.css'

const img = (name) => `/images/shattered-form/${name}.webp`

export default function ShatteredForm() {
  const project = getProject('shattered-form')
  useTheme(project.colors)
  const pageRef = useRef(null)
  const titleRef = useRef(null)
  useOpticalAlign(titleRef)
  useProjectScroll(pageRef)

  return (
    <main className="project shattered" ref={pageRef}>
      <section className="p-hero">
        <div className="p-hero-media">
          <img
            src={img('hero')}
            alt="A broken blue willow cup, its missing side replaced by a stiffened net"
            decoding="async"
            fetchPriority="high"
          />
        </div>
        <div className="p-hero-text">
          <h1 className="p-title p-enter" ref={titleRef}>
            {project.title}
          </h1>
          <p className="p-lede p-enter">A study of material through the subject of broken pottery.</p>
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
        </div>
      </section>

      {/* ---- In the dark: a spotlight you hold reveals the pieces and their shadows ---- */}
      <section className="sf-spot">
        <SpotlightPhoto
          src={img('spotlight')}
          alt="Three repaired cups in a dark room, lit from behind, throwing large shadows on the wall"
          rest={{ x: 0.5, y: 0.6 }}
        />
      </section>

      {/* ---- Concept ---- */}
      <section className="p-statement">
        <p className="label-kicker" data-reveal>
          The concept
        </p>
        <p className="p-statement-text sf-concept" data-reveal>
          Using the nets as bandages, breaking and repairing pottery, the work talks about fragility, loss,
          repair, hope and imperfection.
        </p>
      </section>

      {/* ---- Work process: fitting the net to the form, a stiffened sample, and the story ---- */}
      <section className="sf-study">
        {/* Side by side, the same height */}
        <div className="sf-row">
          <figure className="sf-step is-coat" data-reveal>
            <div className="sf-photo">
              <img src={img('15-copy')} alt="Hands pressing glossy, clear bio-plastic into the net" loading="lazy" decoding="async" />
            </div>
            <figcaption>Fit the form</figcaption>
          </figure>

          <figure className="sf-step is-net" data-reveal>
            <div className="sf-photo">
              <img src={img('ccccc')} alt="A stiffened net sample on its own, wavy and firm, in deep green" loading="lazy" decoding="async" />
            </div>
            <figcaption>Stiffened net sample</figcaption>
          </figure>
        </div>

        <div className="sf-study-text" data-reveal>
          <p className="label-kicker">Work process</p>
          <p className="p-body">
            Working with broken pottery led us to explore the relationship between materials and the act of repair.
            Using nets to hold the fragments together, the process required patience, care, and a gentle touch,
            giving the project a deeper meaning of healing and restoration after loss.
          </p>
        </div>
      </section>

      {/* ---- The pieces: two finished cups, each half the screen ---- */}
      <section className="sf-pieces">
        <figure className="sf-piece">
          <img src={img('17-copy')} alt="A blue willow cup, one side rebuilt as a stiff white net" loading="lazy" decoding="async" />
        </figure>
        <figure className="sf-piece is-red">
          <img src={img('16-copy')} alt="A white cup with red dots, its broken side bandaged by a net" loading="lazy" decoding="async" />
        </figure>
      </section>

      <NextProject slug={project.slug} />
    </main>
  )
}
