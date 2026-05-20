import { ReactNode, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { TabId } from '../../types';

interface LayoutProps {
  children: ReactNode;
}

const API_URL = '/api/v1';

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const getTabFromUrl = (): TabId => {
    const path = location.pathname.split('/')[1];
    return (path as TabId) || 'dashboard';
  };

  const [activeTab,   setActiveTab]   = useState<TabId>(getTabFromUrl());
  const [alertCount,  setAlertCount]  = useState(0);

  useEffect(() => {
    setActiveTab(getTabFromUrl());
  }, [location.pathname]);

  // Cargar conteo real de alertas activas
  useEffect(() => {
    const fetchAlertCount = async () => {
      try {
        const token = sessionStorage.getItem('token');
        const res   = await fetch(`${API_URL}/alerts/`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          // Solo contar las no leídas
          const unread = data.items.filter((a: any) => !a.is_read).length;
          setAlertCount(unread);
        }
      } catch {
        // Si falla silenciosamente, no mostramos badge
        setAlertCount(0);
      }
    };

    fetchAlertCount();

    // Refrescar cada 60 segundos
    const interval = setInterval(fetchAlertCount, 60_000);
    return () => clearInterval(interval);
  }, []);

  const handleSignOut = () => {
    sessionStorage.clear();
    window.location.href = '/auth';
  };

  return (
    <div className="flex h-screen bg-[#f9fafb] overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        alertCount={alertCount}
        onSignOut={handleSignOut}
        onNewReport={() => console.log("Nuevo Reporte")}
      />
      <div className="flex flex-col flex-1 w-0 overflow-hidden">
        <Navbar />
        <main className="flex-1 relative overflow-y-auto p-4 md:p-8">
          <div className="max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}