import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { site } from '../data/site'
import { projects } from '../data/projects'
import Logo from './Logo'

// Home already has email / Instagram / LinkedIn at the bottom, so its menu is
// a single "Get to know me" link. Every other page gets "Main" (back home),
// "All work" and a Contact menu that opens on hover (or tap / keyboard).
export default function Header() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  return (
    <header className="site-header">
      <Link to="/" className="logo" aria-label={`${site.name}, home`}>
        <Logo />
      </Link>
      <nav className="site-nav" aria-label="Main">
        {isHome ? (
          <NavLink to="/about">Get to know me</NavLink>
        ) : (
          <>
            <Link to="/">Main</Link>
            <NavLink to="/work">
              All work <sup>{String(projects.length).padStart(2, '0')}</sup>
            </NavLink>
            {/* Keyed by page, so it starts closed on every page */}
            <ContactMenu key={pathname} />
          </>
        )}
      </nav>
    </header>
  )
}

function ContactMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Close on a tap elsewhere, or with Escape
  useEffect(() => {
    if (!open) return
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div
      ref={ref}
      className={`contact-menu ${open ? 'is-open' : ''}`}
      // Hover only for a real mouse; on touch screens a tap toggles it instead
      onPointerEnter={(e) => e.pointerType === 'mouse' && setOpen(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setOpen(false)}
      onBlur={(e) => !ref.current?.contains(e.relatedTarget) && setOpen(false)}
    >
      <button
        type="button"
        className="contact-toggle"
        aria-expanded={open}
        aria-controls="contact-links"
        onClick={() => setOpen((o) => !o)}
      >
        Contact
      </button>
      <ul id="contact-links" className="contact-links">
        <li>
          <a href={`mailto:${site.email}`}>Email</a>
        </li>
        <li>
          <a href={site.instagram} target="_blank" rel="noreferrer">
            Instagram
          </a>
        </li>
        <li>
          <a href={site.linkedin} target="_blank" rel="noreferrer">
            LinkedIn
          </a>
        </li>
      </ul>
    </div>
  )
}
