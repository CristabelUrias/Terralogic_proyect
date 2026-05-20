import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { CheckCircle2, XCircle, Loader2, Sprout } from 'lucide-react';

const API_URL = 'http://127.0.0.1:8000/api/v1';

export default function VerifyEmailPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Enlace de verificación inválido.');
            return;
        }

        const verify = async () => {
            try {
                const res = await fetch(`${API_URL}/auth/verify-email?token=${token}`);
                const data = await res.json();

                if (res.ok) {
                    // Guardar sesión automáticamente
                    sessionStorage.setItem('token', data.access_token);
                    sessionStorage.setItem('user', JSON.stringify(data.user));
                    setStatus('success');
                    setMessage(data.message);
                    // Redirigir al dashboard tras 2 segundos
                    setTimeout(() => { window.location.href = '/dashboard'; }, 2500);
                } else {
                    setStatus('error');
                    setMessage(data.detail || 'Error al verificar la cuenta.');
                }
            } catch {
                setStatus('error');
                setMessage('Error de conexión. Verifica que el backend esté corriendo.');
            }
        };

        verify();
    }, [token]);

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
            {/* Fondo */}
            <div className="absolute inset-0">
                <img
                    src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=2000"
                    className="w-full h-full object-cover"
                    alt=""
                />
                <div className="absolute inset-0 bg-agri-green-950/70" />
            </div>

            {/* Card glassmorphism */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 w-full max-w-md mx-4 p-10 text-center"
                style={{
                    background: 'rgba(240,248,240,0.85)',
                    backdropFilter: 'blur(32px)',
                    WebkitBackdropFilter: 'blur(32px)',
                    border: '1px solid rgba(255,255,255,0.6)',
                    borderRadius: '2rem',
                    boxShadow: '0 8px 64px rgba(0,0,0,0.25)',
                }}
            >
                {/* Logo */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-agri-green-600 flex items-center justify-center text-white">
                        <Sprout size={20} />
                    </div>
                    <span className="font-black text-agri-green-950 text-xl tracking-tight">TerraLogic AI</span>
                </div>

                {/* Estado loading */}
                {status === 'loading' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <Loader2 size={56} className="animate-spin text-agri-green-600 mx-auto mb-4" />
                        <h2 className="text-xl font-black text-agri-green-950 mb-2">Verificando tu cuenta...</h2>
                        <p className="text-earth-500 text-sm">Por favor espera un momento.</p>
                    </motion.div>
                )}

                {/* Estado éxito */}
                {status === 'success' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="w-20 h-20 rounded-full bg-agri-green-100 flex items-center justify-center mx-auto mb-5">
                            <CheckCircle2 size={44} className="text-agri-green-600" />
                        </div>
                        <h2 className="text-2xl font-black text-agri-green-950 mb-3">¡Cuenta verificada!</h2>
                        <p className="text-earth-600 text-sm mb-6">{message}</p>
                        <div className="flex items-center justify-center gap-2 text-agri-green-600 text-sm font-bold">
                            <Loader2 size={16} className="animate-spin" />
                            Redirigiendo al panel...
                        </div>
                    </motion.div>
                )}

                {/* Estado error */}
                {status === 'error' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-5">
                            <XCircle size={44} className="text-red-500" />
                        </div>
                        <h2 className="text-2xl font-black text-agri-green-950 mb-3">Enlace inválido</h2>
                        <p className="text-earth-600 text-sm mb-6">{message}</p>
                        <button
                            onClick={() => navigate('/auth')}
                            className="w-full py-3.5 rounded-2xl font-black text-sm text-white transition-all"
                            style={{ background: '#16a34a' }}
                        >
                            Volver al inicio
                        </button>
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
}