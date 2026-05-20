import { useState, useRef, useCallback, type DragEvent, type ChangeEvent, type WheelEvent, type MouseEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload, FileText, Droplets, Bug, Loader2,
  ImageOff, X, CheckCircle, ChevronDown, Plus,
  Leaf, ShieldAlert, Sprout, Activity,
  ZoomIn, ZoomOut, Maximize2, Move,
} from 'lucide-react';
import { PageHeader } from '../components/ui';
import { RECENT_FIELDS } from '../constants';
import { saveAnalysis } from '../services/history.service';

const ACCEPTED_FORMATS = ['JPG', 'PNG', 'WEBP'];
const ACCEPTED_MIME    = 'image/jpeg,image/png,image/webp';
const API_URL = '/api/v1';
const MIN_ZOOM = 1;
const MAX_ZOOM = 5;

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

interface AnalysisPageProps {
  onNotify:           (msg: string) => void;
  onAnalysisComplete: (imageUrl: string, fieldId: string, result?: GeminiResult) => void;
}

export default function AnalysisPage({ onNotify, onAnalysisComplete }: AnalysisPageProps) {
  const [fieldMode,     setFieldMode]     = useState<'existing' | 'new'>('existing');
  const [selectedField, setSelectedField] = useState('');
  const [customField,   setCustomField]   = useState('');
  const [isAnalyzing,   setIsAnalyzing]   = useState(false);
  const [isGenerating,  setIsGenerating]  = useState(false);
  const [isDragging,    setIsDragging]    = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [fileName,      setFileName]      = useState<string | null>(null);
  const [aiResult,      setAiResult]      = useState<GeminiResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // ── Estado del zoom interactivo ───────────────────────────
  const [zoom,      setZoom]      = useState(1);
  const [panX,      setPanX]      = useState(0);
  const [panY,      setPanY]      = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef      = useRef<HTMLInputElement>(null);

  const effectiveField = fieldMode === 'existing' ? selectedField : customField.trim();

  // ── Zoom con rueda del mouse ──────────────────────────────
  const handleWheel = useCallback((e: WheelEvent<HTMLDivElement>) => {
    if (!uploadedImage) return;
    e.preventDefault();
    const delta    = e.deltaY > 0 ? -0.2 : 0.2;
    const newZoom  = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom + delta));
    if (newZoom === MIN_ZOOM) { setPanX(0); setPanY(0); }
    setZoom(newZoom);
  }, [zoom, uploadedImage]);

  // ── Arrastrar imagen ──────────────────────────────────────
  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (zoom <= 1) return;
    setIsPanning(true);
    setLastMouse({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isPanning || zoom <= 1) return;
    const dx = e.clientX - lastMouse.x;
    const dy = e.clientY - lastMouse.y;
    setPanX(prev => prev + dx);
    setPanY(prev => prev + dy);
    setLastMouse({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp   = () => setIsPanning(false);
  const handleMouseLeave = () => setIsPanning(false);

  // ── Botones de zoom ───────────────────────────────────────
  const zoomIn  = () => setZoom(z => Math.min(MAX_ZOOM, parseFloat((z + 0.5).toFixed(1))));
  const zoomOut = () => {
    const newZoom = Math.max(MIN_ZOOM, parseFloat((zoom - 0.5).toFixed(1)));
    if (newZoom === MIN_ZOOM) { setPanX(0); setPanY(0); }
    setZoom(newZoom);
  };
  const resetZoom = () => { setZoom(1); setPanX(0); setPanY(0); };

  // ── Helpers ───────────────────────────────────────────────
  const handleZoneClick = () => {
    if (!effectiveField) { onNotify('Selecciona o escribe el nombre del campo primero.'); return; }
    if (!isAnalyzing) fileInputRef.current?.click();
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) { onNotify('Formato no válido. Usa JPG, PNG o WEBP.'); return; }
    if (!effectiveField) { onNotify('Indica el campo antes de subir la imagen.'); return; }

    setFileName(file.name);
    setIsAnalyzing(true);
    setAiResult(null);
    setAnalysisError(null);

    // Leer imagen como base64 — persiste en localStorage entre sesiones
    let imageBase64 = '';
    const reader = new FileReader();
    reader.onload = (e) => {
      imageBase64 = e.target?.result as string;
      setUploadedImage(imageBase64);
    };
    reader.readAsDataURL(file);

    // Esperar a que el FileReader termine antes de continuar
    await new Promise<void>(resolve => {
      reader.onloadend = () => resolve();
    });

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('field_name', effectiveField);

      const token = sessionStorage.getItem('token');
      const response = await fetch(`${API_URL}/analysis/analyze`, {
        method:  'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body:    formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Error al analizar la imagen.');
      }

      const result: GeminiResult = await response.json();
      setAiResult(result);

      try {
        await saveAnalysis({
          field_name:        result.field_name,
          resultado:         result.resultado,
          ndvi:              result.ndvi,
          cobertura_vegetal: result.cobertura_vegetal,
          enfermedades:      result.enfermedades,
          estres_hidrico:    result.estres_hidrico,
          plagas:            result.plagas,
          insight:           result.insight,
          confianza:         result.confianza,
        });
      } catch {
        console.warn('No se pudo guardar en el historial.');
      }

      // Guardar imagen base64 en localStorage para persistencia entre sesiones
      try {
        if (imageBase64 && imageBase64.length < 800000) {
          localStorage.setItem('lastAnalysisImage',      imageBase64);
          localStorage.setItem('lastAnalysisImageField', effectiveField);
        }
      } catch { /* localStorage lleno — ignorar */ }

      onAnalysisComplete(imageBase64, effectiveField, result);
      onNotify(`Análisis de ${effectiveField} completado — ${result.resultado}`);

    } catch (err: any) {
      setAnalysisError(err.message || 'Error de conexión con el servidor.');
      onNotify('Error al analizar la imagen.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleDragOver  = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop      = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleClear = () => {
    setUploadedImage(null);
    setFileName(null);
    setAiResult(null);
    setAnalysisError(null);
    resetZoom();
  };

  const handleGeneratePDF = async () => {
    if (!uploadedImage || !aiResult) return;
    setIsGenerating(true);
    try {
      const base64 = uploadedImage.includes(',') ? uploadedImage.split(',')[1] : uploadedImage;
      const token  = sessionStorage.getItem('token');
      const response = await fetch(`${API_URL}/reports/generate`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          field_name: aiResult.field_name, resultado: aiResult.resultado,
          ndvi: aiResult.ndvi, cobertura_vegetal: aiResult.cobertura_vegetal,
          enfermedades: aiResult.enfermedades, estres_hidrico: aiResult.estres_hidrico,
          plagas: aiResult.plagas, insight: aiResult.insight, confianza: aiResult.confianza,
          image_base64: base64, image_mime: 'image/jpeg',
        }),
      });
      if (!response.ok) throw new Error('Error al generar el PDF');
      const blob = await response.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `reporte-${aiResult.field_name.replace(/\s+/g, '-').toLowerCase()}.pdf`; a.click();
      URL.revokeObjectURL(url);
      onNotify('Reporte PDF generado y descargado correctamente.');
    } catch {
      onNotify('Error al generar el PDF. Intenta de nuevo.');
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedFieldData = fieldMode === 'existing' ? RECENT_FIELDS.find(f => f.id === selectedField) : null;
  const switchMode = (mode: 'existing' | 'new') => { setFieldMode(mode); setSelectedField(''); setCustomField(''); handleClear(); };

  const resultColor = {
    'Saludable': { bg: 'bg-agri-green-50', border: 'border-agri-green-200', text: 'text-agri-green-700', badge: 'bg-agri-green-100 text-agri-green-700' },
    'Alerta':    { bg: 'bg-orange-50',     border: 'border-orange-200',     text: 'text-orange-700',     badge: 'bg-orange-100 text-orange-700'         },
    'Estrés':    { bg: 'bg-red-50',        border: 'border-red-200',        text: 'text-red-700',        badge: 'bg-red-100 text-red-700'               },
  };
  const colors = aiResult ? resultColor[aiResult.resultado] : resultColor['Saludable'];

  const zoomPct = Math.round(zoom * 100);

  return (
    <div className="space-y-10">
      <PageHeader
        label="Inteligencia Artificial"
        title="Análisis Avanzado de Cultivos"
        description="Selecciona o nombra el campo, sube la imagen del dron y Gemini hará el análisis."
      />

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-8 space-y-8">

          {/* PASO 1: Campo */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[2.5rem] border border-earth-200 shadow-xl shadow-earth-900/5 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-agri-green-800 text-white flex items-center justify-center font-black text-sm shadow-md">1</div>
              <div>
                <h3 className="font-black text-agri-green-950 tracking-tight">Identificar Campo</h3>
                <p className="text-xs font-bold text-earth-400 mt-0.5">Elige un sector existente o escribe un nombre nuevo</p>
              </div>
            </div>
            <div className="flex gap-2 p-1.5 bg-earth-200/40 rounded-2xl mb-6">
              <button onClick={() => switchMode('existing')}
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${fieldMode === 'existing' ? 'bg-white text-agri-green-800 shadow-md' : 'text-earth-500 hover:text-earth-700'}`}>
                Campo existente
              </button>
              <button onClick={() => switchMode('new')}
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${fieldMode === 'new' ? 'bg-white text-agri-green-800 shadow-md' : 'text-earth-500 hover:text-earth-700'}`}>
                <Plus size={14} strokeWidth={3} /> Nuevo campo
              </button>
            </div>
            <AnimatePresence mode="wait">
              {fieldMode === 'existing' ? (
                <motion.div key="existing" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                  <div className="relative">
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-earth-400 pointer-events-none" />
                    <select value={selectedField} onChange={(e) => { setSelectedField(e.target.value); handleClear(); }}
                      className="w-full bg-earth-200/20 border-2 border-earth-200 rounded-2xl px-5 py-4 text-sm font-bold appearance-none cursor-pointer focus:ring-0 focus:border-agri-green-500 focus:bg-white transition-all outline-none pr-10">
                      <option value="">— Selecciona un campo —</option>
                      {RECENT_FIELDS.map((f) => (
                        <option key={f.id} value={f.id}>{f.name} — {f.crop} (ID: {f.id})</option>
                      ))}
                    </select>
                  </div>
                  {selectedFieldData && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      className="mt-4 flex items-center gap-4 p-4 bg-agri-green-50 border border-agri-green-100 rounded-2xl">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black ${
                        selectedFieldData.status === 'Saludable' ? 'bg-agri-green-100 text-agri-green-700' :
                        selectedFieldData.status === 'Atención'  ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                        {selectedFieldData.health}%
                      </div>
                      <div>
                        <p className="font-black text-agri-green-950 text-sm">{selectedFieldData.name}</p>
                        <p className="text-xs font-bold text-earth-400 uppercase tracking-widest mt-0.5">{selectedFieldData.crop} · {selectedFieldData.status}</p>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ) : (
                <motion.div key="new" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="space-y-3">
                  <input type="text" value={customField} onChange={(e) => setCustomField(e.target.value)}
                    placeholder="Ej. Sector Norte Lote 7, Parcela B-12..."
                    className="w-full bg-earth-200/20 border-2 border-earth-200 rounded-2xl px-5 py-4 text-sm font-bold placeholder:text-earth-300 focus:ring-0 focus:border-agri-green-500 focus:bg-white transition-all outline-none" />
                  {customField.trim().length > 0 && (
                    <div className="flex items-center gap-2 px-4 py-3 bg-agri-green-50 border border-agri-green-100 rounded-xl">
                      <CheckCircle size={15} className="text-agri-green-500" />
                      <p className="text-xs font-black text-agri-green-800">Campo: <span className="text-agri-green-600">"{customField.trim()}"</span></p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <input ref={fileInputRef} type="file" accept={ACCEPTED_MIME} onChange={handleFileChange} className="hidden" />

          {/* PASO 2: Subir imagen */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm shadow-md ${effectiveField ? 'bg-agri-green-800 text-white' : 'bg-earth-200 text-earth-400'}`}>2</div>
              <div>
                <h3 className={`font-black tracking-tight ${effectiveField ? 'text-agri-green-950' : 'text-earth-400'}`}>Subir Imagen del Dron</h3>
                <p className="text-xs font-bold text-earth-400 mt-0.5">{effectiveField ? 'Arrastra o selecciona la imagen' : 'Primero identifica el campo'}</p>
              </div>
            </div>
            <div onClick={handleZoneClick} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
              className={`bg-white rounded-[2.5rem] p-16 border-2 border-dashed flex flex-col items-center justify-center text-center group transition-all relative overflow-hidden ${
                !effectiveField ? 'border-earth-100 opacity-50 cursor-not-allowed' :
                isDragging ? 'border-agri-green-500 bg-agri-green-50/50 scale-[1.01] cursor-pointer' :
                'border-earth-200 hover:border-agri-green-500 hover:bg-agri-green-50/30 cursor-pointer'}`}>
              {isAnalyzing && (
                <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                  <Loader2 className="animate-spin text-agri-green-600 mb-4" size={48} />
                  <p className="text-agri-green-900 font-black text-lg">Gemini analizando imagen...</p>
                  <p className="text-earth-400 font-medium text-sm mt-2">Detectando enfermedades, plagas y estrés hídrico</p>
                </div>
              )}
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-sm transition-all duration-500 ${
                isDragging ? 'bg-agri-green-500 text-white scale-110' :
                effectiveField ? 'bg-earth-100 text-agri-green-700 group-hover:scale-110 group-hover:bg-agri-green-500 group-hover:text-white' : 'bg-earth-100 text-earth-300'}`}>
                <Upload size={36} />
              </div>
              <h3 className="text-2xl font-black text-agri-green-950 tracking-tight">
                {isDragging ? 'Suelta la imagen aquí' : 'Subir Imagen de Dron'}
              </h3>
              <p className="text-earth-500 mt-2 font-medium">
                {effectiveField ? 'Arrastra y suelta, o haz clic para seleccionar' : 'Identifica el campo para continuar'}
              </p>
              <div className="mt-8 flex gap-3">
                {ACCEPTED_FORMATS.map((f) => (
                  <span key={f} className="px-5 py-2 bg-white rounded-xl text-[10px] font-black text-earth-400 border border-earth-200 uppercase tracking-widest shadow-sm">.{f}</span>
                ))}
              </div>
            </div>
          </motion.div>

          {/* PASO 3: Visor con zoom interactivo */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-white rounded-[2.5rem] overflow-hidden border border-earth-200 shadow-2xl shadow-earth-900/10">

            {/* Contenedor de imagen con zoom */}
            <div className="relative bg-earth-100/50 overflow-hidden"
              ref={imageContainerRef}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              style={{
                height:     '420px',
                cursor:     uploadedImage ? (zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'zoom-in') : 'default',
                userSelect: 'none',
              }}
            >
              {uploadedImage ? (
                <>
                  {/* Imagen con transformación de zoom y pan */}
                  <img
                    src={uploadedImage}
                    alt="Imagen analizada"
                    draggable={false}
                    style={{
                      width:     '100%',
                      height:    '100%',
                      objectFit: 'cover',
                      transform: `scale(${zoom}) translate(${panX / zoom}px, ${panY / zoom}px)`,
                      transformOrigin: 'center center',
                      transition: isPanning ? 'none' : 'transform 0.15s ease-out',
                      opacity: 0.95,
                    }}
                  />

                  {/* Overlay de diagnóstico */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-agri-green-500/20 via-transparent to-red-500/10 mix-blend-overlay pointer-events-none" />

                  {/* Badge resultado */}
                  {aiResult && (
                    <div className="absolute top-4 left-4 pointer-events-none">
                      <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl ${colors.badge}`}>
                        {aiResult.resultado} — NDVI {aiResult.ndvi.toFixed(2)}
                      </span>
                    </div>
                  )}

                  {/* Botón cerrar */}
                  <button onClick={handleClear}
                    className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-xl rounded-xl flex items-center justify-center text-earth-600 hover:text-red-600 shadow-xl transition-colors z-10">
                    <X size={18} />
                  </button>

                  {/* ── Controles de zoom ── */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
                    <div className="flex items-center gap-1 px-3 py-2 rounded-2xl shadow-xl"
                      style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', border: '1px solid rgba(0,0,0,0.08)' }}>

                      {/* Zoom out */}
                      <button onClick={zoomOut} disabled={zoom <= MIN_ZOOM}
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-earth-600 hover:bg-agri-green-50 hover:text-agri-green-700 disabled:opacity-30 transition-all">
                        <ZoomOut size={16} />
                      </button>

                      {/* Barra de progreso del zoom */}
                      <div className="flex items-center gap-2 px-2">
                        <div className="w-20 h-1.5 bg-earth-200 rounded-full overflow-hidden">
                          <div className="h-full bg-agri-green-500 rounded-full transition-all duration-200"
                            style={{ width: `${((zoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)) * 100}%` }} />
                        </div>
                        <span className="text-[11px] font-black text-earth-600 min-w-[36px]">{zoomPct}%</span>
                      </div>

                      {/* Zoom in */}
                      <button onClick={zoomIn} disabled={zoom >= MAX_ZOOM}
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-earth-600 hover:bg-agri-green-50 hover:text-agri-green-700 disabled:opacity-30 transition-all">
                        <ZoomIn size={16} />
                      </button>

                      {/* Separador */}
                      <div className="w-px h-5 bg-earth-200 mx-1" />

                      {/* Reset zoom */}
                      <button onClick={resetZoom} disabled={zoom === MIN_ZOOM}
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-earth-600 hover:bg-agri-green-50 hover:text-agri-green-700 disabled:opacity-30 transition-all"
                        title="Restablecer zoom">
                        <Maximize2 size={15} />
                      </button>
                    </div>

                    {/* Indicador de arrastre */}
                    {zoom > 1 && (
                      <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-[11px] font-bold text-earth-500"
                        style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <Move size={12} />
                        Arrastra para explorar
                      </div>
                    )}
                  </div>

                  {/* Instrucción inicial de zoom */}
                  {zoom === 1 && aiResult && (
                    <div className="absolute bottom-4 right-4 pointer-events-none">
                      <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold text-earth-500"
                        style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <ZoomIn size={11} />
                        Rueda del mouse para zoom
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-10">
                  <div className="w-16 h-16 rounded-2xl bg-earth-100 flex items-center justify-center text-earth-300 mb-4"><ImageOff size={32} /></div>
                  <p className="text-earth-400 font-bold text-sm">Sube una imagen para ver el análisis aquí</p>
                </div>
              )}
            </div>

            {/* Barra inferior del visor */}
            <div className="p-8 flex justify-between items-center bg-white/30 flex-wrap gap-4">
              <div className="flex gap-8 items-center flex-wrap">
                {fileName && (
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-agri-green-500" />
                    <span className="text-sm font-black text-agri-green-800 tracking-tight truncate max-w-[180px]">{fileName}</span>
                  </div>
                )}
                {[
                  ['Campo',     effectiveField || '—'],
                  ['NDVI',      aiResult ? aiResult.ndvi.toFixed(2) : '—'],
                  ['Cobertura', aiResult ? `${aiResult.cobertura_vegetal}%` : '—'],
                  ['Fecha',     'Hoy'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-[10px] font-black text-earth-400 uppercase tracking-[0.2em] mb-1">{label}</p>
                    <p className="font-black text-agri-green-950 tracking-tight">{value}</p>
                  </div>
                ))}
              </div>
              <button onClick={handleGeneratePDF} disabled={isGenerating || !uploadedImage || !aiResult}
                className="flex items-center gap-3 bg-agri-green-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-black transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed">
                {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <FileText size={18} />}
                {isGenerating ? 'Generando...' : 'Generar Reporte PDF'}
              </button>
            </div>
          </motion.div>
        </div>

        {/* Panel de Resultados IA */}
        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="col-span-12 lg:col-span-4">
          <div className="bg-white p-8 rounded-[2.5rem] border border-earth-200 shadow-xl shadow-earth-900/5 sticky top-24">
            <h2 className="text-2xl font-black text-agri-green-950 tracking-tight mb-8">Resultados IA</h2>

            {!uploadedImage && !isAnalyzing && (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-14 h-14 rounded-2xl bg-earth-100 flex items-center justify-center text-earth-300 mb-4"><Bug size={28} /></div>
                <p className="text-earth-400 font-bold text-sm leading-relaxed">
                  {effectiveField ? 'Sube una imagen para ver los resultados' : 'Identifica el campo y sube una imagen'}
                </p>
              </div>
            )}

            {isAnalyzing && (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Loader2 className="animate-spin text-agri-green-600 mb-4" size={36} />
                <p className="font-black text-agri-green-800 text-sm">Gemini procesando...</p>
                <p className="text-earth-400 text-xs mt-1">Esto puede tomar unos segundos</p>
              </div>
            )}

            {analysisError && !isAnalyzing && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm font-bold">{analysisError}</div>
            )}

            {aiResult && !isAnalyzing && (
              <div className="space-y-4">
                <div className={`p-4 ${colors.bg} border ${colors.border} rounded-2xl`}>
                  <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">Diagnóstico general</p>
                  <div className="flex items-center justify-between">
                    <p className={`font-black text-lg ${colors.text}`}>{aiResult.resultado}</p>
                    <span className="text-xs font-bold text-earth-400">{Math.round(aiResult.confianza * 100)}% confianza</span>
                  </div>
                </div>

                <div className="p-4 bg-agri-green-50 border border-agri-green-100 rounded-2xl">
                  <p className="text-[10px] font-black text-agri-green-600 uppercase tracking-widest mb-1">Campo analizado</p>
                  <p className="font-black text-agri-green-950 text-sm">{aiResult.field_name}</p>
                </div>

                <div className="p-5 bg-white rounded-2xl flex justify-between items-center border border-earth-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-agri-green-100 text-agri-green-600 rounded-xl"><Bug size={20} /></div>
                    <div>
                      <p className="text-sm font-black text-earth-700">Enfermedades</p>
                      {aiResult.enfermedades.count > 0 && <p className="text-[10px] text-earth-400 font-medium">{aiResult.enfermedades.detalle}</p>}
                    </div>
                  </div>
                  <span className={`text-3xl font-black tracking-tighter ${aiResult.enfermedades.count > 0 ? 'text-red-600' : 'text-agri-green-600'}`}>
                    {aiResult.enfermedades.count}
                  </span>
                </div>

                <div className="p-5 bg-white rounded-2xl border border-earth-100">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-orange-100 text-orange-600 rounded-xl"><Droplets size={20} /></div>
                      <p className="text-sm font-black text-earth-700">Estrés Hídrico</p>
                    </div>
                    <span className={`text-3xl font-black tracking-tighter ${aiResult.estres_hidrico.porcentaje > 50 ? 'text-red-600' : aiResult.estres_hidrico.porcentaje > 25 ? 'text-orange-600' : 'text-agri-green-600'}`}>
                      {aiResult.estres_hidrico.porcentaje}%
                    </span>
                  </div>
                  <div className="w-full bg-earth-100 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full transition-all duration-700 ${aiResult.estres_hidrico.porcentaje > 50 ? 'bg-red-500' : aiResult.estres_hidrico.porcentaje > 25 ? 'bg-orange-500' : 'bg-agri-green-500'}`}
                      style={{ width: `${aiResult.estres_hidrico.porcentaje}%` }} />
                  </div>
                  <p className="text-[10px] text-earth-400 font-bold mt-1.5">Nivel: {aiResult.estres_hidrico.nivel}</p>
                </div>

                <div className="p-5 bg-white rounded-2xl flex justify-between items-center border border-earth-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-red-100 text-red-600 rounded-xl"><ShieldAlert size={20} /></div>
                    <div>
                      <p className="text-sm font-black text-earth-700">Plagas</p>
                      {aiResult.plagas.count > 0 && <p className="text-[10px] text-earth-400 font-medium">{aiResult.plagas.detalle}</p>}
                    </div>
                  </div>
                  <span className={`text-3xl font-black tracking-tighter ${aiResult.plagas.count > 0 ? 'text-red-600' : 'text-agri-green-600'}`}>
                    {aiResult.plagas.count}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-white rounded-2xl border border-earth-100 text-center">
                    <div className="flex justify-center mb-2"><Leaf size={18} className="text-agri-green-600" /></div>
                    <p className="text-2xl font-black text-agri-green-950">{aiResult.ndvi.toFixed(2)}</p>
                    <p className="text-[10px] font-black text-earth-400 uppercase tracking-widest mt-0.5">NDVI</p>
                  </div>
                  <div className="p-4 bg-white rounded-2xl border border-earth-100 text-center">
                    <div className="flex justify-center mb-2"><Activity size={18} className="text-blue-600" /></div>
                    <p className="text-2xl font-black text-agri-green-950">{aiResult.cobertura_vegetal}%</p>
                    <p className="text-[10px] font-black text-earth-400 uppercase tracking-widest mt-0.5">Cobertura</p>
                  </div>
                </div>

                <div className="p-6 bg-agri-green-950 text-white rounded-[2rem] shadow-2xl relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-agri-green-500/10 rounded-full blur-2xl" />
                  <div className="flex items-center gap-2 mb-3">
                    <Sprout size={14} className="text-agri-green-400" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-agri-green-400">Insight de Gemini</p>
                  </div>
                  <p className="text-sm font-medium italic leading-relaxed opacity-90">"{aiResult.insight}"</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}