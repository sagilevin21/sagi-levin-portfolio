import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { featuredProjects } from '../../data/projects'
import { useOpticalAlign } from '../../opticalAlign'

// End of a project page: a big link to the next featured project
// (wraps around to the first one after the last), and a way back home.
export default function NextProject({ slug }) {
  const i = featuredProjects.findIndex((p) => p.slug === slug)
  const next = featuredProjects[(i + 1) % featuredProjects.length]
  const nameRef = useRef(null)
  // Lines the big name's first letter up with the small text above and below
  useOpticalAlign(nameRef, [next.title])

  return (
    <section className="next-project">
      <p className="label-kicker">Next project</p>
      <Link to={`/projects/${next.slug}`} className="next-project-link">
        <span className="next-project-name" ref={nameRef}>
          {next.title}
        </span>
        <span className="next-project-arrow" aria-hidden="true">
          →
        </span>
      </Link>
      <Link to="/" className="back-home">
        Back to main page
      </Link>
    </section>
  )
}
