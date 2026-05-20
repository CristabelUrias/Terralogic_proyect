import { useState, useEffect, useRef, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sprout, ArrowRight, AlertCircle, Loader2, Eye, EyeOff, CheckCircle2, XCircle, Mail } from 'lucide-react';
import { registerUser, loginUser } from '../services/auth.service';
import { useYear } from '../hooks';

const API_URL = 'http://127.0.0.1:8000/api/v1';
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const CAROUSEL_SLIDES = [
  { url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=2000', title: 'Monitoreo de cultivos', caption: 'Análisis multiespectral en tiempo real con Gemini AI' },
  { url: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=2000', title: 'Detección temprana', caption: 'Identifica enfermedades y plagas antes de que se propaguen' },
  { url: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&q=80&w=2000', title: 'Gestión inteligente', caption: 'Optimiza el riego y los recursos con datos precisos' },
  { url: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&q=80&w=2000', title: 'Agricultura de precisión', caption: 'Toma decisiones basadas en evidencia científica' },
  { url: 'https://images.unsplash.com/photo-1560493676-04071c5f467b?auto=format&fit=crop&q=80&w=2000', title: 'Rendimiento óptimo', caption: 'Maximiza la productividad de cada hectárea' },
];

const PASSWORD_RULES = [
  { id: 'length', label: 'Mínimo 8 caracteres',  test: (p: string) => p.length >= 8     },
  { id: 'number', label: 'Al menos un número',   test: (p: string) => /[0-9]/.test(p)   },
  { id: 'letter', label: 'Al menos una letra',   test: (p: string) => /[A-Za-z]/.test(p)},
];

function getStrength(p: string) { return PASSWORD_RULES.filter(r => r.test(p)).length; }
const STRENGTH_COLORS = ['', 'bg-red-400', 'bg-orange-400', 'bg-agri-green-400'];
const STRENGTH_TEXT   = ['', 'text-red-500', 'text-orange-500', 'text-agri-green-600'];
const STRENGTH_LABELS = ['', 'Débil', 'Media', 'Fuerte'];

// ── Pantalla de ingreso de código OTP ─────────────────────────
function OTPScreen({ email, onSuccess }: { email: string; onSuccess: (token: string, user: any) => void }) {
  const [digits,    setDigits]    = useState(['', '', '', '', '', '']);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resent,    setResent]    = useState(false);
  const refs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null),
                useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  const handleChange = (i: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const newDigits = [...digits];
    newDigits[i] = val.slice(-1);
    setDigits(newDigits);
    setError(null);
    if (val && i < 5) refs[i + 1].current?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs[i - 1].current?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(''));
      refs[5].current?.focus();
    }
  };

  const handleVerify = async () => {
    const code = digits.join('');
    if (code.length < 6) { setError('Ingresa los 6 dígitos del código.'); return; }
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`${API_URL}/auth/verify-otp`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (res.ok) {
        onSuccess(data.access_token, data.user);
      } else {
        setError(data.detail || 'Código incorrecto.');
        setDigits(['', '', '', '', '', '']);
        refs[0].current?.focus();
      }
    } catch {
      setError('Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await fetch(`${API_URL}/auth/resend-otp`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      });
      setResent(true);
      setTimeout(() => setResent(false), 4000);
    } catch {}
    finally { setResending(false); }
  };

  return (
    <div className="w-full p-10 text-center"
      style={{ background:'rgba(240,248,240,0.88)', backdropFilter:'blur(32px)', WebkitBackdropFilter:'blur(32px)',
               border:'1px solid rgba(255,255,255,0.6)', borderRadius:'2rem', boxShadow:'0 8px 64px rgba(0,0,0,0.25)' }}>

      <div className="w-16 h-16 rounded-full bg-agri-green-100 flex items-center justify-center mx-auto mb-5">
        <Mail size={32} className="text-agri-green-600" />
      </div>
      <h2 className="text-2xl font-black text-agri-green-950 mb-2">Verifica tu cuenta</h2>
      <p className="text-earth-500 text-sm mb-1">Ingresa el código de 6 dígitos enviado a:</p>
      <p className="font-black text-agri-green-700 text-sm mb-6">{email}</p>

      {/* Inputs OTP */}
      <div className="flex justify-center gap-3 mb-6" onPaste={handlePaste}>
        {digits.map((d, i) => (
          <input key={i} ref={refs[i]} type="text" inputMode="numeric" maxLength={1} value={d}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            className="w-12 h-14 text-center text-2xl font-black rounded-2xl outline-none transition-all"
            style={{
              background: d ? 'rgba(46,125,50,0.12)' : 'rgba(255,255,255,0.6)',
              border: d ? '2px solid #2E7D32' : '2px solid rgba(0,0,0,0.12)',
              color: '#1B5E20',
            }}
            onFocus={e => e.target.style.border = '2px solid #2E7D32'}
            onBlur={e  => e.target.style.border = d ? '2px solid #2E7D32' : '2px solid rgba(0,0,0,0.12)'}
          />
        ))}
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="p-3 rounded-xl flex gap-2 text-xs font-bold text-red-700 mb-4"
            style={{ background: 'rgba(254,226,226,0.9)', border: '1px solid rgba(239,68,68,0.4)' }}>
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" /> {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botón verificar */}
      <button onClick={handleVerify} disabled={loading || digits.join('').length < 6}
        className="w-full py-4 rounded-2xl font-black text-sm text-white mb-4 transition-all disabled:opacity-50"
        style={{ background: '#16a34a' }}>
        {loading ? <Loader2 className="animate-spin mx-auto" size={18} /> : 'Verificar cuenta →'}
      </button>

      {/* Reenviar */}
      <div className="flex items-center justify-center gap-2 text-sm">
        <span className="text-earth-500">¿No llegó el código?</span>
        <button onClick={handleResend} disabled={resending}
          className="font-black text-agri-green-600 hover:text-agri-green-800 transition-colors disabled:opacity-50">
          {resending ? 'Enviando...' : resent ? '¡Enviado!' : 'Reenviar código'}
        </button>
      </div>
    </div>
  );
}

