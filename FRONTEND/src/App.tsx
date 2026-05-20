import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/layout/Layout';
import { TabId } from './types';
import { type AlertItem } from './services/alerts.service';
import { listAnalyses } from './services/history.service';

import AuthPage            from './pages/AuthPage';
import VerifyEmailPage     from './pages/Verifyemailpage';
import DashboardPage       from './pages/DashboardPage';
import FieldsPage          from './pages/FieldsPage';
import AnalysisPage        from './pages/AnalysisPage';
import HistoryPage         from './pages/HistoryPage';
import AlertsPage          from './pages/AlertsPage';
import SettingsPage   from './pages/SettingsPage';
import CalendarPage  from './pages/CalendarPage';

interface GeminiResult {
  field_name:        string;
  resultado:         'Saludable' | 'Alerta' | 'Estrés';
  enfermedades:      { count: number; detalle: string };
  estres_hidrico:    { porcentaje: number; nivel: string };
  plagas:            { count: number; detalle: string };
  ndvi:              number;
  cobertura_vegetal: number;
  insight:           string;
  confianza:         number;
}

// ── Rutas autenticadas ────────────────────────────────────────
function AuthenticatedRoutes({
  alerts, setAlerts,
  lastAnalysisImage, lastAnalysisField, lastAnalysisResult,
  handleAnalysisComplete, handleNavigate,
}: any) {
  const location = useLocation();

  const handleNotify = (msg: string) => {
    console.log(`[TerraLogic]: ${msg}`);
  };

  return (
    <Layout>
      <Routes location={location} key={location.pathname}>
        <Route path="/dashboard" element={
          <DashboardPage
            lastAnalysisImage={lastAnalysisImage}
            lastAnalysisField={lastAnalysisField}
            lastAnalysisResult={lastAnalysisResult}
            onNavigate={handleNavigate}
          />
        } />
        <Route path="/fields"   element={<FieldsPage onNavigate={handleNavigate} initialField={sessionStorage.getItem('alertField')} />} />
        <Route path="/analysis" element={<AnalysisPage onNotify={handleNotify} onAnalysisComplete={handleAnalysisComplete} />} />
        <Route path="/history"  element={<HistoryPage lastAnalysisField={lastAnalysisField} />} />
        <Route path="/alerts"   element={<AlertsPage alerts={alerts} setAlerts={setAlerts} onNavigate={handleNavigate} />} />
        <Route path="/settings" element={<SettingsPage onNotify={handleNotify} />} />
        <Route path="/calendar" element={<CalendarPage onNavigate={handleNavigate} />} />
        <Route path="*"         element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
}

// ── App principal ─────────────────────────────────────────────
export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [alerts,          setAlerts]          = useState<AlertItem[]>([]);
  const [lastAnalysisImage,  setLastAnalysisImage]  = useState<string | null>(null);
  const [lastAnalysisField,  setLastAnalysisField]  = useState<string | null>(null);
  const [lastAnalysisResult, setLastAnalysisResult] = useState<GeminiResult | null>(null);

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    setIsAuthenticated(!!token);

    // Al iniciar sesión cargar el último análisis del historial
    if (token) {
      listAnalyses(0, 1).then(data => {
        const last = data.items[0];
        if (!last) return;

        const result: GeminiResult = {
          field_name:        last.field_name,
          resultado:         last.result as 'Saludable' | 'Alerta' | 'Estrés',
          enfermedades:      { count: last.diseases_count,        detalle: last.enf_detalle   },
          estres_hidrico:    { porcentaje: last.water_stress_pct, nivel: last.nivel_estres     },
          plagas:            { count: last.plagas_count,          detalle: last.plagas_detalle },
          ndvi:              last.ndvi,
          cobertura_vegetal: last.cobertura,
          insight:           last.ai_insight,
          confianza:         last.confianza,
        };

        setLastAnalysisField(last.field_name);
        setLastAnalysisResult(result);

        // Restaurar imagen solo si pertenece al último campo analizado
        const savedImage      = localStorage.getItem('lastAnalysisImage');
        const savedImageField = localStorage.getItem('lastAnalysisImageField');

        if (savedImage && savedImageField === last.field_name) {
          setLastAnalysisImage(savedImage);
        }
      }).catch(() => {});
    }
  }, []);

  const handleNavigate = (tab: TabId, field?: string) => {
    if (field) sessionStorage.setItem('alertField', field);
    else sessionStorage.removeItem('alertField');
    window.location.href = `/${tab}`;
  };

  const handleAnalysisComplete = (imageUrl: string, fieldId: string, result?: GeminiResult, analysisId?: string) => {
    setLastAnalysisImage(imageUrl);
    setLastAnalysisField(fieldId);
    if (result) setLastAnalysisResult(result);

    // Guardar imagen en localStorage — por campo (para dashboard) y por ID (para historial)
    fetch(imageUrl)
      .then(r => r.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onload = () => {
          const b64 = reader.result as string;
          if (b64.length < 800000) {
            localStorage.setItem('lastAnalysisImage',      b64);
            localStorage.setItem('lastAnalysisImageField', fieldId);
            if (analysisId) {
              localStorage.setItem(`analysisImage_${analysisId}`, b64);
            }
          }
        };
        reader.readAsDataURL(blob);
      })
      .catch(() => {});
  };

  if (isAuthenticated === null) return null;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth"         element={!isAuthenticated ? <AuthPage /> : <Navigate to="/dashboard" replace />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        {isAuthenticated ? (
          <Route path="/*" element={
            <AuthenticatedRoutes
              alerts={alerts}
              setAlerts={setAlerts}
              lastAnalysisImage={lastAnalysisImage}
              lastAnalysisField={lastAnalysisField}
              lastAnalysisResult={lastAnalysisResult}
              handleAnalysisComplete={handleAnalysisComplete}
              handleNavigate={handleNavigate}
            />
          } />
        ) : (
          <Route path="*" element={<Navigate to="/auth" replace />} />
        )}
      </Routes>
    </BrowserRouter>
  );
}