import { useEffect, useImperativeHandle, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { whenFilmDone, whenIdle } from '../../intro'

// ---- Materials (part names come from the SolidWorks bodies) -----------------
const glossy = (color) =>
  new THREE.MeshPhysicalMaterial({ color, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.12 })

const MATERIALS = {
  body14863: glossy('#244D59'), // upper shell with the fin: dark blue
  body18754: glossy('#8CDCE6'), // lower shell: light blue
  body28086: glossy('#8CDCE6'), // camera housing at the front: part of the lower shell
}
// Everything else sits inside the shells and only shows through the openings
// (intake valves, exhaust, bubble shooter): near-black, so they read as holes / mesh
const INSIDE = new THREE.MeshStandardMaterial({ color: '#07090a', roughness: 0.85 })
const LENS = new THREE.MeshPhysicalMaterial({ color: '#030303', roughness: 0.02, clearcoat: 1, clearcoatRoughness: 0 })
// ------------------------------------------------------------------------------

// The robot in 3D, drawn on its own small transparent canvas. The parent moves
// the canvas around and calls ref.current.render({ yaw, roll }) every frame
// (radians); render() returns false until the model is ready.
// Front of the robot = +x, up = +y. Setup waits until the canvas is close to
// the screen and the page is idle, so it never interrupts scrolling.
export default function RobotModel({ ref, url, className, onReady }) {
  const canvasRef = useRef(null)
  const api = useRef(null)
  useImperativeHandle(ref, () => ({ render: (pose) => api.current?.(pose) ?? false }), [])

  useEffect(() => {
    const canvas = canvasRef.current
    let renderer, pmrem, ro
    let cancelled = false

    const setup = async () => {
      await whenFilmDone() // let the page's entrance play smoothly first
      await whenIdle()
      if (cancelled) return
      try {
        renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
      } catch {
        return // no WebGL: the parent keeps showing the photo instead
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      // Neutral tone mapping keeps the plastic colors true to the hex values
      renderer.toneMapping = THREE.NeutralToneMapping
      renderer.toneMappingExposure = 0.95

      const scene = new THREE.Scene()
      pmrem = new THREE.PMREMGenerator(renderer)
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
      scene.environmentIntensity = 0.55
      // Light from above, like sun through water
      const sun = new THREE.DirectionalLight('#eaf8ff', 1.2)
      sun.position.set(-0.4, 1, 0.6)
      scene.add(sun)

      const camera = new THREE.PerspectiveCamera(26, 1, 0.01, 1)
      camera.position.set(0, 0.012, 0.19)
      camera.lookAt(0, 0.002, 0)

      const pivot = new THREE.Group() // turns and tilts
      scene.add(pivot)

      const resize = () => {
        const w = canvas.clientWidth
        const h = canvas.clientHeight
        if (!w || !h) return
        renderer.setSize(w, h, false)
        camera.aspect = w / h
        camera.updateProjectionMatrix()
      }
      resize()
      ro = new ResizeObserver(resize)
      ro.observe(canvas)

      const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url).catch(() => null)
      if (!gltf || cancelled) return
      gltf.scene.traverse((o) => {
        if (o.isMesh) o.material = MATERIALS[o.name] ?? INSIDE
      })
      // Camera lens: black glass in the front mount (it was a surface body,
      // which the 3MF export leaves out)
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.0025, 48), LENS)
      lens.position.set(0.0259, 0, 0)
      lens.rotation.y = Math.PI / 2
      gltf.scene.add(lens)

      // Centre it in the frame
      const box = new THREE.Box3().setFromObject(gltf.scene)
      gltf.scene.position.sub(box.getCenter(new THREE.Vector3()))
      pivot.add(gltf.scene)
      renderer.compile(scene, camera) // prepare shaders now, not on the first frame

      api.current = ({ yaw = 0, roll = 0 } = {}) => {
        pivot.rotation.set(0, 0, 0)
        pivot.rotateZ(roll)
        pivot.rotateY(yaw)
        renderer.render(scene, camera)
        return true
      }
      onReady?.()
    }

    // Start once the canvas is within a screen's height of being visible
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        io.disconnect()
        setup()
      },
      { rootMargin: '100% 0px' },
    )
    io.observe(canvas)

    return () => {
      cancelled = true
      io.disconnect()
      api.current = null
      ro?.disconnect()
      pmrem?.dispose()
      renderer?.dispose()
    }
  }, [url, onReady])

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />
}
