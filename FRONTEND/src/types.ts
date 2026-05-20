// FRONTEND/src/types.ts

// --- Tipos de Interfaz de Usuario ---
export type TabId = 'dashboard' | 'fields' | 'analysis' | 'history' | 'alerts' | 'settings' | 'calendar';

export interface NavItem {
    id: TabId;
    label: string;
    icon: string;
}

// --- Tipos de Dominio Agrícola ---
export type FieldStatus = 'Saludable' | 'Atención' | 'Crítico';
export type AnalysisResult = 'Saludable' | 'Alerta' | 'Estrés';
export type AlertType = 'critical' | 'warning' | 'info';
export type TrendDirection = 'up' | 'down' | 'neutral';
export type FieldStatusFilter = FieldStatus | 'Todos';
export type AnalysisResultFilter = AnalysisResult | 'Todos';

// --- Tipos de Notificación ---
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
    text: string;
    type: ToastType;
}

// --- Entidades de Datos ---
export interface Metric {
    label: string;
    value: string | number;
    change: string;
    trend: TrendDirection;
    icon: string;
    color: string;
}

export interface Field {
    id: string;
    name: string;
    crop: string;
    status: FieldStatus;
    health: number;
}

export interface AnalysisRecord {
    id: string;
    date: string;
    time: string;
    fieldId: string;
    crop: string;
    resolution: string;
    type: string;
    result: AnalysisResult;
    imageUrl: string;
}

export interface Alert {
    id: string;
    type: AlertType;
    title: string;
    field: string;
    time: string;
    desc: string;
}

// --- Autenticación y Perfil (Sincronizado con Backend) ---
export type UserRole = 'admin' | 'productor' | 'agronomo';

export interface UserProfile {
    uid: string;
    displayName: string;
    email: string;
    photoURL?: string;
    role: UserRole;
    createdAt: string;
}

export interface UserCreate {
    email: string;
    password: string;
    display_name: string;
    role?: UserRole;
}

export interface AuthResponse {
    user: UserProfile;
    access_token: string;
    token_type: string;
}