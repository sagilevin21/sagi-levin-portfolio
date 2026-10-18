// Slims down a 3D model for the web: merges duplicate points, simplifies the
// shape to roughly the given number of triangles, shrinks textures to WebP,
// and compresses everything.
//
//   node scripts/optimize-glb.mjs <input.glb> <output.glb> [triangles=9000] [textureSize=512] [dropMeshes] [maxError=0.02]
//
// dropMeshes: comma-separated mesh names to remove (e.g. a display stand).

import fs from 'node:fs'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, prune, weld, simplify, textureCompress, quantize, meshopt } from '@gltf-transform/functions'
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer'
import sharp from 'sharp'

const [input, output, trisArg, texArg, dropArg] = process.argv.slice(2)
const targetTris = +(trisArg ?? 9000)
const texSize = +(texArg ?? 512)
const drop = new Set((dropArg ?? '').split(',').filter(Boolean))
const maxError = +(process.argv[6] ?? 0.02) // how far the simplified shape may drift (share of its size)
// 'sloppy' ignores texture seams, for scans that are cut into many patches
const SLOPPY = process.argv[7] === 'sloppy'

await MeshoptEncoder.ready
await MeshoptSimplifier.ready
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder })
const doc = await io.read(input)
const root = doc.getRoot()

for (const node of root.listNodes()) {
  const mesh = node.getMesh()
  if (mesh && drop.has(mesh.getName())) node.setMesh(null)
}

const count = () =>
  root.listMeshes().reduce((n, m) => n + m.listPrimitives().reduce((k, p) => k + (p.getIndices()?.getCount() ?? 0) / 3, 0), 0)
await doc.transform(prune(), dedup(), weld())
const before = count()
const ratio = Math.min(1, targetTris / before)
if (SLOPPY) {
  for (const mesh of root.listMeshes())
    for (const prim of mesh.listPrimitives()) {
      const idx = prim.getIndices()
      const pos = prim.getAttribute('POSITION')
      if (!idx || !pos) continue
      const indices = new Uint32Array(idx.getArray())
      const target = Math.max(3, Math.floor((indices.length * ratio) / 3) * 3)
      const [out] = MeshoptSimplifier.simplifySloppy(indices, new Float32Array(pos.getArray()), 3, null, target, maxError)
      idx.setArray(out)
    }
}
await doc.transform(
  ...(SLOPPY ? [] : [simplify({ simplifier: MeshoptSimplifier, ratio, error: maxError, lockBorder: false })]),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [texSize, texSize], quality: 82 }),
  prune(),
  quantize(),
  meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
)
await io.write(output, doc)
console.log(`${input.split(/[\\/]/).pop()}: ${Math.round(before)} -> ${Math.round(count())} triangles, ${Math.round(fs.statSync(output).size / 1024)} KB`)
for (const m of root.listMeshes()) {
  const t = m.listPrimitives().reduce((k, p) => k + (p.getIndices()?.getCount() ?? 0) / 3, 0)
  console.log(`   mesh "${m.getName()}": ${Math.round(t)} tris`)
}
