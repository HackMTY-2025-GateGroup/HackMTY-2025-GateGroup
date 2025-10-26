# HackMTY 2025 - GateGroup Challenge

## 🎯 Sistema de Análisis Inteligente de Tray con Computer Vision

Sistema automatizado para analizar trays de avión mediante inteligencia artificial (YOLO), calculando ocupación en tiempo real y generando recomendaciones automáticas de inventario.

---

## 🚀 Características Principales

- ✅ **Detección Automática de Productos** usando YOLO
- ✅ **Cálculo de Ocupación en Tiempo Real** (volumen-based)
- ✅ **Análisis Doble Cara** (front + back)
- ✅ **Estimación de Inventario Faltante**
- ✅ **Generación Automática de Shopping Lists**
- ✅ **Interfaz Web Moderna y Responsive**
- ✅ **Base de Datos Integrada** (Supabase)
- ✅ **API RESTful Completa**

---

## 📸 Cómo Funciona

1. **Usuario sube fotos** del tray (frente y atrás)
2. **YOLO detecta productos** (latas, botellas, jugos, snacks)
3. **Sistema calcula ocupación** basado en volumen real
4. **Estima productos faltantes** para optimizar capacidad
5. **Genera lista de compras** con recomendaciones
6. **Guarda en base de datos** para análisis histórico

### Resultado Típico

```
📊 Ocupación: 68.9%
🔴 Estado: needs_refill
📦 Productos Detectados: 10 items
🛒 Recomendación: Agregar 7 latas más
```

---

## 🏗️ Arquitectura

```
Frontend (React)  →  Backend (Node.js)  →  YOLO (Python)  →  Database (Supabase)
```

### Stack Tecnológico

**Backend:**
- Node.js + Express
- YOLO v8 (Computer Vision)
- Python integration
- Supabase (PostgreSQL)
- Multer (file upload)
- Zod (validation)

**Frontend:**
- React + Vite
- TanStack Query
- shadcn/ui
- Tailwind CSS
- Lucide Icons

---

## 📦 Estructura del Proyecto

```
HackMTY-2025-GateGroup/
├── backend/
│   ├── cv/                          # Computer Vision
│   │   ├── services/
│   │   │   ├── yoloService.js       # YOLO inference
│   │   │   ├── occupancyService.js  # Cálculo ocupación
│   │   │   └── inventoryEstimationService.js  ✨ NUEVO
│   │   ├── controllers/
│   │   │   └── occupancyController.js  ✨ ACTUALIZADO
│   │   ├── routes/
│   │   │   └── occupancyRoutes.js   ✨ ACTUALIZADO
│   │   ├── specs/
│   │   │   └── doubleside.mx.json   # Configuración tray
│   │   └── util/
│   │       └── Dimensions.js        # Catálogo productos
│   ├── api/                         # API routes
│   ├── config/                      # Configuration
│   └── server.js                    # Main server
├── frontend/
│   ├── src/
│   │   ├── views/
│   │   │   └── PhotoManagement/
│   │   │       └── PhotoManagement.jsx  ✨ REESCRITO
│   │   ├── config/
│   │   │   └── api.js               ✨ ACTUALIZADO
│   │   └── components/
│   │       └── ui/                  # shadcn components
│   └── package.json
├── docs/
│   ├── INSTALACION.md               ✨ NUEVO - Guía instalación
│   ├── GUIA_ANALISIS_TRAY.md        ✨ NUEVO - Guía usuario
│   ├── RESUMEN_PROYECTO.md          ✨ NUEVO - Resumen ejecutivo
│   └── backend/cv/
│       ├── README_TRAY_ANALYSIS.md  ✨ NUEVO - Doc técnica
│       └── TESTING_EXAMPLES.md      ✨ NUEVO - Testing
├── tray.txt                         # Especificaciones tray
├── supabase.txt                     # Schema base de datos
└── README.md                        # Este archivo
```

---

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js v18+
- Python 3.8+
- Cuenta Supabase

### Instalación Rápida

```bash
# 1. Clonar repositorio
git clone https://github.com/tu-usuario/HackMTY-2025-GateGroup.git
cd HackMTY-2025-GateGroup

# 2. Backend
cd backend
npm install
pip install -r requirements.txt

# Crear .env con tus credenciales
cp .env.example .env

# 3. Frontend
cd ../frontend
npm install

# Crear .env con tus credenciales
cp .env.example .env

# 4. Ejecutar
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

### Verificar Instalación

```bash
# Health check backend
curl http://localhost:5000/health

# Abrir frontend
open http://localhost:5173
```

---

## 📖 Documentación

| Documento | Descripción |
|-----------|-------------|
| [INSTALACION.md](INSTALACION.md) | Guía completa de instalación y configuración |
| [GUIA_ANALISIS_TRAY.md](GUIA_ANALISIS_TRAY.md) | Guía de usuario en español |
| [RESUMEN_PROYECTO.md](RESUMEN_PROYECTO.md) | Resumen ejecutivo del proyecto |
| [README_TRAY_ANALYSIS.md](backend/cv/README_TRAY_ANALYSIS.md) | Documentación técnica completa |
| [TESTING_EXAMPLES.md](backend/cv/TESTING_EXAMPLES.md) | Ejemplos de testing |

---

## 🎮 Uso

### Desde el Frontend

1. Navegar a `/photo-management`
2. Subir foto frontal del tray
3. Subir foto trasera del tray
4. Ingresar código del trolley (ej: `TRL-001`)
5. Click "Analyze Tray"
6. Ver resultados:
   - Porcentaje de ocupación
   - Productos detectados
   - Lista de compras recomendada

### Desde el API

```bash
curl -X POST http://localhost:5000/api/occupancy/analyze-tray \
  -F "front=@front.jpg" \
  -F "back=@back.jpg" \
  -F "trolleyCode=TRL-001"
