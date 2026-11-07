import { useEffect, useRef } from 'react'
import './ScrollGallery.css'

// A row of photos that slides sideways as you scroll down: the section stays
// on screen while the row moves past, then the page carries on.
// images: [{ src, alt, ar }]  ar = width / height
export default function ScrollGallery({ images }) {
  const sectionRef = useRef(null)
  const trackRef = useRef(null)

  useEffect(() => {
    const section = sectionRef.current
    const track = trackRef.current
    let run = 0 // how far the row has to travel
    let raf = 0

    const measure = () => {
      run = Math.max(0, track.scrollWidth - document.documentElement.clientWidth)
      // The section is as tall as the screen plus the row's travel
      section.style.setProperty('--run', `${run}px`)
      update()
    }
    const update = () => {
      raf = 0
      const r = section.getBoundingClientRect()
      const span = r.height - window.innerHeight
      const p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0
      track.style.transform = `translate3d(${-p * run}px, 0, 0)`
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(track)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', measure)
    }
  }, [])

  return (
    <section className="sg" ref={sectionRef}>
      <div className="sg-stage">
        <div className="sg-track" ref={trackRef}>
          {images.map((img) => (
            <figure className="sg-item" key={img.src} style={{ '--ar': img.ar }}>
              {/* Not lazy: off to the side, they'd load only as they slide in */}
              <img src={img.src} alt={img.alt} decoding="async" draggable="false" />
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
