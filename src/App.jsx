import { useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import Header from './components/Header'
import Ripple from './components/Ripple'
import Intro from './components/Intro'
import Home from './pages/Home'
import ComingSoon from './pages/ComingSoon'
import ProjectPage from './pages/ProjectPage'
import { useNoOrphans } from './noOrphans'

export default function App({ playIntro }) {
  const [showIntro, setShowIntro] = useState(playIntro)
  useNoOrphans()

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
