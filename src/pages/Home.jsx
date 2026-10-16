import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { featuredProjects, projects } from '../data/projects'
import { idleColors, site } from '../data/site'
import { useTheme } from '../theme'
import GlassBackdrop from '../components/GlassBackdrop'
import './Home.css'

const covers = featuredProjects.map((p) => p.cover)
const coverShifts = Object.fromEntries(featuredProjects.map((p) => [p.cover, p.coverShift ?? 0]))

// true = image fills the whole window, false = image sits in a frame on the right
const FULLSCREEN_IMAGE = true

const pad = (n) => String(n).padStart(2, '0')

export default function Home() {
  const [activeSlug, setActiveSlug] = useState(null)
  const active = featuredProjects.find((p) => p.slug === activeSlug)
  const listRef = useRef(null)

  useTheme(active?.colors ?? idleColors)

  // On touch screens there's no hover: the row in the middle of the screen
  // becomes active as you scroll.
  useEffect(() => {
    if (!window.matchMedia('(hover: none)').matches) return
    const rows = listRef.current.querySelectorAll('[data-slug]')
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const slug = e.target.dataset.slug
          if (e.isIntersecting) setActiveSlug(slug)
          else setActiveSlug((cur) => (cur === slug ? null : cur))
        })
      },
      { rootMargin: '-45% 0px -45% 0px' },
    )
    rows.forEach((row) => io.observe(row))
    return () => io.disconnect()
  }, [])

  return (
    <main className={`home ${active ? 'has-active' : ''}`}>
      <div
        className={`home-backdrop ${active ? 'is-on' : ''} ${FULLSCREEN_IMAGE ? 'is-full' : ''}`}
      >
        <GlassBackdrop images={covers} active={active?.cover} shifts={coverShifts} />
      </div>

      <h1 className="visually-hidden">
        {site.name}, {site.role}
      </h1>

      {/* Phones: intro sits above the list instead of in the corner label */}
      <section className="home-intro" aria-hidden="true">
        <p className="label-kicker">
          {site.introTitle}
        </p>
        <IntroText />
      </section>

      <ol
        className="index"
        ref={listRef}
        onMouseLeave={() => setActiveSlug(null)}
        aria-label="Selected projects"
      >
        {featuredProjects.map((p, i) => (
          <li
            key={p.slug}
            className={p.slug === activeSlug ? 'is-active' : ''}
            style={{ '--i': i }}
          >
            <Link
              to={`/projects/${p.slug}`}
              data-slug={p.slug}
              onMouseEnter={() => setActiveSlug(p.slug)}
              onFocus={() => setActiveSlug(p.slug)}
            >
              <span className="index-name">{p.title}</span>
              <span className="index-meta">
                <span className="index-num">{pad(i + 1)}</span>
                <span className="index-field">{p.field}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>

      {/* Museum-style label: introduces Sagi, or describes the active project */}
      <aside className="label" aria-live="polite">
        {active ? (
          <div className="label-inner" key={active.slug}>
            <p className="label-title">{active.title}</p>
            <p className="label-field">{active.field}</p>
            <p className="label-text">{active.summary}</p>
          </div>
        ) : (
          <div className="label-inner" key="intro">
            <p className="label-kicker">
              {site.introTitle}
            </p>
            <IntroText />
          </div>
        )}
      </aside>

      <footer className="home-foot">
        <Link to="/work" className="home-all">
          All work <sup>{pad(projects.length)}</sup>
        </Link>
        <div className="home-links">
          <a href={`mailto:${site.email}`}>Email</a>
          <a href={site.instagram} target="_blank" rel="noreferrer">
            Instagram
          </a>
          <a href={site.linkedin} target="_blank" rel="noreferrer">
            LinkedIn
          </a>
        </div>
      </footer>
    </main>
  )
}

// The intro as one paragraph, with a line break between its parts
function IntroText() {
  return (
    <p className="label-text">
      {site.intro.map((line, i) => (
        <span key={i}>
          {i > 0 && <br />}
          {line}
        </span>
      ))}
    </p>
  )
}
