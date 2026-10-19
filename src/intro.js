export const INTRO_SEEN_KEY = 'intro-seen'
const DONE_EVENT = 'intro:done'

// The intro plays once per browser tab. Add ?intro to the address to see it
// again. (With reduced motion turned on, it still plays, just without motion.)
export function shouldPlayIntro() {
  if (new URLSearchParams(window.location.search).has('intro')) return true
  try {
    return !window.sessionStorage.getItem(INTRO_SEEN_KEY)
  } catch {
    return true
  }
}

export function announceIntroDone() {
  window.dispatchEvent(new Event(DONE_EVENT))
}

// How long the home page's entrance (names rising in) runs after the intro
const ENTRANCE = 1700

// Resolves once the intro and the page's entrance have finished (right away
// if there is no intro). Heavy work waits for this so both stay smooth.
export function whenIntroDone() {
  if (!('intro' in document.documentElement.dataset) && !document.querySelector('.intro')) {
    return Promise.resolve()
  }
  return new Promise((resolve) =>
    window.addEventListener(DONE_EVENT, () => setTimeout(resolve, ENTRANCE), { once: true }),
  )
}

// A project page's film entrance (FilmIn) marks the page while it plays.
// Resolves once it has finished (right away if none is playing), so heavy
// setup (3D models) waits and the entrance stays smooth.
const FILM_DONE_EVENT = 'film:done'
export function filmStarted() {
  document.documentElement.dataset.film = ''
}
export function filmDone() {
  if (!('film' in document.documentElement.dataset)) return
  delete document.documentElement.dataset.film
  window.dispatchEvent(new Event(FILM_DONE_EVENT))
}
export function whenFilmDone() {
  if (!('film' in document.documentElement.dataset)) return Promise.resolve()
  return new Promise((resolve) => window.addEventListener(FILM_DONE_EVENT, () => resolve(), { once: true }))
}

// Waits for a quiet moment on the page
export function whenIdle() {
  return new Promise((resolve) =>
    'requestIdleCallback' in window
      ? window.requestIdleCallback(() => resolve(), { timeout: 400 })
      : setTimeout(resolve, 30),
  )
}
