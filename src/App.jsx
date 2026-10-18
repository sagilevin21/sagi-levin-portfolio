import { useLayoutEffect, useState } from 'react'
import { Route, Routes, useLocation, useNavigationType } from 'react-router-dom'
import Header from './components/Header'
import Ripple from './components/Ripple'
import Intro from './components/Intro'
import Home from './pages/Home'
import ComingSoon from './pages/ComingSoon'
import ProjectPage from './pages/ProjectPage'
import { useNoOrphans } from './noOrphans'

// Following a link opens the new page at its top. The browser's back and
// forward buttons are left alone, so they return to where you were.
function useScrollToTop() {
  const { pathname } = useLocation()
  const navType = useNavigationType()
  useLayoutEffect(() => {
    if (navType !== 'POP') window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname, navType])
}

export default function App({ playIntro }) {
  const [showIntro, setShowIntro] = useState(playIntro)
  useNoOrphans()
  useScrollToTop()

  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/work" element={<ComingSoon title="Work" />} />
        <Route path="/about" element={<ComingSoon title="About" />} />
        <Route path="/projects/:slug" element={<ProjectPage />} />
        <Route path="*" element={<ComingSoon />} />
      </Routes>
      <Ripple />
      {showIntro && <Intro onDone={() => setShowIntro(false)} />}
    </>
  )
}
