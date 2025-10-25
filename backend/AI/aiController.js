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

    const result = await processAIQuery(query, conversationHistory, feedback);

    res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      message: 'Query processed successfully',
      data: result,
    });
  } catch (error) {
    console.error('AI query processing error:', error);
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
