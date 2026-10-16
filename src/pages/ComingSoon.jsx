import { Link, useParams } from 'react-router-dom'
import { getProject } from '../data/projects'
import { idleColors } from '../data/site'
import { useTheme } from '../theme'

// Temporary stand-in for pages that haven't been designed yet.
export default function ComingSoon({ title }) {
  const { slug } = useParams()
  const project = slug ? getProject(slug) : null
  useTheme(project?.colors ?? idleColors)

  return (
    <main className="coming-soon">
      <p className="label-kicker">Coming soon</p>
      <h1>{project?.title ?? title ?? 'Page not found'}</h1>
      {project && <p className="coming-soon-text">{project.summary}</p>}
      <Link to="/">← Back to the index</Link>
    </main>
  )
}
