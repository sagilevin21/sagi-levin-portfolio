import { Link, NavLink } from 'react-router-dom'
import { site } from '../data/site'
import Logo from './Logo'

export default function Header() {
  return (
    <header className="site-header">
      <Link to="/" className="logo" aria-label={`${site.name}, home`}>
        <Logo />
      </Link>
      <nav className="site-nav" aria-label="Main">
        <NavLink to="/work">Work</NavLink>
        <NavLink to="/about">About</NavLink>
        <a href={`mailto:${site.email}`}>Contact</a>
      </nav>
    </header>
  )
}
