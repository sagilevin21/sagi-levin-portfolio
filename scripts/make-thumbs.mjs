// Makes small copies of every project's cover image for the All work page:
//   public/images/thumbs/<slug>.webp  (900px wide)
// Run it after adding a project or changing a cover:  npm run thumbs
import fs from 'node:fs'
import sharp from 'sharp'
import { projects } from '../src/data/projects.js'

const OUT = 'public/images/thumbs'
fs.mkdirSync(OUT, { recursive: true })
for (const p of projects) {
  const src = `public${p.cover}`
  if (!fs.existsSync(src)) {
    console.log(`skipped ${p.slug}: no cover at ${src}`)
    continue
  }
  await sharp(src).resize({ width: 900, withoutEnlargement: true }).webp({ quality: 80 }).toFile(`${OUT}/${p.slug}.webp`)
  console.log(`made ${OUT}/${p.slug}.webp`)
}
