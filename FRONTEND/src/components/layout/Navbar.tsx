import { Bell, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Navbar() {
  const { profile } = useAuth();
  const navigate    = useNavigate();

  const displayName = profile?.displayName || 'Usuario';
  const email       = profile?.email || '';
  const photoURL    = profile?.photoURL || null;

  // Iniciales para el avatar de fallback
  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const roleLabel =
    profile?.role === 'admin'    ? 'Administrador' :
    profile?.role === 'agronomo' ? 'Agrónomo'      : 'Cliente';

  return (
    <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 flex-shrink-0 z-40">

      {/* Bienvenida dinámica en lugar del buscador */}
      <div className="flex flex-col">
        <p className="text-xs font-bold text-earth-400 uppercase tracking-widest">Bienvenido de nuevo</p>
        <p className="text-lg font-black text-agri-green-950 tracking-tight">{displayName}</p>
      </div>

      {/* Acciones y perfil */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">

          {/* Campana — navega a alertas */}
          <button
            onClick={() => navigate('/alerts')}
            className="p-2.5 text-gray-400 hover:bg-gray-50 rounded-xl transition-colors relative group"
            title="Ver alertas"
          >
            <Bell size={20} />
          </button>

          {/* Engranaje — navega a configuración */}
          <button
            onClick={() => navigate('/settings')}
            className="p-2.5 text-gray-400 hover:bg-gray-50 rounded-xl transition-colors"
            title="Configuración"
          >
            <Settings size={20} />
          </button>
        </div>

        <div className="h-8 w-[1px] bg-gray-100 mx-2" />

        {/* Perfil */}
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-3 hover:bg-earth-50 px-3 py-2 rounded-2xl transition-all"
        >
          <div className="text-right hidden sm:block">
            <p className="text-sm font-black text-agri-green-950 leading-none">{displayName}</p>
            <p className="text-[10px] font-bold text-agri-green-600 uppercase tracking-widest mt-1">
              {roleLabel}
            </p>
          </div>

          {/* Avatar — foto real o iniciales */}
          <div className="w-10 h-10 rounded-xl bg-agri-green-100 border border-agri-green-200 flex items-center justify-center text-agri-green-700 font-black text-sm shadow-sm overflow-hidden flex-shrink-0">
            {photoURL ? (
              <img src={photoURL} alt={displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span>{initials}</span>
            )}
          </div>
        </button>
      </div>
    </header>
  );
}