import { useRef, useState } from 'react'
import { site } from '../../data/site'
import { useProjectScroll } from '../../components/project/useProjectScroll'
import './AboutContact.css'

const YEAR = new Date().getFullYear()

// Below the project list on the Home page: "Get to know me" (#about) and
// Contact (#contact). The menu's "Get to know me" and every "Email" link
// lead here. All the words live in data/site.js.
export default function AboutContact() {
  const ref = useRef(null)
  useProjectScroll(ref) // gentle rise-in as each part comes into view
  const { about } = site

  return (
    <div className="me" ref={ref}>
      <section id="about" className="me-about" aria-labelledby="about-title">
        <p className="label-kicker me-kicker" data-reveal>
          Get to know me
        </p>
        <h2 id="about-title" className="me-title" data-reveal>
          {about.title}
        </h2>

        {/* The portrait, printed onto the page: its white backdrop takes the page color */}
        <figure className="me-photo" data-reveal>
          <img src={about.photo} alt={`Portrait of ${site.name}, smiling`} loading="lazy" decoding="async" />
        </figure>

        <div className="me-text">
          {about.paragraphs.map((p, i) => (
            <p key={i} data-reveal style={{ transitionDelay: `${i * 120}ms` }}>
              {p}
            </p>
          ))}
        </div>
      </section>

      <Contact />
    </div>
  )
}

function Contact() {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(site.email)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      window.location.href = `mailto:${site.email}`
    }
  }

  return (
    <section id="contact" className="me-contact" aria-labelledby="contact-title">
      <p id="contact-title" className="label-kicker" data-reveal>
        Contact
      </p>
      <p className="me-say" data-reveal>
        Say hello
      </p>
      <a className="me-email" href={`mailto:${site.email}`} data-reveal>
        {/* On narrow screens it may break after the @, never mid-name */}
        {site.email.split('@')[0]}@<wbr />
        {site.email.split('@')[1]}
      </a>
      <div className="me-contact-row" data-reveal>
        <button type="button" className="me-copy" onClick={copy}>
          {copied ? 'Copied' : 'Copy email'}
        </button>
        <a href={site.instagram} target="_blank" rel="noreferrer">
          Instagram
        </a>
        <a href={site.linkedin} target="_blank" rel="noreferrer">
          LinkedIn
        </a>
        <span className="me-based">Based in {site.location}</span>
      </div>
      <p className="me-foot">
        © {YEAR} {site.name}
      </p>
    </section>
  )
}
