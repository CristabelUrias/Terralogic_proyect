import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { UserProfile } from '../types';

const API_URL = 'http://127.0.0.1:8000/api/v1';

interface AuthContextType {
  profile:         UserProfile | null;
  loading:         boolean;
  isAuthenticated: boolean;
  signOut:         () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifySession = async () => {
      try {
        const token = sessionStorage.getItem('token');
        const raw   = sessionStorage.getItem('user');

        if (!token || !raw) {
          setLoading(false);
          return;
        }

        // Verificar el token contra el backend
        // Si el token es inválido, corrupto o fue revocado → 401
        const res = await fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          // Token inválido — limpiar sesión y mostrar login
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
          setLoading(false);
          return;
        }

        // Token válido — cargar perfil
        const data = JSON.parse(raw);
        setProfile({
          uid:         data.uid,
          displayName: data.displayName,
          email:       data.email,
          photoURL:    data.photoURL ?? undefined,
          role:        data.role,
          createdAt:   data.createdAt,
        });
      } catch {
        // Error de red — mantener sesión local para no bloquear al usuario
        // si el backend está temporalmente caído
        try {
          const raw = sessionStorage.getItem('user');
          if (raw) {
            const data = JSON.parse(raw);
            setProfile({
              uid:         data.uid,
              displayName: data.displayName,
              email:       data.email,
              photoURL:    data.photoURL ?? undefined,
              role:        data.role,
              createdAt:   data.createdAt,
            });
          }
        } catch {
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
        }
      } finally {
        setLoading(false);
      }
    };

    verifySession();
  }, []);

  const signOut = async () => {
    try {
      const token = sessionStorage.getItem('token');
      if (token) {
        await fetch(`${API_URL}/auth/logout`, {
          method:  'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // Si falla el logout del backend, igual cerramos sesión local
    } finally {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      setProfile(null);
      window.location.href = '/auth';
    }
  };

  return (
    <AuthContext.Provider value={{
      profile,
      loading,
      isAuthenticated: profile !== null,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de un AuthProvider');
  return context;
}