# TerraLogic 🌱

Sistema inteligente de monitoreo agrícola utilizando IA, análisis NDVI, detección de plagas y estrés hídrico.

---

# 🚀 Tecnologías utilizadas

* React + TypeScript
* FastAPI
* PostgreSQL
* Docker
* Kubernetes
* Nginx Ingress
* Gemini AI

---

# 📦 Requisitos

Antes de iniciar instalar:

* Docker Desktop
* Kubernetes habilitado en Docker Desktop
* PostgreSQL
* Git
* Node.js (opcional para desarrollo local)

---

# ⚙️ Configuración del proyecto

## 1️⃣ Clonar repositorio

```bash
git clone https://github.com/CristabelUrias/Terralogic_proyect.git
cd Terralogic_proyect
```

---

# 🗄️ Base de datos PostgreSQL

## Crear base de datos

Entrar a PostgreSQL:

```bash
psql -U postgres
```

Crear base:

```sql
CREATE DATABASE terralogic;
```

---

## Importar esquema

Ejecutar:

```bash
psql -U postgres -d terralogic -f schema.sql
```

---

# 🔐 Variables de entorno

Crear archivo:

```text
BACKEND/.env
```

Contenido:

```env
DATABASE_URL=postgresql://postgres:TU_PASSWORD@host.docker.internal:5432/terralogic

JWT_SECRET_KEY=terra_logic_secret_key

JWT_ALGORITHM=HS256

JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60

ALLOWED_ORIGINS=http://localhost

GEMINI_API_KEY=TU_API_KEY_GEMINI

GMAIL_USER=correo@gmail.com

GMAIL_PASSWORD=tu_password
```

---

# 🐳 Construcción de imágenes Docker

## Backend

```bash
docker build -t terralogic-backend ./backend
```

## Frontend

```bash
docker build -t terralogic-frontend ./FRONTEND
```

---

# ☸️ Kubernetes

## Aplicar configuración

```bash
kubectl apply -f k8s/
```

---

# 🔎 Verificar pods

```bash
kubectl get pods
```

Todos deben aparecer en estado:

```text
Running
```

---

# 🌐 Ingress Nginx

Verificar ingress:

```bash
kubectl get ingress
```

---

# 🚀 Ejecutar sistema

Abrir en navegador:

```text
http://localhost
```

---

# ✅ Funcionalidades

* Registro y login con JWT
* Análisis agrícola con IA
* Detección de plagas
* Detección de estrés hídrico
* Historial de análisis
* Alertas automáticas
* Generación de reportes PDF
* Dashboard agrícola

---

# 📁 Estructura del proyecto

```text
Terralogic_proyect/
│
├── BACKEND/
├── FRONTEND/
├── k8s/
├── nginx/
├── schema.sql
├── docker-compose.yml
└── README.md
```

---

# 👥 Autores

Proyecto académico desarrollado utilizando Docker, Kubernetes y Nginx Ingress.
