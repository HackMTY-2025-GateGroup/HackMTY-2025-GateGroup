import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

// Import Swagger
import { swaggerUi, specs } from './docs/swagger.js';

// Import routes
import authRoutes from './api/routes/authRoutes.js';
import userRoutes from './api/routes/userRoutes.js';
import otpRoutes from './api/routes/otpRoutes.js';
import aiRoutes from './AI/aiRoutes.js';
import inventoryRoutes from './api/routes/inventoryRoutes.js';
import productRoutes from './api/routes/productRoutes.js';
import flightRoutes from './api/routes/flightRoutes.js';
import aircraftRoutes from './api/routes/aircraftRoutes.js';
import trolleyRoutes from './api/routes/trolleyRoutes.js';
import alertRoutes from './api/routes/alertRoutes.js';
import loungeRoutes from './api/routes/loungeRoutes.js';
import supplierRoutes from './api/routes/supplierRoutes.js';
import purchaseOrderRoutes from './api/routes/purchaseOrderRoutes.js';
// CV API (integrated from Computer-Vision)
import occupancyRoutes from './cv/routes/occupancyRoutes.js';

// Import middleware
import { errorHandler } from './api/middleware/errorHandler.js';
import { notFound } from './api/middleware/notFound.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'GateGroup API Documentation',
}));

// Redirect root to API docs
app.get('/', (req, res) => {
  res.redirect('/api-docs');
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/inventories', inventoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/flights', flightRoutes);
app.use('/api/aircrafts', aircraftRoutes);
app.use('/api/trolleys', trolleyRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/lounges', loungeRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
// Computer Vision endpoints
app.use('/api/occupancy', occupancyRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL}`);
  console.log(`API Documentation: http://localhost:${PORT}/api-docs`);
});

export default app;
