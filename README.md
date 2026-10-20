# Sagi Levin, design portfolio

Personal portfolio site, built with React and Vite and published on Netlify.

## Working on it

```bash
npm install
npm run dev
```

Then open the address it prints (usually http://localhost:5173).

## Content

- **Projects:** `src/data/projects.js` (titles, colors, which ones show on the Home page)
- **About, contact, links:** `src/data/site.js`
- **Project pages:** `src/pages/projects/`

## Images

1. Put full-size photos in `originals/<project>/` (not uploaded; kept on this computer only).
2. `npm run images` makes the web copies in `public/images/<project>/`.
3. After adding a project or changing a cover: `npm run thumbs` (small pictures for the All work page).

## Publishing

Every push to the `main` branch on GitHub is built and published by Netlify automatically.
