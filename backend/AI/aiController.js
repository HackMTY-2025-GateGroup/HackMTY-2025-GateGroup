import { STATUS_CODES, MESSAGES } from '../config/constants.js';
import { processWithAI, analyzeData, generatePrediction } from '../services/aiService.js';
import { processAIQuery } from './MODELAI/AI-DB.js';
import { getPerformanceMetrics, getLearningInsights } from './MODELAI/AIReward.js';

/**
 * Process natural language database query with AI
 */
export const queryDatabase = async (req, res) => {
  try {
    const { query, conversationHistory = [], feedback = null } = req.body;

    if (!query) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: 'Query is required',
      });
    }

    // Verificar si la API key está configurada
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        success: false,
        message: 'AI service not configured. Please set GEMINI_API_KEY in environment variables.',
        error: 'GEMINI_API_KEY not configured',
      });
    }

    const result = await processAIQuery(query, conversationHistory, feedback);

    res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      message: 'Query processed successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error processing AI query:', error);
    
    // Manejar específicamente errores de API key inválida
    if (error.message.includes('API_KEY_INVALID') || 
        error.message.includes('API key not valid') ||
        error.message.includes('not found for API version') ||
        error.message.includes('is not supported')) {
      return res.status(503).json({
        success: false,
        message: 'Google Gemini API error. The model may not be available or the API key is invalid.',
        error: error.message,
        suggestion: 'Try updating GEMINI_MODEL to "gemini-pro" in your .env file and restart the server.',
      });
    }

    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: 'Error processing AI query',
      error: error.message,
    });
  }
};

/**
 * Get AI performance metrics and learning insights
 */
export const getAIMetrics = async (req, res) => {
  try {
    const metrics = getPerformanceMetrics();
    const insights = getLearningInsights();

    res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      message: 'Metrics retrieved successfully',
      data: {
        metrics,
        insights,
      },
    });
  } catch (error) {
    console.error('AI metrics error:', error);
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: 'Error retrieving AI metrics',
      error: error.message,
    });
  }
};

/**
 * Process data with AI model
 */
export const processAI = async (req, res) => {
  try {
    const { input, type } = req.body;

    if (!input) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: 'Input data is required',
      });
    }

    const result = await processWithAI(input, type);

    res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      message: 'AI processing completed',
      data: result,
    });
  } catch (error) {
    console.error('AI processing error:', error);
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: 'Error processing AI request',
      error: error.message,
    });
  }
};

/**
 * Analyze data using AI
 */
export const analyze = async (req, res) => {
  try {
    const { data } = req.body;

    if (!data) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: 'Data is required for analysis',
      });
    }

    const analysis = await analyzeData(data);

    res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      message: 'Analysis completed',
      data: analysis,
    });
  } catch (error) {
    console.error('AI analysis error:', error);
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: 'Error analyzing data',
      error: error.message,
    });
  }
};

/**
 * Generate prediction using AI
 */
export const predict = async (req, res) => {
  try {
    const { features } = req.body;

    if (!features) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: 'Features are required for prediction',
      });
    }

    const prediction = await generatePrediction(features);

    res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      message: 'Prediction generated',
      data: prediction,
    });
  } catch (error) {
    console.error('AI prediction error:', error);
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: 'Error generating prediction',
      error: error.message,
    });
  }
};

export default {
  queryDatabase,
  getAIMetrics,
  processAI,
  analyze,
  predict,
};
