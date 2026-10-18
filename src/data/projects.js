// All projects live here. To change what's on the Home page:
//   featured: true  → shows on Home
//   order           → position on Home (lower = higher up)
// Every project (featured or not) appears on the Work page.
//
// Colors: bg = page color while the project is active, ink = text color,
// accent = small highlights. Optional: field / num = colors of the field and
// number next to the name on hover (default: accent / ink).
//
// coverShift (optional): slides the Home page image sideways, as a share of the
// screen width (0.3 = 30% to the right, negative = left). Best for photos with
// a plain background, since the uncovered edge repeats the photo's edge.
//
// Images: drop full-size photos into originals/<project>/, run `npm run images`,
// then use the web copy from public/images/<project>/ (same name, .webp).

export const projects = [
  {
    slug: 'shattered-form',
    title: 'Shattered Form',
    field: 'Material study',
    summary:
      'Broken pottery bandaged with stiffened bio-plastic nets: a study of fragility, repair and imperfection.',
    year: 2025,
    cover: '/images/shattered-form/hero.webp',
    colors: { bg: '#0d1a30', ink: '#f3e9d6', accent: '#8fb1ea', num: '#BFBFBF', field: '#ffffff' },
    featured: true,
    order: 1,
  },
  {
    slug: 'facets',
    title: 'Facets by PYNK',
    field: 'Social design',
    summary:
      "A set of blocks to think with: an activity for men's circles, made for the fictional brand PYNK.",
    year: 2026,
    team: ['Sagi Levin', 'Gilad Verbov'],
    duration: 'Two months',
    discipline: 'Social design, therapy',
    cover: '/images/facets/20260709_171556-copy-2red.webp',
    coverShift: 0.06,
    colors: { bg: '#a9d5c3', ink: '#2a161c', accent: '#e0566b' },
    featured: true,
    order: 2,
  },
  {
    slug: 'gillbot',
    title: 'Gillbot',
    field: 'Smart product',
    summary:
      'A swimming robot and docking unit that lets owners play with their fish and watch over the aquarium.',
    year: 2025,
    // Shown on the project page
    team: ['Sagi Levin', 'Shirel Wagensberg'],
    duration: 'Three months',
    discipline: 'Pet care, smart system',
    cover: '/images/gillbot/1fishew.webp',
    colors: { bg: '#0e4862', ink: '#eef4f5', accent: '#78D7FF', field: '#78D7FF' },
    featured: true,
    order: 3,
  },
  {
    slug: 'ritual',
    title: 'Ritual',
    field: 'Object kit',
    summary:
      'Five objects for one small luxury: a Negroni kit for the ritual of making a drink at home alone.',
    year: 2024,
    cover: '/images/ritual/hero.webp',
    colors: { bg: '#060506', ink: '#f6b27a', accent: '#ee5a2c' },
    featured: true,
    order: 4,
  },
  {
    slug: 'feather-weight',
    title: 'Feather Weight',
    field: 'Jewelry',
    summary:
      'Carved lapis feathers and an airy brass heart, after the Egyptian myth of the weighing of the heart.',
    year: 2026,
    cover: '/images/feather-weight/hero.webp',
    coverShift: 0.3,
    colors: { bg: '#57b9f8', ink: '#1a0f2e', accent: '#c8103f', field: '#1b2f6e' },
    featured: true,
    order: 5,
  },
  {
    slug: 'paintings',
    title: 'Paintings',
    field: 'Oil painting',
    summary: 'Oil paintings made alongside the design work.',
    year: null,
    cover: '/images/paintings/sl_003.webp',
    colors: { bg: '#e8dccb', ink: '#2b2420', accent: '#3d6ea8' },
    featured: false,
    order: 99,
  },
]

export const featuredProjects = projects
  .filter((p) => p.featured)
  .sort((a, b) => a.order - b.order)

export const getProject = (slug) => projects.find((p) => p.slug === slug)
