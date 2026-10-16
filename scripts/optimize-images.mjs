// Turns the full-size photos in /originals into web-sized copies in /public/images.
//
//   originals/shattered form/17 copy.jpg  →  public/images/shattered-form/17-copy.webp
//
// Run it with:  npm run images
// Only new or changed photos are processed, so it's quick to re-run.

import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const SRC = 'originals'
const OUT = 'public/images'
const MAX_WIDTH = 2400
const QUALITY = 80

const clean = (name) => name.trim().toLowerCase().replace(/\s+/g, '-')

if (!fs.existsSync(SRC)) {
  console.log('No originals folder, nothing to do.')
  process.exit(0)
}

let made = 0
let skipped = 0
for (const folder of fs.readdirSync(SRC)) {
  const srcDir = path.join(SRC, folder)
  if (!fs.statSync(srcDir).isDirectory()) continue
  const outDir = path.join(OUT, clean(folder))
  fs.mkdirSync(outDir, { recursive: true })

  for (const file of fs.readdirSync(srcDir)) {
    if (!/\.(jpe?g|png|webp|tiff?)$/i.test(file)) continue
    const src = path.join(srcDir, file)
    const out = path.join(outDir, clean(path.parse(file).name) + '.webp')
    if (fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(src).mtimeMs) {
      skipped++
      continue
    }
    await sharp(src)
      .rotate()
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(out)
    made++
    console.log('  ✓', out)
  }
}
console.log(`Done: ${made} made, ${skipped} already up to date.`)
