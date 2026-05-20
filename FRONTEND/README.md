# TerraLogic AI — Frontend

Plataforma de precisión agrícola con análisis multiespectral e IA.
**Stack:** React 19 + TypeScript + Vite + Tailwind CSS v4 + Framer Motion + Lucide React

---

## Arrancar el proyecto

```bash
npm install
npm run dev   # → http://localhost:3000
```

**Acceso de prueba:** cualquier email válido + contraseña ≥6 caracteres entra directo al panel.
El usuario mock es "Carlos Mendoza" con rol "productor". El backend reemplazará con Firebase Auth real.

---

## Estructura

```
src/
├── components/layout/
│   ├── Sidebar.tsx      ← badge de alertas sincronizado con App.tsx (prop alertCount)
│   └── TopBar.tsx       ← panel de notificaciones con alerts desde App.tsx
├── components/ui/
│   ├── StatusBadge.tsx  ← badge Saludable/Atención/Crítico
│   ├── PageHeader.tsx   ← encabezado estándar de cada página
│   ├── ConfirmDialog.tsx ← modal de confirmación reutilizable
│   └── SkeletonCard.tsx ← loaders para estados de carga
├── contexts/
│   └── AuthContext.tsx  ← MOCK — reemplazar con Firebase Auth
├── hooks/
│   ├── useNotification.ts ← toast tipado: success/error/warning/info
│   └── useYear.ts          ← año dinámico
├── pages/
│   ├── AuthPage.tsx      ← login + registro + validación; rol "productor" por defecto
│   ├── DashboardPage.tsx ← métricas, análisis con campo real, campos → FieldsPage
│   ├── AnalysisPage.tsx  ← paso 1: elegir campo existente o escribir nombre nuevo
│   │                        paso 2: drag & drop imagen → comparte con Dashboard
│   ├── AlertsPage.tsx    ← descarta por alert.id (estable), confirmación en críticas
│   ├── FieldsPage.tsx    ← tabla + panel detalle lateral con resultados IA
│   ├── HistoryPage.tsx   ← filtros, paginación, eliminar, resultados IA en detalle
│   └── SettingsPage.tsx  ← foto reemplazable, cambio contraseña, sin WhatsApp
├── App.tsx      ← estado global: alerts, lastAnalysisImage, lastAnalysisField
├── types.ts     ← todos los tipos (Alert DEBE tener id: string)
└── constants.ts ← datos mock con estructura exacta de Firestore
```

---

## Estado global en App.tsx

```typescript
// Alertas — compartido entre Sidebar (badge), TopBar (panel) y AlertsPage
const [alerts, setAlerts] = useState<Alert[]>(ALERTS);

// Análisis — compartido entre AnalysisPage → DashboardPage y HistoryPage
const [lastAnalysisImage, setLastAnalysisImage] = useState<string | null>(null);
const [lastAnalysisField, setLastAnalysisField] = useState<string | null>(null);
```

---

## Qué conectar por módulo (backend)

### AuthContext.tsx → Firebase Auth
```typescript
// Login:
await signInWithEmailAndPassword(auth, email, password);
// Registro:
const { user } = await createUserWithEmailAndPassword(auth, email, password);
await setDoc(doc(db, 'users', user.uid), {
  displayName, email, role: 'productor', createdAt: new Date().toISOString()
});
// Persistencia:
onAuthStateChanged(auth, user => { /* setProfile */ });
```

### DashboardPage
- `DASHBOARD_METRICS` → endpoint de métricas del campo
- `RECENT_FIELDS` → `query(collection(db,'fields'), where('userId','==',uid))`
- `lastAnalysisImage/Field` → último análisis del usuario en Storage + Firestore

### AnalysisPage
- `processFile()` → `uploadBytes(storageRef, file)` + trigger Cloud Function IA
- `handleGeneratePDF()` → Cloud Function → URL de descarga del PDF
- Resultados (NDVI, enfermedades, estrés) → campos en el documento de Firestore

### AlertsPage
- `ALERTS` → `onSnapshot(query(collection(db,'alerts'), where('status','==','active')))`
- `dismiss(id)` → `updateDoc(doc(db,'alerts',id), { status:'dismissed' })`
- **⚠️ IMPORTANTE:** `Alert.id` es obligatorio — usar `doc.id` de Firestore

### FieldsPage
- `RECENT_FIELDS` → colección `fields` de Firestore
- `FIELD_DETAIL` → subcollection o documento con datos del último análisis por campo
- `health` (0-100) → campo calculado que debe venir del backend

### HistoryPage
- `ANALYSIS_HISTORY` → `query(collection(db,'analyses'), orderBy('date','desc'))`
- `handleDelete(record)` → `deleteDoc(doc(db,'analyses',record.id))`
- `AI_RESULTS` → subcollection `results` o campos en el documento de análisis
- Paginación real → cursor-based con `startAfter(lastVisible)`

### SettingsPage
- `handleSave()` → `updateProfile(currentUser,{displayName})` + `updateDoc`
- `handlePhotoChange()` → `uploadBytes(storageRef)` + `updateProfile({photoURL})`
- `handleChangePwd()` → `updatePassword(currentUser, newPwd)` (requiere re-auth)
- **Email:** `updateEmail()` requiere verificación — el frontend ya muestra la advertencia

---

## Tipos importantes

| Tipo | Descripción |
|------|-------------|
| `Alert.id` | **Requerido** — usar `doc.id` de Firestore |
| `FieldStatus` | `'Saludable' \| 'Atención' \| 'Crítico'` |
| `AnalysisResult` | `'Saludable' \| 'Alerta' \| 'Estrés'` |
| `ToastType` | `'success' \| 'error' \| 'warning' \| 'info'` |
| `FieldStatusFilter` | `FieldStatus \| 'Todos'` |
| `AnalysisResultFilter` | `AnalysisResult \| 'Todos'` |

---

## Variables de entorno (.env basado en .env.example)

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_FIRESTORE_DB_ID
```

---

© 2025 TerraLogic AI