// ── Página principal de autenticación ─────────────────────────
// ── Pantalla de recuperación de contraseña ───────────────────
type ForgotStep = 'email' | 'otp' | 'newpassword' | 'done';

function ForgotPasswordScreen({ onBack }: { onBack: () => void }) {
  const [step,        setStep]        = useState<ForgotStep>('email');
  const [email,       setEmail]       = useState('');
  const [digits,      setDigits]      = useState(['','','','','','']);
  const [newPassword, setNewPassword] = useState('');
  const [showPwd,     setShowPwd]     = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const refs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null),
                useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  const strength  = getStrength(newPassword);
  const allPassed = strength === PASSWORD_RULES.length;

  const inputStyle = {
    background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(0,0,0,0.12)',
    backdropFilter: 'blur(8px)', color: '#1a2e1a',
  };

  // Paso 1 — Enviar OTP al correo
  const handleSendOTP = async () => {
    if (!isValidEmail(email)) { setError('Ingresa un correo válido.'); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) setStep('otp');
      else { const d = await res.json(); setError(d.detail || 'Error al enviar el código.'); }
    } catch { setError('Error de conexión.'); }
    finally { setLoading(false); }
  };

  // Paso 2 — Verificar OTP
  const handleVerifyOTP = async () => {
    const code = digits.join('');
    if (code.length < 6) { setError('Ingresa los 6 dígitos.'); return; }
    setError(null);
    setStep('newpassword');
  };

  // Paso 3 — Cambiar contraseña
  const handleReset = async () => {
    if (!allPassed) { setError('La contraseña no cumple los requisitos.'); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: digits.join(''), new_password: newPassword }),
      });
      const data = await res.json();
      if (res.ok) setStep('done');
      else setError(data.detail || 'Error al cambiar la contraseña.');
    } catch { setError('Error de conexión.'); }
    finally { setLoading(false); }
  };

  const handleDigitChange = (i: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const d = [...digits]; d[i] = val.slice(-1); setDigits(d); setError(null);
    if (val && i < 5) refs[i+1].current?.focus();
  };

  const handleDigitKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs[i-1].current?.focus();
  };

  const cardStyle = {
    background: 'rgba(240,248,240,0.88)', backdropFilter: 'blur(32px)',
    WebkitBackdropFilter: 'blur(32px)', border: '1px solid rgba(255,255,255,0.6)',
    borderRadius: '2rem', padding: '2.5rem', boxShadow: '0 8px 64px rgba(0,0,0,0.25)',
  };

  return (
    <motion.div initial={{ opacity:0, x:30 }} animate={{ opacity:1, x:0 }}
      exit={{ opacity:0, x:-30 }} className="w-full" style={cardStyle}>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-black/5 transition-colors text-agri-green-700">
          ← 
        </button>
        <div>
          <h2 className="text-2xl font-black text-agri-green-950 tracking-tight">
            {step === 'done' ? '¡Listo!' : 'Recuperar contraseña'}
          </h2>
          <p className="text-earth-500 text-xs mt-0.5">
            {step === 'email'       && 'Ingresa tu correo registrado'}
            {step === 'otp'        && `Código enviado a ${email}`}
            {step === 'newpassword' && 'Crea tu nueva contraseña'}
            {step === 'done'        && 'Contraseña actualizada'}
          </p>
        </div>
      </div>

      {/* Paso 1 — Email */}
      {step === 'email' && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-agri-green-900 uppercase tracking-widest ml-1">Correo electrónico</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="nombre@gmail.com"
              className="glass-input w-full rounded-2xl px-4 py-3.5 text-sm font-medium outline-none transition-all"
              style={inputStyle}
              onFocus={e => { e.target.style.border='1px solid rgba(22,163,74,0.8)'; e.target.style.background='rgba(255,255,255,0.75)'; }}
              onBlur={e  => { e.target.style.border='1px solid rgba(0,0,0,0.12)'; e.target.style.background='rgba(255,255,255,0.55)'; }}
              onKeyDown={e => e.key === 'Enter' && handleSendOTP()}
            />
          </div>
          {error && <p className="text-red-600 text-xs font-bold flex items-center gap-1"><AlertCircle size={12}/>{error}</p>}
          <button onClick={handleSendOTP} disabled={loading}
            className="w-full py-4 rounded-2xl font-black text-sm text-white transition-all disabled:opacity-50"
            style={{ background:'#16a34a' }}>
            {loading ? <Loader2 className="animate-spin mx-auto" size={18}/> : 'Enviar código →'}
          </button>
        </div>
      )}

      {/* Paso 2 — OTP */}
      {step === 'otp' && (
        <div className="space-y-5">
          <p className="text-earth-500 text-sm text-center">Ingresa el código de 6 dígitos de tu correo</p>
          <div className="flex justify-center gap-3">
            {digits.map((d, i) => (
              <input key={i} ref={refs[i]} type="text" inputMode="numeric" maxLength={1} value={d}
                onChange={e => handleDigitChange(i, e.target.value)}
                onKeyDown={e => handleDigitKey(i, e)}
                className="w-12 h-14 text-center text-2xl font-black rounded-2xl outline-none transition-all"
                style={{ background: d ? 'rgba(46,125,50,0.12)':'rgba(255,255,255,0.6)', border: d ? '2px solid #2E7D32':'2px solid rgba(0,0,0,0.12)', color:'#1B5E20' }}
                onFocus={e => e.target.style.border='2px solid #2E7D32'}
                onBlur={e  => e.target.style.border= d ? '2px solid #2E7D32':'2px solid rgba(0,0,0,0.12)'}
              />
            ))}
          </div>
          {error && <p className="text-red-600 text-xs font-bold flex items-center justify-center gap-1"><AlertCircle size={12}/>{error}</p>}
          <button onClick={handleVerifyOTP} disabled={digits.join('').length < 6}
            className="w-full py-4 rounded-2xl font-black text-sm text-white transition-all disabled:opacity-50"
            style={{ background:'#16a34a' }}>
            Verificar código →
          </button>
        </div>
      )}

      {/* Paso 3 — Nueva contraseña */}
      {step === 'newpassword' && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-agri-green-900 uppercase tracking-widest ml-1">Nueva contraseña</label>
            <div className="relative">
              <input type={showPwd ? 'text' : 'password'} value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="glass-input w-full rounded-2xl pl-4 pr-12 py-3.5 text-sm font-medium outline-none transition-all"
                style={inputStyle}
                onFocus={e => { e.target.style.border='1px solid rgba(22,163,74,0.8)'; e.target.style.background='rgba(255,255,255,0.75)'; }}
                onBlur={e  => { e.target.style.border='1px solid rgba(0,0,0,0.12)'; e.target.style.background='rgba(255,255,255,0.55)'; }}
              />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-agri-green-700/50 hover:text-agri-green-700">
                {showPwd ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
            {newPassword.length > 0 && (
              <div className="p-3 rounded-2xl space-y-2 mt-2"
                style={{ background:'rgba(255,255,255,0.5)', border:'1px solid rgba(0,0,0,0.08)' }}>
                <div className="flex gap-1">
                  {PASSWORD_RULES.map((_, i) => (
                    <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i < strength ? STRENGTH_COLORS[strength] : 'bg-black/10'}`} />
                  ))}
                </div>
                {PASSWORD_RULES.map(rule => {
                  const ok = rule.test(newPassword);
                  return (
                    <div key={rule.id} className="flex items-center gap-2">
                      {ok ? <CheckCircle2 size={12} className="text-agri-green-600 flex-shrink-0"/>
                          : <XCircle      size={12} className="text-earth-300 flex-shrink-0"/>}
                      <span className={`text-xs font-bold ${ok ? 'text-agri-green-700' : 'text-earth-400'}`}>{rule.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {error && <p className="text-red-600 text-xs font-bold flex items-center gap-1"><AlertCircle size={12}/>{error}</p>}
          <button onClick={handleReset} disabled={loading || !allPassed}
            className="w-full py-4 rounded-2xl font-black text-sm text-white transition-all disabled:opacity-50"
            style={{ background:'#16a34a' }}>
            {loading ? <Loader2 className="animate-spin mx-auto" size={18}/> : 'Cambiar contraseña →'}
          </button>
        </div>
      )}

      {/* Paso 4 — Éxito */}
      {step === 'done' && (
        <div className="text-center space-y-5">
          <div className="w-20 h-20 rounded-full bg-agri-green-100 flex items-center justify-center mx-auto">
            <CheckCircle2 size={44} className="text-agri-green-600"/>
          </div>
          <p className="text-earth-600 text-sm leading-relaxed">
            Tu contraseña ha sido actualizada correctamente. Ya puedes iniciar sesión con tu nueva contraseña.
          </p>
          <button onClick={onBack}
            className="w-full py-4 rounded-2xl font-black text-sm text-white transition-all"
            style={{ background:'#16a34a' }}>
            Ir al inicio de sesión →
          </button>
        </div>
      )}
    </motion.div>
  );
}

export default function AuthPage() {
  const year = useYear();
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setCurrentSlide(p => (p + 1) % CAROUSEL_SLIDES.length), 5000);
    return () => clearInterval(t);
  }, []);

  const [isLogin,         setIsLogin]         = useState(true);
  const [displayName,     setDisplayName]     = useState('');
  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [showPassword,    setShowPassword]    = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [pwdFocused,      setPwdFocused]      = useState(false);
  const [showOTP,         setShowOTP]         = useState(false);
  const [showForgot,      setShowForgot]      = useState(false);
  const [pendingEmail,    setPendingEmail]    = useState('');

  const strength  = getStrength(password);
  const allPassed = strength === PASSWORD_RULES.length;

  const validate = (): string | null => {
    if (!isLogin && displayName.trim().length < 2) return 'El nombre debe tener al menos 2 caracteres.';
    if (!isValidEmail(email)) return 'Ingresa un correo electrónico válido.';
    if (!isLogin && !allPassed) return 'La contraseña no cumple los requisitos de seguridad.';
    if (isLogin && password.length < 1) return 'Ingresa tu contraseña.';
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true);
    try {
      if (isLogin) {
        const response = await loginUser({ email, password });
        sessionStorage.setItem('token', response.access_token);
        sessionStorage.setItem('user', JSON.stringify(response.user));
        window.location.href = '/dashboard';
      } else {
        await registerUser({ email, password, display_name: displayName });
        setPendingEmail(email);
        setShowOTP(true);
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Error de conexión';
      setError(typeof msg === 'string' ? msg : 'Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPSuccess = (token: string, user: any) => {
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('user', JSON.stringify(user));
    window.location.href = '/dashboard';
  };

  const switchMode = (login: boolean) => {
    setIsLogin(login); setError(null);
    setEmail(''); setPassword(''); setDisplayName(''); setPwdFocused(false);
  };

  const slide = CAROUSEL_SLIDES[currentSlide];

  const inputStyle = {
    background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(0,0,0,0.12)',
    backdropFilter: 'blur(8px)', color: '#1a2e1a',
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
      {/* Fondo carrusel */}
      <AnimatePresence mode="sync">
        <motion.div key={currentSlide} initial={{ opacity: 0, scale: 1.06 }} animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }} transition={{ duration: 1.4, ease: 'easeInOut' }} className="absolute inset-0">
          <img src={slide.url} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-agri-green-950/60" />
        </motion.div>
      </AnimatePresence>

      <div className="relative z-10 w-full min-h-screen flex">
        {/* Columna izquierda */}
        <div className="hidden lg:flex flex-col justify-between p-16 flex-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-agri-green-500/80 backdrop-blur-sm flex items-center justify-center text-white border border-agri-green-400/30">
              <Sprout size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tighter leading-none">TerraLogic</h1>
              <p className="text-agri-green-400 text-[10px] font-bold uppercase tracking-widest">IA Agrícola de Precisión</p>
            </div>
          </div>
          <div className="max-w-lg">
            <AnimatePresence mode="wait">
              <motion.div key={currentSlide} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.7 }}>
                <h2 className="text-6xl font-black text-white leading-tight mb-4 tracking-tighter">{slide.title}</h2>
                <p className="text-white/70 text-lg font-medium leading-relaxed">{slide.caption}</p>
              </motion.div>
            </AnimatePresence>
            <div className="flex items-center gap-2 mt-10">
              {CAROUSEL_SLIDES.map((_, i) => (
                <button key={i} onClick={() => setCurrentSlide(i)}
                  className={`transition-all duration-300 rounded-full ${i === currentSlide ? 'w-8 h-2 bg-agri-green-400' : 'w-2 h-2 bg-white/30'}`} />
              ))}
            </div>
          </div>
          <p className="text-white/30 text-xs font-bold uppercase tracking-widest">© {year} TerraLogic AI</p>
        </div>

        {/* Columna derecha */}
        <div className="w-full lg:w-[460px] flex items-center justify-center p-6 lg:p-10">
          <AnimatePresence mode="wait">
            {showForgot ? (
              <motion.div key="forgot" initial={{ opacity:0, x:30 }} animate={{ opacity:1, x:0 }}
                exit={{ opacity:0, x:-30 }} className="w-full">
                <ForgotPasswordScreen onBack={() => setShowForgot(false)} />
              </motion.div>
            ) : showOTP ? (
              <motion.div key="otp" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }} className="w-full">
                <OTPScreen email={pendingEmail} onSuccess={handleOTPSuccess} />
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }} className="w-full"
                style={{ background:'rgba(240,248,240,0.88)', backdropFilter:'blur(32px)',
                         WebkitBackdropFilter:'blur(32px)', border:'1px solid rgba(255,255,255,0.6)',
                         borderRadius:'2rem', padding:'2.5rem', boxShadow:'0 8px 64px rgba(0,0,0,0.25)' }}>

                <div className="flex lg:hidden items-center gap-2 mb-6">
                  <div className="w-8 h-8 rounded-xl bg-agri-green-600 flex items-center justify-center text-white"><Sprout size={16} /></div>
                  <span className="font-black text-agri-green-950 text-lg">TerraLogic</span>
                </div>

                <h2 className="text-3xl font-black text-agri-green-950 tracking-tight mb-1">
                  {isLogin ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}
                </h2>
                <p className="text-earth-500 text-sm mb-6">
                  {isLogin ? 'Accede a tu panel de monitoreo' : 'Solo Gmail y Outlook permitidos'}
                </p>

                {/* Tabs */}
                <div className="flex gap-2 p-1.5 rounded-2xl mb-6"
                  style={{ background:'rgba(0,0,0,0.08)', border:'1px solid rgba(0,0,0,0.06)' }}>
                  {[{ label:'Iniciar Sesión', val:true }, { label:'Crear Cuenta', val:false }].map(({ label, val }) => (
                    <button key={label} onClick={() => switchMode(val)}
                      className="flex-1 py-2.5 text-sm font-bold rounded-xl transition-all"
                      style={isLogin === val ? { background:'#16a34a', color:'#fff', boxShadow:'0 2px 8px rgba(22,163,74,0.4)' } : { color:'rgba(0,0,0,0.45)' }}>
                      {label}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <AnimatePresence>
                    {!isLogin && (
                      <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }}
                        exit={{ opacity:0, height:0 }} className="overflow-hidden space-y-1.5">
                        <label className="text-[10px] font-black text-agri-green-900 uppercase tracking-widest ml-1">Nombre completo</label>
                        <input type="text" required value={displayName} onChange={e => setDisplayName(e.target.value)}
                          placeholder="Ej. Carlos Aguirre"
                          className="glass-input w-full rounded-2xl px-4 py-3.5 text-sm font-medium outline-none transition-all"
                          style={inputStyle}
                          onFocus={e => { e.target.style.border='1px solid rgba(22,163,74,0.8)'; e.target.style.background='rgba(255,255,255,0.75)'; }}
                          onBlur={e  => { e.target.style.border='1px solid rgba(0,0,0,0.12)'; e.target.style.background='rgba(255,255,255,0.55)'; }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-agri-green-900 uppercase tracking-widest ml-1">Correo electrónico</label>
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="nombre@gmail.com"
                      className="glass-input w-full rounded-2xl px-4 py-3.5 text-sm font-medium outline-none transition-all"
                      style={inputStyle}
                      onFocus={e => { e.target.style.border='1px solid rgba(22,163,74,0.8)'; e.target.style.background='rgba(255,255,255,0.75)'; }}
                      onBlur={e  => { e.target.style.border='1px solid rgba(0,0,0,0.12)'; e.target.style.background='rgba(255,255,255,0.55)'; }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-agri-green-900 uppercase tracking-widest ml-1">Contraseña</label>
                    <div className="relative">
                      <input type={showPassword ? 'text' : 'password'} required value={password}
                        onChange={e => setPassword(e.target.value)}
                        onFocus={e => { setPwdFocused(true); e.target.style.border='1px solid rgba(22,163,74,0.8)'; e.target.style.background='rgba(255,255,255,0.75)'; }}
                        onBlur={e  => { setPwdFocused(false); e.target.style.border='1px solid rgba(0,0,0,0.12)'; e.target.style.background='rgba(255,255,255,0.55)'; }}
                        placeholder={isLogin ? 'Tu contraseña' : 'Mínimo 8 caracteres'}
                        className="glass-input w-full rounded-2xl pl-4 pr-12 py-3.5 text-sm font-medium outline-none transition-all"
                        style={inputStyle}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-agri-green-700/50 hover:text-agri-green-700">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>

                    <AnimatePresence>
                      {!isLogin && (pwdFocused || password.length > 0) && (
                        <motion.div initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-4 }}
                          className="mt-2 p-3.5 rounded-2xl space-y-3"
                          style={{ background:'rgba(255,255,255,0.5)', border:'1px solid rgba(0,0,0,0.08)' }}>
                          {password.length > 0 && (
                            <div className="space-y-1.5">
                              <div className="flex justify-between">
                                <span className="text-[10px] font-black text-agri-green-900/60 uppercase tracking-widest">Fortaleza</span>
                                <span className={`text-[10px] font-black uppercase ${STRENGTH_TEXT[strength]}`}>{STRENGTH_LABELS[strength]}</span>
                              </div>
                              <div className="flex gap-1">
                                {PASSWORD_RULES.map((_, i) => (
                                  <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i < strength ? STRENGTH_COLORS[strength] : 'bg-black/10'}`} />
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="space-y-1.5">
                            {PASSWORD_RULES.map(rule => {
                              const ok = rule.test(password);
                              return (
                                <div key={rule.id} className="flex items-center gap-2">
                                  {ok ? <CheckCircle2 size={12} className="text-agri-green-600 flex-shrink-0" />
                                      : <XCircle      size={12} className="text-earth-300 flex-shrink-0" />}
                                  <span className={`text-xs font-bold ${ok ? 'text-agri-green-700' : 'text-earth-400'}`}>{rule.label}</span>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Link olvidé contraseña — solo en login */}
                  {isLogin && (
                    <div className="text-right -mt-2">
                      <button type="button" onClick={() => setShowForgot(true)}
                        className="text-xs font-bold text-agri-green-700 hover:text-agri-green-900 transition-colors">
                        ¿Olvidaste tu contraseña?
                      </button>
                    </div>
                  )}

                  <AnimatePresence>
                    {error && (
                      <motion.div initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
                        className="p-3 rounded-xl flex gap-2 text-xs font-bold text-red-700"
                        style={{ background:'rgba(254,226,226,0.9)', border:'1px solid rgba(239,68,68,0.4)' }}>
                        <AlertCircle size={14} className="flex-shrink-0 mt-0.5" /> {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button type="submit" disabled={loading}
                    className="w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 text-white transition-all disabled:opacity-50"
                    style={{ background:'#16a34a', boxShadow:'0 4px 24px rgba(22,163,74,0.3)' }}>
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <>{isLogin ? 'Entrar al Panel' : 'Crear mi Cuenta'} <ArrowRight size={18} /></>}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}