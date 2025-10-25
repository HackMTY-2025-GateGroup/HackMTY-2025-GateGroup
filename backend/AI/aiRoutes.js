import express from 'express';
import { queryDatabase, getAIMetrics, processAI, analyze, predict } from './aiController.js';
import { protect } from '../api/middleware/auth.js';

const router = express.Router();

// All AI routes require authentication
router.use(protect);

// Natural language database query routes
router.post('/query', queryDatabase);
router.get('/metrics', getAIMetrics);

// AI processing routes
router.post('/process', processAI);
router.post('/analyze', analyze);
router.post('/predict', predict);

export default router;
