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

// Waits for a quiet moment on the page
export function whenIdle() {
  return new Promise((resolve) =>
    'requestIdleCallback' in window
      ? window.requestIdleCallback(() => resolve(), { timeout: 400 })
      : setTimeout(resolve, 30),
  )
}
