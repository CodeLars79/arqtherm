import { useEffect } from 'react';
import MaterialLibrary from '../components/materials/MaterialLibrary.jsx';

export default function Materials() {
  return (
    <div className="materials-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Biblioteca</p>
          <h1 className="page-title">Materiales</h1>
          <p className="page-lead">Propiedades térmicas con su fuente, tipo de valor y estado de verificación.</p>
        </div>
      </div>
      <MaterialLibrary />
    </div>
  );
}
