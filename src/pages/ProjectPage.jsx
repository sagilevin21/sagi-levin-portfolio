import { lazy, Suspense } from 'react'
import { useParams } from 'react-router-dom'
import ComingSoon from './ComingSoon'

// Each project has its own page, loaded only when someone opens it.
// Projects without a page yet show "Coming soon".
const pages = {
  gillbot: lazy(() => import('./projects/Gillbot')),
}

export default function ProjectPage() {
  const { slug } = useParams()
  const Page = pages[slug]
  if (!Page) return <ComingSoon />
  return (
    <Suspense fallback={null}>
      <Page />
    </Suspense>
  )
}
