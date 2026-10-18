import { useRef } from 'react'
import SwimmingRobot from './SwimmingRobot'
import BlueprintFish from './BlueprintFish'

// The interactive section as a blueprint-style aquarium: a drawn seafloor
// scene, drawn fish that dart away when the robot comes close, and a pane of
// glass in front. The robot itself stays the real 3D product.
export default function Aquarium({ robotSrc, robotModel, scene }) {
  const posRef = useRef(null)

  return (
    <div className="tank">
      <SwimmingRobot
        src={robotSrc}
        model={robotModel}
        alt="The Gillbot robot"
        posRef={posRef}
        floor={0.78}
        front={<div className="tank-glass" aria-hidden="true" />}
      >
        <div className="tank-water" aria-hidden="true">
          <div className="tank-backdrop" style={{ backgroundImage: `url(${scene})` }} />
          <BlueprintFish robotRef={posRef} />
        </div>
      </SwimmingRobot>
    </div>
  )
}
