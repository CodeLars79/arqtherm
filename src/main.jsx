import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter, MemoryRouter } from 'react-router-dom';
import App from './App.jsx';
import { IS_HOSTED } from './config.js';
import './styles/fonts.css';
import './styles/variables.css';
import './styles/global.css';
import './styles/layout.css';
import './styles/calculator.css';
import './styles/materials.css';
import './styles/zones.css';
import './styles/legal.css';
import './styles/print.css';

// - VITE_TARGET=hosted: página única publicada en un marco restringido → enrutado en memoria.
// - VITE_ROUTER=hash: alojamiento estático sin reescritura de rutas.
// - Por defecto: BrowserRouter.
let Router = BrowserRouter;
if (IS_HOSTED) Router = MemoryRouter;
else if (import.meta.env.VITE_ROUTER === 'hash') Router = HashRouter;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router>
      <App />
    </Router>
  </StrictMode>
);
