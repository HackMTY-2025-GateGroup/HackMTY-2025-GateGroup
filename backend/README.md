# Backend - HackMTY 2025 GateGroup

Backend microservices para el proyecto HackMTY 2025 construido con Node.js, Express y Supabase.

## 🚀 Tecnologías

- **Node.js** - Runtime de JavaScript
- **Express** - Framework web
- **Supabase** - Base de datos y autenticación
- **JWT** - Autenticación basada en tokens
- **Bcrypt** - Hash de contraseñas
- **Nodemailer** - Envío de emails (OTP)

## 📁 Estructura del Proyecto

```
backend/
├── api/
│   ├── middleware/         # Middleware (auth, validation, errors)
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   ├── notFound.js
│   │   └── validate.js
│   └── routes/            # Definición de rutas
│       ├── authRoutes.js
│       ├── userRoutes.js
│       ├── otpRoutes.js
│       └── aiRoutes.js
├── config/                # Configuración
│   ├── supabase.js
│   └── constants.js
├── controllers/           # Lógica de negocio
│   ├── authController.js
│   ├── userController.js
│   ├── otpController.js
│   └── aiController.js
├── roles/                 # Gestión de roles y permisos
│   └── roleManager.js
├── services/              # Servicios externos
│   ├── otpService.js
│   └── aiService.js
├── .env.example           # Variables de entorno de ejemplo
├── package.json
├── server.js              # Punto de entrada
└── README.md
```

## 🛠️ Instalación

1. **Instalar dependencias:**
```bash
cd backend
npm install
```

2. **Configurar variables de entorno:**
```bash
cp .env.example .env
```

3. **Editar el archivo `.env` con tus credenciales:**
- Supabase URL y Keys
- JWT Secret
- Configuración de email (para OTP)
- API keys de modelos AI (si aplica)

## 🗄️ Configuración de Supabase

### Tablas necesarias:

#### 1. Tabla `users`
```sql
CREATE TABLE users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. Tabla `otps`
```sql
CREATE TABLE otps (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  otp VARCHAR(6) NOT NULL,
  purpose VARCHAR(50) DEFAULT 'verification',
  expires_at TIMESTAMP NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🚀 Ejecutar el Servidor

### Modo desarrollo (con nodemon):
```bash
npm run dev
```

### Modo producción:
```bash
npm start
```

El servidor se ejecutará en `http://localhost:5000`

## 📡 Endpoints API

### 🔐 Autenticación (`/api/auth`)

- **POST** `/api/auth/register` - Registrar usuario
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "name": "John Doe",
    "role": "user"
  }
  ```

- **POST** `/api/auth/login` - Iniciar sesión
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```

- **GET** `/api/auth/profile` - Obtener perfil (requiere token)
- **GET** `/api/auth/verify` - Verificar token (requiere token)

### 👥 Usuarios (`/api/users`)

- **GET** `/api/users` - Obtener todos los usuarios (Admin)
- **GET** `/api/users/:id` - Obtener usuario por ID
- **PUT** `/api/users/:id` - Actualizar usuario
- **DELETE** `/api/users/:id` - Eliminar usuario (Admin)

### 🔢 OTP (`/api/otp`)

- **POST** `/api/otp/send` - Enviar OTP
  ```json
  {
    "email": "user@example.com",
    "purpose": "verification"
  }
  ```

- **POST** `/api/otp/verify` - Verificar OTP
  ```json
  {
    "email": "user@example.com",
    "otp": "123456"
  }
  ```

- **POST** `/api/otp/resend` - Reenviar OTP

### 🤖 AI (`/api/ai`)

- **POST** `/api/ai/process` - Procesar con AI
- **POST** `/api/ai/analyze` - Analizar datos
- **POST** `/api/ai/predict` - Generar predicción

## 🔑 Roles y Permisos

### Roles disponibles:
- `guest` - Solo lectura
- `user` - Lectura y escritura
- `moderator` - Lectura, escritura, actualización y eliminación
- `admin` - Todos los permisos

### Uso en rutas:
```javascript
router.get('/admin-only', protect, authorize(ROLES.ADMIN), handler);
```

## 🔒 Autenticación

Usar JWT Bearer token en el header:
```
Authorization: Bearer <your_token_here>
```

## 📧 Configuración de Email (OTP)

Para Gmail, necesitas:
1. Habilitar "Acceso de aplicaciones menos seguras" o
2. Usar "Contraseñas de aplicación"

En `.env`:
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=tu_email@gmail.com
EMAIL_PASSWORD=tu_contraseña_de_aplicacion
```

## 🤖 Integración de AI

El archivo `services/aiService.js` contiene funciones placeholder para integración con:
- OpenAI
- Hugging Face
- Modelos custom
- Otros servicios de AI

Implementa tu lógica según el modelo que uses.

## 🛡️ Seguridad

- ✅ Helmet para headers de seguridad
- ✅ Rate limiting
- ✅ CORS configurado
- ✅ JWT para autenticación
- ✅ Bcrypt para hash de contraseñas
- ✅ Validación de inputs
- ✅ Variables de entorno

## 🧪 Testing

```bash
npm test
```

## 📝 Notas

- Puerto por defecto: `5000`
- Frontend URL por defecto: `http://localhost:5173` (React + Vite)
- Todas las rutas API empiezan con `/api`
- Health check disponible en `/health`

## 👥 Contribuidores

GateGroup - HackMTY 2025

## 📄 Licencia

MIT
