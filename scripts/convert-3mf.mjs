// Converts a 3MF export (e.g. from SolidWorks) into a compact .glb for the web.
// Every body becomes its own named part, so the page can give each one its
// own material.
//
//   node scripts/convert-3mf.mjs <input.3mf> <output.glb>
//
// Shading normals are computed here, keeping sharp CAD edges sharp.

import fs from 'node:fs'
import { unzipSync, strFromU8 } from 'three/examples/jsm/libs/fflate.module.js'
import { Document, NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { quantize, meshopt } from '@gltf-transform/functions'
import { MeshoptEncoder } from 'meshoptimizer'

const [input, output] = process.argv.slice(2)
if (!input || !output) {
  console.log('Usage: node scripts/convert-3mf.mjs <input.3mf> <output.glb>')
  process.exit(1)
}

const files = unzipSync(new Uint8Array(fs.readFileSync(input)))
const modelPath = Object.keys(files).find((f) => f.toLowerCase().endsWith('.model'))
const xml = strFromU8(files[modelPath])
// glTF uses metres; 3MF states its own unit
const unit = 0.001 * { micron: 0.001, millimeter: 1, centimeter: 10, inch: 25.4, foot: 304.8, meter: 1000 }[
  xml.match(/<model[^>]*unit="([^"]+)"/)?.[1] ?? 'millimeter'
]

const doc = new Document()
const buffer = doc.createBuffer()
const scene = doc.createScene('robot')

for (const [, head, body] of xml.matchAll(/<object ([^>]*)>([\s\S]*?)<\/object>/g)) {
  const name = head.match(/\bname="([^"]*)"/)?.[1] ?? 'part'
  const verts = [...body.matchAll(/<vertex x="([^"]+)" y="([^"]+)" z="([^"]+)"/g)]
  if (!verts.length) continue
  const pos = new Float32Array(verts.length * 3)
  verts.forEach((m, i) => {
    pos[i * 3] = +m[1] * unit
    pos[i * 3 + 1] = +m[2] * unit
    pos[i * 3 + 2] = +m[3] * unit
  })
  const tris = [...body.matchAll(/<triangle v1="(\d+)" v2="(\d+)" v3="(\d+)"/g)]
  const idx = new Uint32Array(tris.length * 3)
  tris.forEach((m, i) => {
    idx[i * 3] = +m[1]
    idx[i * 3 + 1] = +m[2]
    idx[i * 3 + 2] = +m[3]
  })
  const { positions: outPos, normals: outNor, indices: outIdx } = creasedShading(pos, idx, 30)
  const prim = doc
    .createPrimitive()
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(outPos).setBuffer(buffer))
    .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(outNor).setBuffer(buffer))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(outIdx).setBuffer(buffer))
  const mesh = doc.createMesh(name).addPrimitive(prim)
  scene.addChild(doc.createNode(name).setMesh(mesh))
  console.log(`  ${name}: ${verts.length} points, ${tris.length} triangles`)
}

await MeshoptEncoder.ready
await doc.transform(quantize(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }))
await new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder }).write(output, doc)
console.log(`Wrote ${output} (${Math.round(fs.statSync(output).size / 1024)} KB)`)

// Smooth shading that stays sharp where surfaces meet at more than `angle`
// degrees (computed here once, so browsers don't have to). Around each point,
// the touching triangles are sorted into smooth groups; each group shares one
// point with an averaged normal, so the mesh stays compact.
function creasedShading(pos, idx, angle) {
  const cos = Math.cos((angle * Math.PI) / 180)
  const triCount = idx.length / 3
  // Triangle normals (length = twice the area, so big faces count more)
  const fn = new Float32Array(triCount * 3)
  for (let t = 0; t < triCount; t++) {
    const [a, b, c] = [idx[t * 3] * 3, idx[t * 3 + 1] * 3, idx[t * 3 + 2] * 3]
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2]
    const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2]
    fn[t * 3] = uy * vz - uz * vy
    fn[t * 3 + 1] = uz * vx - ux * vz
    fn[t * 3 + 2] = ux * vy - uy * vx
  }
  const unit = (x, y, z) => {
    const l = Math.hypot(x, y, z) || 1
    return [x / l, y / l, z / l]
  }
  // Points that sit at the same spot are treated as one
  const keyOf = (v) => `${pos[v * 3].toFixed(7)},${pos[v * 3 + 1].toFixed(7)},${pos[v * 3 + 2].toFixed(7)}`
  const around = new Map() // spot -> [triangle corner, …]
  for (let i = 0; i < idx.length; i++) {
    const k = keyOf(idx[i])
    if (!around.has(k)) around.set(k, [])
    around.get(k).push(i)
  }
  const outPos = []
  const outNor = []
  const outIdx = new Uint32Array(idx.length)
  for (const corners of around.values()) {
    const groups = [] // { sum: [x,y,z], dir: unit, corners: [] }
    for (const i of corners) {
      const t = Math.floor(i / 3)
      const n = unit(fn[t * 3], fn[t * 3 + 1], fn[t * 3 + 2])
      let g = groups.find((g) => g.dir[0] * n[0] + g.dir[1] * n[1] + g.dir[2] * n[2] > cos)
      if (!g) groups.push((g = { sum: [0, 0, 0], dir: n, corners: [] }))
      g.sum[0] += fn[t * 3]
      g.sum[1] += fn[t * 3 + 1]
      g.sum[2] += fn[t * 3 + 2]
      g.corners.push(i)
    }
    const v = idx[corners[0]]
    for (const g of groups) {
      const at = outPos.length / 3
      outPos.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2])
      outNor.push(...unit(...g.sum))
      for (const i of g.corners) outIdx[i] = at
    }
  }
  return { positions: new Float32Array(outPos), normals: new Float32Array(outNor), indices: outIdx }
}