import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { RouteSeo } from './seo/useSeo.js';
import { useEffect } from 'react';
import Navbar from './components/layout/Navbar.jsx';
import Footer from './components/layout/Footer.jsx';
import Home from './pages/Home.jsx';
import Calculator from './pages/Calculator.jsx';
import Materials from './pages/Materials.jsx';
import About from './pages/About.jsx';
import ClimateZones from './pages/ClimateZones.jsx';
import NotFound from './pages/NotFound.jsx';
import { AppDataProvider } from './state/AppDataContext.jsx';
import { ConsentProvider } from './state/ConsentContext.jsx';
import Legal from './pages/Legal.jsx';
import { CookieBanner, CookieSettings } from './components/legal/CookieConsent.jsx';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return <RouteSeo pathname={pathname} />;
}

export default function App() {
  return (
    <ConsentProvider>
    <AppDataProvider>
      <ScrollToTop />
      <Navbar />
      <main id="main" className="site-main" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/calculadora" element={<Calculator />} />
          <Route path="/materiales" element={<Materials />} />
          <Route path="/zonas-climaticas" element={<ClimateZones />} />
          <Route path="/acerca-de" element={<About />} />
          <Route path="/legal/*" element={<Legal />} />
          {/* Rutas anteriores (en inglés): redirección permanente a las nuevas */}
          <Route path="/calculator" element={<Navigate to="/calculadora" replace />} />
          <Route path="/materials" element={<Navigate to="/materiales" replace />} />
          <Route path="/about" element={<Navigate to="/acerca-de" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <CookieBanner />
      <CookieSettings />
    </AppDataProvider>
    </ConsentProvider>
  );
}
