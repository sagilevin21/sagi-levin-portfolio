import { Link } from 'react-router-dom'
import { featuredProjects } from '../../data/projects'

// End of a project page: a big link to the next featured project
// (wraps around to the first one after the last).
export default function NextProject({ slug }) {
  const i = featuredProjects.findIndex((p) => p.slug === slug)
  const next = featuredProjects[(i + 1) % featuredProjects.length]
  return (
    <section className="next-project">
      <p className="label-kicker">Next project</p>
      <Link to={`/projects/${next.slug}`} className="next-project-link">
        <span className="next-project-name">{next.title}</span>
        <span className="next-project-field">{next.field}</span>
        <span className="next-project-arrow" aria-hidden="true">
          →
        </span>
      </Link>
    </section>
  )
}
