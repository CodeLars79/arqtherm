import { NavLink, Link } from 'react-router-dom';
import { APP_NAME } from '../../config.js';

const linkClass = ({ isActive }) => `nav__link ${isActive ? 'nav__link--active' : ''}`;

export default function Navbar() {
  return (
    <header className="site-header no-print">
      <a className="skip-link" href="#main">Saltar al contenido</a>
      <div className="site-header__inner">
        <Link to="/" className="brand" aria-label={`${APP_NAME}, inicio`}>
          <span className="brand__mark" aria-hidden="true">
            <span /><span /><span />
          </span>
          <span className="brand__name">Arq<em>therm</em></span>
        </Link>
        <nav aria-label="Principal">
          <ul className="nav">
            <li><NavLink to="/calculadora" className={linkClass}>Calculadora</NavLink></li>
            <li><NavLink to="/materiales" className={linkClass}>Materiales</NavLink></li>
            <li><NavLink to="/zonas-climaticas" className={linkClass} aria-label="Zonas climáticas">Zonas<span className="nav__long"> climáticas</span></NavLink></li>
            <li><NavLink to="/acerca-de" className={linkClass}>Acerca de</NavLink></li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
