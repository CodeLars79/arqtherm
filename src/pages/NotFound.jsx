import { useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="notfound">
      <p className="notfound__code num">404</p>
      <h1 className="page-title">Esta página no existe</h1>
      <p className="muted">La dirección no corresponde a ninguna sección de Arqtherm.</p>
      <Link to="/calculadora" className="btn btn--primary">Ir a la calculadora</Link>
    </div>
  );
}
