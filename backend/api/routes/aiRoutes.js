import express from 'express';
import { processAI, analyze, predict } from '../../controllers/aiController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All AI routes require authentication
router.use(protect);

// AI processing routes
router.post('/process', processAI);
router.post('/analyze', analyze);
router.post('/predict', predict);

export default router;
