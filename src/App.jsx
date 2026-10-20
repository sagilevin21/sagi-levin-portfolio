import { useLayoutEffect, useRef, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigationType } from 'react-router-dom'
import Header from './components/Header'
import Ripple from './components/Ripple'
import Intro from './components/Intro'
import Home from './pages/Home'
import Work from './pages/Work'
import ComingSoon from './pages/ComingSoon'
import ProjectPage from './pages/ProjectPage'
import { useNoOrphans } from './noOrphans'

// Following a link opens the new page at its top, or at the part its address
// names (like /#contact): gliding there when it's on the same page, straight
// there when coming from another one. The browser's back and forward buttons
// are left alone, so they return to where you were.
function useScrollOnNavigate() {
  const { pathname, hash, key } = useLocation()
  const navType = useNavigationType()
  const lastPath = useRef(pathname)
  useLayoutEffect(() => {
    const samePage = lastPath.current === pathname
    lastPath.current = pathname
    if (navType === 'POP' && !hash) return
    if (!hash) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
      return
    }
    // The part may appear a moment later (pages load as they're opened)
    let tries = 0
    let raf = 0
    const go = () => {
      const el = document.getElementById(decodeURIComponent(hash.slice(1)))
      if (el) el.scrollIntoView({ behavior: samePage ? 'smooth' : 'instant', block: 'start' })
      else if (tries++ < 60) raf = requestAnimationFrame(go)
    }
    go()
    return () => cancelAnimationFrame(raf)
  }, [pathname, hash, key, navType])
}

export default function App({ playIntro }) {
  const [showIntro, setShowIntro] = useState(playIntro)
  useNoOrphans()
  useScrollOnNavigate()

  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/work" element={<Work />} />
        {/* "Get to know me" lives on the Home page now */}
        <Route path="/about" element={<Navigate to="/#about" replace />} />
        <Route path="/projects/:slug" element={<ProjectPage />} />
        <Route path="*" element={<ComingSoon />} />
      </Routes>
      <Ripple />
      {showIntro && <Intro onDone={() => setShowIntro(false)} />}
    </>
  )
}
