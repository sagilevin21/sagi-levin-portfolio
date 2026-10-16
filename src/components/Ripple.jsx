import { useEffect, useState } from 'react'

// A thin ring that expands from wherever you click.
export default function Ripple() {
  const [ripples, setRipples] = useState([])

  useEffect(() => {
    const onDown = (e) => {
      if (e.button !== 0) return
      const id = `${e.timeStamp}-${e.clientX}-${e.clientY}`
      setRipples((r) => [...r, { id, x: e.clientX, y: e.clientY }])
      setTimeout(() => setRipples((r) => r.filter((item) => item.id !== id)), 800)
    }
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [])

  return (
    <div className="ripples" aria-hidden="true">
      {ripples.map((r) => (
        <span key={r.id} style={{ left: r.x, top: r.y }} />
      ))}
    </div>
  )
}
