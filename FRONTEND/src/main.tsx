// ─────────────────────────────────────────────────────────────
// main.tsx
// Punto de entrada de la aplicación React.
// Monta el árbol de componentes en el div #root del index.html.
// ─────────────────────────────────────────────────────────────

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './contexts/AuthContext';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* AuthProvider envuelve toda la app para que cualquier componente
        pueda acceder al estado de autenticación con useAuth() */}
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
