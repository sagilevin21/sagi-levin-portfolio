import { useCallback, useEffect, useRef, useState } from 'react'
import { getProject } from '../../data/projects'
import { useTheme } from '../../theme'
import { mixColors, useProjectScroll } from '../../components/project/useProjectScroll'
import WaterLight from '../../components/project/WaterLight'
import Aquarium from '../../components/project/Aquarium'
import NextProject from '../../components/project/NextProject'
import { useOpticalAlign } from '../../opticalAlign'
import './project.css'
import './Gillbot.css'

const img = (name) => `/images/gillbot/${name}.webp`

// The page gets darker as you scroll down, like sinking deeper into the tank
const DEPTH = ['#0e4862', '#0b3a52', '#07263a', '#04161f']

// Numbered points on the product photo (x / y in % of the image)
// side: which side of the photo the label sits on
const PARTS = [
  { name: 'Interactive robot', x: 55, y: 9, side: 'right' },
  { name: 'Sensor housing', x: 47, y: 69, side: 'left' },
  { name: 'Docking unit', x: 79, y: 41, side: 'right' },
]

// Status light colors and what they mean
const LIGHTS = [
  { name: 'Alert', color: '#ff3d3d', photo: 'status-alert' },
  { name: 'Charging', color: '#3aa8ff', photo: 'status-charging' },
  { name: 'Idle', color: '#ffffff', photo: 'status-idle' },
  { name: 'Fully charged', color: '#3dff8f', photo: 'status-charged' },
]

export default function Gillbot() {
  const project = getProject('gillbot')
  useTheme(project.colors)

  const pageRef = useRef(null)
  const titleRef = useRef(null)
  useOpticalAlign(titleRef) // big title's first letter lines up with the text below
  const surfaceRef = useRef(1) // water light strength: full at the surface
  const onProgress = useCallback((p) => {
    document.documentElement.style.setProperty('--bg', mixColors(DEPTH, p))
    surfaceRef.current = 1 - p * 3
  }, [])
  useProjectScroll(pageRef, onProgress)

  return (
    <main className="project gillbot" ref={pageRef}>
      <WaterLight strengthRef={surfaceRef} />

      {/* ---- Opening ---- */}
      <section className="p-hero">
        <div className="p-hero-media">
          <img
            src={img('underwater-two-fish')}
            alt="The Gillbot robot swimming underwater beside two fish"
            decoding="async"
            fetchPriority="high"
          />
        </div>
        <div className="p-hero-text">
          <h1 className="p-title p-enter" ref={titleRef}>
            {project.title}
          </h1>
          <p className="p-lede p-enter">A smart system to interact with your fish and monitor the aquarium.</p>
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

      {/* ---- Concept ---- */}
      <section className="p-statement">
        <p className="label-kicker" data-reveal>
          Concept
        </p>
        <p className="p-statement-text" data-reveal>
          To improve quality of life for pet fish, by strengthening the bond between the fish and the owner.
        </p>
      </section>

      {/* ---- You're the fish: an aquarium to steer the robot around ---- */}
      <section className="g-swim">
        <Aquarium robotSrc={img('robot-cutout')} robotModel="/models/gillbot.glb" scene={img('bp-scene')} />
      </section>

      {/* ---- The system ---- */}
      <section className="p-split">
        <div className="p-split-text">
          <p className="label-kicker" data-reveal>
            The system
          </p>
          <p className="p-body" data-reveal>
            The system features an interactive robot and a docking unit that doubles as housing for monitoring
            sensors that track water quality, all controlled by app interface.
          </p>
          {/* Shown on phones, where the labels beside the photo are numbers only */}
          <ol className="g-parts" data-reveal>
            {PARTS.map((part, i) => (
              <li key={part.name}>
                <span className="g-marker">{i + 1}</span>
                {part.name}
              </li>
            ))}
          </ol>
        </div>
        <figure className="g-anatomy" data-reveal>
          <div className="g-anatomy-frame">
          <img src={img('cut-robot-on-dock')} alt="The Gillbot robot resting on its docking unit" loading="lazy" decoding="async" />
          {/* Labels beside the product, each with a thin line to its part */}
          {PARTS.map((part, i) => (
            <span
              key={part.name}
              className={`g-callout is-${part.side}`}
              style={part.side === 'right' ? { left: `${part.x}%`, top: `${part.y}%` } : { right: `${100 - part.x}%`, top: `${part.y}%` }}
            >
              <span className="g-callout-dot" />
              <span className="g-callout-line" />
              <span className="g-callout-label">
                <span className="g-marker">{i + 1}</span>
                <span className="g-callout-name">{part.name}</span>
              </span>
            </span>
          ))}
          </div>
        </figure>
      </section>

      {/* ---- Design: one close-up, toned to the page's blues ---- */}
      <section className="g-design">
        <img
          className="g-design-photo"
          data-speed="0.05"
          src={img('closeup-blue')}
          alt="Close-up inside the dock: stone-like shell and blue glazed interior"
          loading="lazy"
          decoding="async"
        />
        <div className="g-design-text">
          <p className="label-kicker" data-reveal>
            Design
          </p>
          <p className="p-statement-text" data-reveal>
            The product&rsquo;s design mimics nature and blends in with the marine setting.
          </p>
        </div>
      </section>
      {/* ---- Status light ---- */}
      <StatusLight />

      {/* ---- App control ---- */}
      <AppControl />

      <NextProject slug={project.slug} />
    </main>
  )
}

