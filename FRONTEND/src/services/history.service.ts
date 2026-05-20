// src/services/history.service.ts

const API_URL = '/api/v1';

const getHeaders = (): Record<string, string> => {
  const token = sessionStorage.getItem('token');
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

export interface HistoryRecord {
  id:               string;
  field_name:       string;
  result:           'Saludable' | 'Alerta' | 'Estrés';
  ndvi:             number;
  cobertura:        number;
  diseases_count:   number;
  enf_detalle:      string;
  water_stress_pct: number;
  nivel_estres:     string;
  plagas_count:     number;
  plagas_detalle:   string;
  ai_insight:       string;
  confianza:        number;
  image_url:        string | null;
  date:             string;
  time:             string;
}

export interface SaveAnalysisPayload {
  field_name:        string;
  resultado:         string;
  ndvi:              number;
  cobertura_vegetal: number;
  enfermedades:      { count: number; detalle: string };
  estres_hidrico:    { porcentaje: number; nivel: string };
  plagas:            { count: number; detalle: string };
  insight:           string;
  confianza:         number;
  image_url?:        string;
}

export const saveAnalysis = async (payload: SaveAnalysisPayload): Promise<{ id: string }> => {
  const res = await fetch(`${API_URL}/history/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getHeaders() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Error al guardar el análisis');
  return res.json();
};

export const listAnalyses = async (skip = 0, limit = 20): Promise<{ items: HistoryRecord[]; total: number }> => {
  const res = await fetch(`${API_URL}/history/list?skip=${skip}&limit=${limit}`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Error al cargar el historial');
  return res.json();
};

export const deleteAnalysis = async (id: string): Promise<void> => {
  const res = await fetch(`${API_URL}/history/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Error al eliminar el análisis');
};