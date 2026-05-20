// src/services/fields.service.ts

const API_URL = '/api/v1';

const getHeaders = (): Record<string, string> => {
  const token = sessionStorage.getItem('token');
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

export interface FieldItem {
  id:            string;
  name:          string;
  crop:          string;
  status:        'Saludable' | 'Atención' | 'Crítico';
  health:        number;
  ndvi:          number;
  cobertura:     number;
  water_stress:  number;
  diseases:      number;
  plagas:        number;
  insight:       string;
  last_analysis: string;
}

export interface FieldsStats {
  total:     number;
  healthy:   number;
  attention: number;
  critical:  number;
}

export const listFields = async (): Promise<{ items: FieldItem[]; stats: FieldsStats }> => {
  const res = await fetch(`${API_URL}/fields/`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Error al cargar campos');
  return res.json();
};