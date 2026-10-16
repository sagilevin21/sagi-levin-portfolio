import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { shouldPlayIntro } from './intro'

// Decide before the first paint, so the page can wait hidden under the intro
const playIntro = shouldPlayIntro()
if (playIntro) document.documentElement.dataset.intro = ''

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App playIntro={playIntro} />
    </BrowserRouter>
  </StrictMode>,
)