```

---

## 📊 API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/occupancy/analyze-tray` | **Análisis completo de tray** ✨ |
| GET | `/api/occupancy/latest` | Último análisis de trolley |
| POST | `/api/occupancy/image` | Upload individual image |
| POST | `/api/trolleys` | Crear trolley |
| GET | `/api/trolleys` | Listar trolleys |

---

## 🎯 Productos Soportados

Basado en las especificaciones reales del tray (`tray.txt`):

| Producto | Volumen | Capacidad/Tray | Tipo |
|----------|---------|----------------|------|
| Latas 355ml | 355ml | 15 unidades | Individual |
| Agua 1.5L | 1.5L | 3 unidades | Compartido |
| Jugo 946ml | 946ml | 4 unidades | Compartido |
| Galletas 30g | - | 64 unidades | Individual |
| Coca-Cola 1.5L | 1.5L | 3 unidades | Compartido |

### Dimensiones del Tray

- **Largo:** 37 cm
- **Ancho:** 26 cm
- **Profundidad:** 10 cm
- **Volumen útil:** ~8.18 L (85% del total)
- **Target de llenado:** 85%

---

## 🗄️ Base de Datos

### Tablas Principales

- **trolleys** - Carritos físicos
- **image_analysis** - Resultados de análisis CV
- **inventories** - Inventarios por trolley
- **inventory_items** - Items en inventario
- **products** - Catálogo de productos

Ver schema completo en [`supabase.txt`](supabase.txt)

---

## 🧪 Testing

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Manual test
curl -X POST http://localhost:5000/api/occupancy/analyze-tray \
  -F "front=@test/fixtures/front.jpg" \
  -F "back=@test/fixtures/back.jpg" \
  -F "trolleyCode=TRL-TEST-001"
```

Ver más ejemplos en [TESTING_EXAMPLES.md](backend/cv/TESTING_EXAMPLES.md)

---

## 🔧 Configuración

### Variables de Entorno

**Backend** (`.env`):
```env
PORT=5000
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-key
YOLO_WEIGHTS=./cv/train/yolov8n.pt
PYTHON_BIN=python
```

**Frontend** (`.env`):
```env
VITE_API_BASE_URL=http://localhost:5000
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=tu-key
```

---

## 📈 Métricas de Rendimiento

- **Tiempo de análisis:** 2-5 segundos
- **Precisión YOLO:** Depende del modelo y calidad de fotos
- **Capacidad del tray:** 8.18 L útiles
- **Target ocupación:** 85%
- **Productos soportados:** 5 tipos principales

---

## 🎨 Screenshots

### Photo Management UI
- Upload de fotos front/back
- Visualización de ocupación en tiempo real
- Lista de productos detectados
- Shopping list automática

### Analysis Results
- Porcentaje de ocupación general
- Desglose por lado (front/back)
- Productos actuales
- Recomendaciones del sistema

---

## 🛠️ Desarrollo

### Scripts Disponibles

**Backend:**
```bash
npm run dev      # Desarrollo con nodemon
npm start        # Producción
npm test         # Tests
```

**Frontend:**
```bash
npm run dev      # Desarrollo
npm run build    # Build para producción
npm run preview  # Preview del build
```

---

## 🚢 Deploy

### Backend (Railway, Render, Heroku)

1. Configurar variables de entorno
2. Build: `npm install && pip install -r requirements.txt`
3. Start: `npm start`

### Frontend (Vercel, Netlify)

1. Build: `npm run build`
2. Output: `dist`
3. Configurar variables de entorno

---

## 🐛 Troubleshooting

Ver sección completa en [INSTALACION.md](INSTALACION.md#-troubleshooting)

### Problemas Comunes

1. **"YOLO weights not found"**
   - Descargar modelo: `wget https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8n.pt`

2. **"Trolley not found"**
   - Crear trolley: `POST /api/trolleys` con `{"code": "TRL-001"}`

3. **"Database connection failed"**
   - Verificar credenciales de Supabase en `.env`

---

## 📚 Recursos

- **Ultralytics YOLO:** https://docs.ultralytics.com/
- **Supabase Docs:** https://supabase.com/docs
- **React Docs:** https://react.dev/
- **shadcn/ui:** https://ui.shadcn.com/

---

## 🤝 Contribuciones

Este proyecto fue desarrollado para el HackMTY 2025 - GateGroup Challenge.

---

## 📄 Licencia

Proyecto desarrollado para HackMTY 2025 - GateGroup Challenge.

---

## 👨‍💻 Desarrollador

**Axel** - HackMTY 2025

---

## 🎯 Siguiente Pasos

- [ ] Fine-tune YOLO con imágenes propias
- [ ] Agregar más tipos de productos
- [ ] Dashboard de analytics
- [ ] Mobile app
- [ ] Integración con ERP
- [ ] Predicción de demanda con ML

---

## 📞 Soporte

Para problemas o preguntas:

1. Revisar documentación en `/docs`
2. Verificar sección de Troubleshooting
3. Revisar issues en GitHub
4. Contactar al equipo de desarrollo

---

**Status:** ✅ Completado y Funcional

**Versión:** 1.0.0

**Fecha:** Octubre 2025

---

## 🌟 Agradecimientos

- **GateGroup** por el challenge
- **HackMTY 2025** por la organización
- **Ultralytics** por YOLO
- **Supabase** por la infraestructura de base de datos
