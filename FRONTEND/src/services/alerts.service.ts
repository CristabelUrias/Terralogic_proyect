// src/services/alerts.service.ts

const API_URL = '/api/v1';

const getHeaders = (): Record<string, string> => {
  const token = sessionStorage.getItem('token');
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

export interface AlertItem {
  id:      string;
  type:    'critical' | 'warning' | 'info';
  title:   string;
  field:   string;
  desc:    string;
  is_read: boolean;
  time:    string;
}

export const listAlerts = async (): Promise<{ items: AlertItem[]; total: number }> => {
  const res = await fetch(`${API_URL}/alerts/`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Error al cargar alertas');
  return res.json();
};

export const markAlertRead = async (id: string): Promise<void> => {
  await fetch(`${API_URL}/alerts/${id}/read`, {
    method: 'PATCH',
    headers: getHeaders(),
  });
};

export const dismissAlert = async (id: string): Promise<void> => {
  const res = await fetch(`${API_URL}/alerts/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Error al descartar alerta');
};

export const dismissAllAlerts = async (): Promise<void> => {
  const res = await fetch(`${API_URL}/alerts/`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Error al descartar alertas');
};