// "sagi levin" wordmark. Uses public/logos/SagilevinLOGO.svg as a mask and
// fills it with the current text color, so it follows each project's palette.
// Replacing that file updates the logo everywhere.
export default function Logo({ className = '' }) {
  return <span className={`logo-mark ${className}`} aria-hidden="true" />
}
