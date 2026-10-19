// The film-grain look, shared by the home page images (GlassBackdrop) and
// images that arrive through it on project pages (GrainImage).

export const VERT = `
attribute vec2 p;
varying vec2 uv;
void main() { uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`

// Two images (a = previous, b = new), each scaled to fill the frame,
// cross-faded by mixAB
export const COMMON = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 uv;
uniform sampler2D a, b;
uniform vec2 coverA, coverB;
uniform float shiftA, shiftB;
uniform float mixAB, k, aspect, time;
// shift moves an image sideways (share of the frame width); the uncovered
// edge repeats the photo's edge pixels, which works for plain backdrops
vec2 cover(vec2 q, vec2 s, float shift) {
  q.x -= shift;
  return clamp((q - 0.5) * s + 0.5, 0.0, 1.0);
}
vec4 pick(vec2 q) {
  q = clamp(q, 0.0, 1.0);
  return mix(texture2D(a, cover(q, coverA, shiftA)), texture2D(b, cover(q, coverB, shiftB)), mixAB);
}
`

// The new image arrives like projected film: heavy grain that changes 24
// times a second (blended in "overlay" mode), a soft retro grade (lifted
// blacks, warm tint, a little less colour), a slight exposure flicker and a
// tiny frame jitter. All of it fades out into the clean photo.
const NOISE = `
// Hash without sine (stable on phones)
float hash(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.x + p.y) * p.z);
}
// Soft, clumpy grain: random values on a grid, smoothly blended between
float grainNoise(vec2 p, float frame) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n00 = hash(vec3(i, frame)), n10 = hash(vec3(i + vec2(1.0, 0.0), frame));
  float n01 = hash(vec3(i + vec2(0.0, 1.0), frame)), n11 = hash(vec3(i + vec2(1.0, 1.0), frame));
  return mix(mix(n00, n10, f.x), mix(n01, n11, f.x), f.y);
}
`

export const GRAIN_FRAG = `${COMMON}
uniform float grainSize, grain, retro, flicker, vignette;
${NOISE}
vec3 overlay(vec3 base, vec3 blend) {
  return mix(2.0 * base * blend, 1.0 - 2.0 * (1.0 - base) * (1.0 - blend), step(0.5, base));
}

void main() {
  float frame = floor(time * 24.0);

  vec3 col = pick(uv).rgb;

  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  vec3 graded = mix(col, vec3(luma), 0.25);
  graded = graded * 0.84 + vec3(0.08, 0.065, 0.045);
  graded *= vec3(1.04, 1.0, 0.9);
  col = mix(col, graded, retro * k);

  col *= 1.0 + (hash(vec3(frame, 5.0, 9.0)) - 0.5) * flicker * k;

  // Two grain sizes, a fresh pattern every film frame
  vec2 px = gl_FragCoord.xy / grainSize;
  float n = grainNoise(px, frame) * 0.6 + grainNoise(px * 0.42 + 31.7, frame + 17.0) * 0.4;
  n = (n - 0.5) * 2.0 * grain * k;
  // Blend like film: overlay for texture in the midtones and highlights, plus
  // a little added directly so the shadows get grain too
  vec3 g = vec3(clamp(0.5 + n, 0.0, 1.0));
  col = mix(col, overlay(col, g), 0.75) + n * 0.12;

  vec2 d = uv - 0.5;
  col *= 1.0 - dot(d, d) * vignette * k;
  gl_FragColor = vec4(col, 1.0);
}`

// The same grain, flicker and darker corners as a layer on its own, to lay
// over a whole page with CSS "overlay" blending (FilmIn): mid-grey leaves
// the page as it is, lighter and darker greys lighten and darken it
export const FILM_FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 uv;
uniform float k, time, grainSize, grain, retro, flicker, vignette;
${NOISE}
void main() {
  float frame = floor(time * 24.0);
  vec2 px = gl_FragCoord.xy / grainSize;
  float n = grainNoise(px, frame) * 0.6 + grainNoise(px * 0.42 + 31.7, frame + 17.0) * 0.4;
  n = (n - 0.5) * 2.0 * grain * k;
  float f = 1.0 + (hash(vec3(frame, 5.0, 9.0)) - 0.5) * flicker * k;
  vec2 d = uv - 0.5;
  float v = 1.0 - dot(d, d) * vignette * 1.6 * k;
  // A warm tint, like the retro grade: a touch more red, less blue
  vec3 warm = mix(vec3(1.0), vec3(1.07, 1.0, 0.84), retro * k);
  gl_FragColor = vec4(clamp(vec3(0.5 * v * f) * warm + n, 0.0, 1.0), 1.0);
}`

// How the grain looks
export const GRAIN_LOOK = {
  grainSize: 1.7, // size of a grain, in screen pixels
  grain: 0.5, // how strong the grain is (0–1)
  retro: 0.8, // how much of the retro colour grade (0–1)
  flicker: 0.08, // exposure flicker
  vignette: 0.35, // darker corners
}

// How strong the effect is as it plays (t: 0 → 1): a gradual fade-out
export const grainStrength = (t) => Math.pow(1 - t, 1.6)