// The dial: a crescent like the dock's light strip (a circle's left side,
// from 240° at the top round to 120° at the bottom), split into segments
const ARC = { cx: 110, cy: 110, r: 95, from: 240, to: 120, gap: 4 }
const arcPoint = (deg) => {
  const a = (deg * Math.PI) / 180
  return [ARC.cx + ARC.r * Math.cos(a), ARC.cy + ARC.r * Math.sin(a)]
}
function arcSegment(i, n) {
  const step = (ARC.from - ARC.to) / n
  const [x1, y1] = arcPoint(ARC.from - i * step - ARC.gap / 2)
  const [x2, y2] = arcPoint(ARC.from - (i + 1) * step + ARC.gap / 2)
  return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${ARC.r} ${ARC.r} 0 0 0 ${x2.toFixed(2)} ${y2.toFixed(2)}`
}
// Where each label sits: beside the middle of its segment, following the curve
// (as a share of the dial's viewBox: x 5–75, y 15–205)
function labelSpot(i, n) {
  const step = (ARC.from - ARC.to) / n
  const [x, y] = arcPoint(ARC.from - (i + 0.5) * step)
  return { '--x': ((x - 5) / 70).toFixed(3), top: `${(((y - 15) / 190) * 100).toFixed(1)}%` }
}

// Top-down photo of the dock; its arc-shaped light strip shows the color of
// the chosen status. It cycles through them slowly until someone picks one.
function StatusLight() {
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState(false)
  const [near, setNear] = useState(false) // load the photos once the section is close
  const ref = useRef(null)

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: '100% 0px' })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (picked) return
    let timer = 0
    const io = new IntersectionObserver(([e]) => {
      clearInterval(timer)
      if (e.isIntersecting) timer = setInterval(() => setIndex((i) => (i + 1) % LIGHTS.length), 2600)
    })
    io.observe(ref.current)
    return () => {
      io.disconnect()
      clearInterval(timer)
    }
  }, [picked])

  const pick = (i) => {
    setIndex(i)
    setPicked(true)
  }
  const light = LIGHTS[index]

  return (
    <section className="g-status" ref={ref}>
      {/* The photo fills the section. There's one version per light color
          (the strip recolored ahead of time), and they cross-fade */}
      <div className="g-status-media" role="img" aria-label={`The dock seen from above, its status light showing ${light.name.toLowerCase()}`}>
        {LIGHTS.map((l, i) => (
          <span
            key={l.photo}
            className={`g-status-photo ${i === index ? 'is-on' : ''}`}
            style={near ? { backgroundImage: `url(${img(l.photo)})` } : undefined}
          />
        ))}
      </div>
      {/* The control echoes the dock's own light strip: an arc of the four
          colors, the active one lit. The panel takes on a glow of that color. */}
      <div className="g-status-panel" style={{ '--glow': light.color }}>
        <p className="label-kicker" data-reveal>
          Status light
        </p>
        <p className="g-status-now" aria-live="polite">
          <span className="g-status-name" key={light.name}>
            {light.name}
          </span>
        </p>
        <p className="p-body">A gentle indicator light lets the owner see the general status at all times.</p>
        <div className="g-dial">
          <svg className="g-dial-arc" viewBox="5 15 70 190" aria-hidden="true">
            {LIGHTS.map((l, i) => (
              <path
                key={l.name}
                d={arcSegment(i, LIGHTS.length)}
                className={i === index ? 'is-on' : ''}
                style={{ '--c': l.color }}
                onMouseEnter={() => pick(i)}
                onClick={() => pick(i)}
              />
            ))}
          </svg>
          <ul className="g-dial-labels">
            {LIGHTS.map((l, i) => (
              <li key={l.name} style={{ '--c': l.color, ...labelSpot(i, LIGHTS.length) }}>
                <button
                  type="button"
                  className={i === index ? 'is-on' : ''}
                  onMouseEnter={() => pick(i)}
                  onFocus={() => pick(i)}
                  onClick={() => pick(i)}
                  aria-pressed={i === index}
                >
                  {l.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>    </section>
  )
}

// The app: the dashboard on an upright phone, and the live camera view on a
// phone turned sideways (the way you'd hold it to steer the robot)
function AppControl() {
  return (
    <section className="g-app">
      <div className="g-app-text">
        <p className="label-kicker" data-reveal>
          App control
        </p>
        <p className="p-body" data-reveal>
          The user can swim, explore and interact with their fish, get live data, and set reminders.
        </p>
      </div>
      <div className="g-phones">
        <figure className="g-phone is-portrait" data-reveal>
          <img src={img('iphone-16---1')} alt="The app's dashboard: tank status, the user's fish and reminders" loading="lazy" decoding="async" />
          <figcaption>Dashboard</figcaption>
        </figure>
        <figure className="g-phone is-landscape" data-reveal style={{ transitionDelay: '150ms' }}>
          <img src={img('iphone-16---2')} alt="The app's live camera view, steering the robot among the fish" loading="lazy" decoding="async" />
          <figcaption>Live view and steering</figcaption>
        </figure>
      </div>
    </section>
  )
}