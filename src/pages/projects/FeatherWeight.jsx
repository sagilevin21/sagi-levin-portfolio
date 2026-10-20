import { useRef } from 'react'
import { getProject } from '../../data/projects'
import { useTheme } from '../../theme'
import { useProjectScroll } from '../../components/project/useProjectScroll'
import { useOpticalAlign } from '../../opticalAlign'
import NextProject from '../../components/project/NextProject'
import CutoutVideo from '../../components/project/CutoutVideo'
import './project.css'
import './FeatherWeight.css'

// Work in progress: opening, concept, the piece worn and its two parts up
// close. More sections may come.
export default function FeatherWeight() {
  const project = getProject('feather-weight')
  useTheme(project.colors)
  const pageRef = useRef(null)
  const titleRef = useRef(null)
  useOpticalAlign(titleRef)
  useProjectScroll(pageRef)

  return (
    <main className="project feather" ref={pageRef}>
      {/* ---- Opening: the brass heart hangs from the top of the page, turning ---- */}
      <section className="fw-hero">
        <div className="fw-hang">
          <CutoutVideo
            src="/video/feather-heart.mp4"
            fallback="/images/feather-weight/hero.webp"
            alt="The airy brass heart, hanging from its chain, slowly turning"
            speed={0.7}
            className="fw-heart"
          />
        </div>
        {/* The lapis feathers on their own chain, hanging beside the heart */}
        <img
          className="fw-feathers"
          src="/images/feather-weight/feather-chain.webp"
          alt="Two carved lapis lazuli feathers hanging from brass rings on a long chain"
          decoding="async"
        />
        <div className="fw-hero-text">
          <h1 className="p-title p-enter" ref={titleRef}>
            {project.title}
          </h1>
          <p className="p-lede p-enter">A conceptual piece of jewelry dealing with balance through material, culture and legend.</p>
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

      {/* ---- Concept ---- */}
      <section className="p-statement">
        <p className="label-kicker" data-reveal>
          The concept
        </p>
        <p className="p-statement-text fw-concept" data-reveal>
          Feather Weight refers to the ancient Egyptian myth of the heart weighed against a feather after death.
        </p>
        <p className="p-body fw-concept-body" data-reveal>
          Solid, carved stone feathers and an airy brass heart contrast, raising questions of goodness, purity and
          self-judgement.
        </p>
      </section>

      {/* ---- Worn: the editorial portrait, cropped onto the piece ---- */}
      <figure className="fw-editorial" data-reveal>
        <img
          src="/images/feather-weight/editorial.webp"
          alt="The necklace worn with a navy tulle gown: the brass heart at the chest, the lapis feather hanging below"
          loading="lazy"
          decoding="async"
        />
      </figure>

      {/* ---- The two parts, up close ---- */}
      <section className="fw-details">
        <figure className="fw-detail is-heart" data-reveal>
          <img
            src="/images/feather-weight/detail-heart.webp"
            alt="The brass heart held in an open hand, its chain running up between the fingers"
            loading="lazy"
            decoding="async"
          />
          <figcaption>The brass heart</figcaption>
        </figure>
        <figure className="fw-detail is-feathers" data-reveal>
          <img
            src="/images/feather-weight/detail-feathers.webp"
            alt="Two carved lapis lazuli feathers bound with brass wire to a ring on the chain"
            loading="lazy"
            decoding="async"
          />
          <figcaption>The carved lapis lazuli feathers</figcaption>
        </figure>
      </section>

      <NextProject slug={project.slug} />
    </main>
  )
}
