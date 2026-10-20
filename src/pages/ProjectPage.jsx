import { lazy, Suspense } from 'react'
import { useParams } from 'react-router-dom'
import ComingSoon from './ComingSoon'
import FilmIn from '../components/FilmIn'

// Each project has its own page, loaded only when someone opens it.
// Projects without a page yet show "Coming soon".
// Every project page arrives through the film-grain entrance (FilmIn); new
// pages added below get it automatically.
const pages = {
  gillbot: lazy(() => import('./projects/Gillbot')),
  facets: lazy(() => import('./projects/Facets')),
  'shattered-form': lazy(() => import('./projects/ShatteredForm')),
  'feather-weight': lazy(() => import('./projects/FeatherWeight')),
  ritual: lazy(() => import('./projects/Ritual')),
  paintings: lazy(() => import('./projects/Paintings')),
}

export default function ProjectPage() {
  const { slug } = useParams()
  const Page = pages[slug]
  if (!Page) return <ComingSoon />
  return (
    <Suspense fallback={null}>
      {/* Plays once the page is loaded, and again for each project opened */}
      <FilmIn key={slug} />
      <Page />
    </Suspense>
  )
}
