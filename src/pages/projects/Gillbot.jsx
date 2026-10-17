import { useCallback, useEffect, useRef, useState } from 'react'
import { getProject } from '../../data/projects'
import { useTheme } from '../../theme'
import { mixColors, useProjectScroll } from '../../components/project/useProjectScroll'
import WaterLight from '../../components/project/WaterLight'
import SwimmingRobot from '../../components/project/SwimmingRobot'
import NextProject from '../../components/project/NextProject'
import './project.css'
import './Gillbot.css'

const img = (name) => `/images/gillbot/${name}.webp`

// The page gets darker as you scroll down, like sinking deeper into the tank
const DEPTH = ['#0e4862', '#0b3a52', '#07263a', '#04161f']

// Numbered points on the product photo (x / y in % of the image)
const PARTS = [
  { name: 'Interactive robot', x: 46, y: 11 },
  { name: 'Sensor housing', x: 47, y: 47 },
  { name: 'Docking unit', x: 72, y: 54 },
]

// Status light colors and what they mean
const LIGHTS = [
  { name: 'Alert', color: '#ff3d3d' },
  { name: 'Charging', color: '#3aa8ff' },
  { name: 'Idle', color: '#ffffff' },
  { name: 'Fully charged', color: '#3dff8f' },
]

export default function Gillbot() {
  const project = getProject('gillbot')
  useTheme(project.colors)

  const pageRef = useRef(null)
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
          <img src={img('underwater-two-fish')} alt="The Gillbot robot swimming underwater beside two fish" />
        </div>
        <div className="p-hero-text">
          <h1 className="p-title p-enter">{project.title}</h1>
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
          The concept behind this project is to improve quality of life for pet fish, by strengthening the bond
          between the fish and the owner.
        </p>
      </section>

      {/* ---- You're the fish ---- */}
      <section className="g-swim">
        <SwimmingRobot src={img('robot-cutout')} model="/models/gillbot.glb" alt="The Gillbot robot" />
        <div className="g-swim-caption">
          <p className="label-kicker">Swim with them</p>
          <p className="g-swim-hint">
            <span className="hint-mouse">Move your cursor, the robot follows</span>
            <span className="hint-touch">Tap anywhere, the robot follows</span>
          </p>
        </div>
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
          <img src={img('robot-on-dock')} alt="The Gillbot robot resting on its docking unit" loading="lazy" decoding="async" />
          {PARTS.map((part, i) => (
            <span key={part.name} className="g-marker g-marker-pin" style={{ left: `${part.x}%`, top: `${part.y}%` }}>
              {i + 1}
            </span>
          ))}
        </figure>
      </section>

      {/* ---- Status light ---- */}
      <StatusLight />

      {/* ---- Design ---- */}
      <section className="p-gallery">
        <div className="p-gallery-head">
          <p className="label-kicker" data-reveal>
            Design
          </p>
          <p className="p-body" data-reveal>
            The product&rsquo;s design mimics nature and blends in with the marine setting.
          </p>
        </div>
        <div className="p-gallery-grid g-design">
          <figure className="g-d1" data-reveal>
            <img data-speed="0.04" src={img('dock-texture')} alt="Close-up of the dock's stone-like texture" loading="lazy" decoding="async" />
          </figure>
          <figure className="g-d2" data-reveal>
            <img data-speed="-0.03" src={img('dock-inside')} alt="Inside the dock's blue glazed opening" loading="lazy" decoding="async" />
          </figure>
          <figure className="g-d3" data-reveal>
            <img data-speed="0.05" src={img('dock-top')} alt="The dock seen from above" loading="lazy" decoding="async" />
          </figure>
          <figure className="g-d4" data-reveal>
            <img data-speed="-0.02" src={img('dock-glaze')} alt="The dock's glazed interior" loading="lazy" decoding="async" />
          </figure>
        </div>
      </section>

      {/* ---- App control ---- */}
      <AppControl />

      {/* ---- In the tank, to scale ---- */}
      <section className="p-pair">
        <figure data-reveal>
          <img src={img('in-room')} alt="An aquarium at home with the Gillbot dock inside" loading="lazy" decoding="async" />
          <figcaption>In the tank</figcaption>
        </figure>
        <figure data-reveal>
          <img src={img('in-hand')} alt="The Gillbot robot held in a hand, for scale" loading="lazy" decoding="async" />
          <figcaption>To scale</figcaption>
        </figure>
      </section>

      <NextProject slug={project.slug} />
    </main>
  )
}

// Top-down photo of the dock; its ring light takes the color of the chosen
// status. It cycles through them slowly until someone picks one.
function StatusLight() {
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState(false)
  const ref = useRef(null)

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
      <figure className="g-status-media" data-reveal style={{ '--light': light.color }}>
        <img src={img('top-down-light')} alt="The dock seen from above, its status light glowing" loading="lazy" decoding="async" />
        <span className="g-status-tint" aria-hidden="true" />
        <span className="g-status-glow" aria-hidden="true" />
      </figure>
      <div className="g-status-text">
        <p className="label-kicker" data-reveal>
          Status light
        </p>
        <p className="p-body" data-reveal>
          A gentle indicator light lets the owner see the general status at all times.
        </p>
        <ul className="g-status-legend" data-reveal>
          {LIGHTS.map((l, i) => (
            <li key={l.name}>
              <button
                type="button"
                className={i === index ? 'is-on' : ''}
                style={{ '--c': l.color }}
                onMouseEnter={() => pick(i)}
                onFocus={() => pick(i)}
                onClick={() => pick(i)}
                aria-pressed={i === index}
              >
                <span className="g-status-dot" />
                {l.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

// The app's interface laid over a view of the tank
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
      <div className="g-app-view" data-reveal>
        <img src={img('robot-with-fish')} alt="The Gillbot robot swimming among fish in an aquarium" loading="lazy" decoding="async" />
        <div className="g-ui" aria-hidden="true">
          <div className="g-ui-target">
            <span className="g-ui-name">Pickle</span>
          </div>
          <div className="g-ui-live">
            <span className="g-ui-icon">◉</span>
            GillBot | Live | 92%
          </div>
          <div className="g-ui-pad">
            <span>↑</span>
            <span>←</span>
            <span>→</span>
            <span>↓</span>
          </div>
        </div>
        {/* Over the image on wide screens, below it on phones */}
        <div className="g-ui-card" aria-hidden="true">
            <p className="g-ui-title">
              Tank status | <b>Healthy</b>
            </p>
            <p className="g-ui-sub">Last test | 12:00</p>
            <div className="g-ui-readings">
              <span>
                <b>24°C</b>Temp
              </span>
              <span>
                <b>6.8</b>pH
              </span>
              <span>
                <b>0.0</b>NH₃
              </span>
              <span>
                <b>OK</b>Flow
              </span>
            </div>
            <p className="g-ui-title g-ui-gap">My reminders</p>
            <ul className="g-ui-list">
              <li>
                <b>Feeding</b> | Daily | next 20:00
              </li>
              <li>
                <b>Water change</b> | Monthly
              </li>
              <li>
                <b>Filter change</b> | Yearly
              </li>
            </ul>
        </div>
      </div>
    </section>
  )
}
