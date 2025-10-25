// AI Reward System for Learning and Improvement
import { supabase } from '../../config/supabase.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Reward metrics storage structure:
 * - queryId: unique identifier for each query
 * - query: original user query
 * - sql: generated SQL
 * - success: boolean indicating if query was successful
 * - executionTime: time taken to execute
 * - userFeedback: explicit user rating (1-5)
 * - timestamp: when the query was executed
 * - language: detected language
 * - improvements: suggestions for improvement
 */

// In-memory cache for quick access (you should persist this in database)
let rewardHistory = [];
let performanceMetrics = {
  totalQueries: 0,
  successfulQueries: 0,
  failedQueries: 0,
  averageExecutionTime: 0,
  languageDistribution: {},
  commonPatterns: {},
};

/**
 * Initialize reward system (load from database if exists)
 */
export const initializeRewardSystem = async () => {
  try {
    // Try to load existing reward data from Supabase
    // Note: If ai_reward_history table doesn't exist, this will gracefully fail
    const { data, error } = await supabase
      .from('ai_reward_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);
    
    if (data && data.length > 0) {
      rewardHistory = data;
      calculateMetrics();
      console.log('✓ Reward system initialized with', data.length, 'historical records');
    } else {
      console.log('✓ Reward system initialized with empty history (table may not exist yet)');
    }
    
  } catch (error) {
    // If table doesn't exist, just use in-memory storage
    console.log('⚠ Reward system using in-memory storage (no database table found)');
    console.log('  To enable persistence, run the SQL setup script in Supabase');
  }
};

/**
 * Calculate performance metrics from history
 */
const calculateMetrics = () => {
  if (rewardHistory.length === 0) return;
  
  performanceMetrics.totalQueries = rewardHistory.length;
  performanceMetrics.successfulQueries = rewardHistory.filter(r => r.was_successful).length;
  performanceMetrics.failedQueries = rewardHistory.length - performanceMetrics.successfulQueries;
  
  // Calculate average execution time
  const totalTime = rewardHistory.reduce((sum, r) => sum + (r.execution_time || 0), 0);
  performanceMetrics.averageExecutionTime = totalTime / rewardHistory.length;
  
  // Language distribution
  performanceMetrics.languageDistribution = {};
  rewardHistory.forEach(r => {
    const lang = r.language || 'unknown';
    performanceMetrics.languageDistribution[lang] = (performanceMetrics.languageDistribution[lang] || 0) + 1;
  });
  
  // Common query patterns
  performanceMetrics.commonPatterns = analyzeQueryPatterns(rewardHistory);
};

/**
 * Analyze query patterns to learn common requests
 */
const analyzeQueryPatterns = (history) => {
  const patterns = {};
  
  history.forEach(record => {
    const query = record.query.toLowerCase();
    
    // Identify common keywords
    const keywords = [
      'total', 'sum', 'average', 'count', 'list', 'show',
      'sales', 'purchase', 'order', 'product', 'client', 'supplier',
      'ventas', 'compras', 'orden', 'producto', 'cliente', 'proveedor',
    ];
    
    keywords.forEach(keyword => {
      if (query.includes(keyword)) {
        patterns[keyword] = (patterns[keyword] || 0) + 1;
      }
    });
  });
  
  return patterns;
};

/**
 * Update reward system with new query result
 */
export const updateRewardSystem = async (queryData) => {
  try {
    const {
      query,
      sql,
      wasSuccessful,
      executionTime = 0,
      userFeedback = null,
      language = 'en',
      errorMessage = null,
    } = queryData;
    
    // Calculate reward score (0-100)
    let rewardScore = 50; // Base score
    
    // Success bonus
    if (wasSuccessful) {
      rewardScore += 30;
    } else {
      rewardScore -= 20;
    }
    
    // Execution time bonus (faster is better)
    if (executionTime < 100) {
      rewardScore += 10;
    } else if (executionTime < 500) {
      rewardScore += 5;
    } else if (executionTime > 2000) {
      rewardScore -= 10;
    }
    
    // User feedback bonus
    if (userFeedback !== null) {
      rewardScore += (userFeedback - 3) * 10; // -20 to +20 based on 1-5 rating
    }
    
    // Clamp score between 0 and 100
    rewardScore = Math.max(0, Math.min(100, rewardScore));
    
    // Create reward record
    const rewardRecord = {
      query,
      sql,
      was_successful: wasSuccessful,
      execution_time: executionTime,
      user_feedback: userFeedback,
      language,
      reward_score: rewardScore,
      error_message: errorMessage,
      created_at: new Date().toISOString(),
    };
    
    // Save to database
    const { data, error } = await supabase
      .from('ai_reward_history')
      .insert([rewardRecord])
      .select();
    
    if (error) {
      // If table doesn't exist, just keep in memory
      console.log('⚠ Could not save to database, using in-memory storage');
      rewardHistory.push(rewardRecord);
    } else if (data && data.length > 0) {
      rewardHistory.push(data[0]);
    } else {
      // Fallback to in-memory
      rewardHistory.push(rewardRecord);
    }
    
    // Keep history size manageable
    if (rewardHistory.length > 1000) {
      rewardHistory = rewardHistory.slice(-1000);
    }
    
    // Recalculate metrics
    calculateMetrics();
    
    // Generate improvement suggestions
    const improvements = generateImprovements(queryData, rewardScore);
    
    return {
      success: true,
      rewardScore,
      improvements,
      metrics: performanceMetrics,
    };
    
  } catch (error) {
    console.error('Error updating reward system:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Generate improvement suggestions based on query performance
 */
const generateImprovements = (queryData, rewardScore) => {
  const improvements = [];
  
  if (!queryData.wasSuccessful) {
    improvements.push({
      type: 'error',
      message: 'Query failed - review SQL syntax and schema alignment',
      priority: 'high',
    });
  }
  
  if (queryData.executionTime > 2000) {
    improvements.push({
      type: 'performance',
      message: 'Query took too long - consider adding indexes or optimizing joins',
      priority: 'medium',
    });
  }
  
  if (rewardScore < 40) {
    improvements.push({
      type: 'quality',
      message: 'Low quality query - review natural language interpretation',
      priority: 'high',
    });
  }
  
  // Analyze SQL for potential improvements
  if (queryData.sql) {
    const sql = queryData.sql.toLowerCase();
    
    if (sql.includes('select *')) {
      improvements.push({
        type: 'optimization',
        message: 'Avoid SELECT * - specify only needed columns',
        priority: 'low',
      });
    }
    
    if (!sql.includes('limit') && sql.includes('select')) {
      improvements.push({
        type: 'safety',
        message: 'Consider adding LIMIT clause to prevent large result sets',
        priority: 'medium',
      });
    }
  }
  
  return improvements;
};

/**
 * Get performance metrics and insights
 */
export const getPerformanceMetrics = () => {
  return {
    ...performanceMetrics,
    successRate: performanceMetrics.totalQueries > 0
      ? (performanceMetrics.successfulQueries / performanceMetrics.totalQueries) * 100
      : 0,
    recentQueries: rewardHistory.slice(-10).reverse(),
  };
};

/**
 * Get learning insights for AI improvement
 */
export const getLearningInsights = () => {
  const insights = {
    topPatterns: [],
    commonFailures: [],
    recommendations: [],
  };
  
  // Top patterns
  const sortedPatterns = Object.entries(performanceMetrics.commonPatterns)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  
  insights.topPatterns = sortedPatterns.map(([pattern, count]) => ({
    pattern,
    count,
    percentage: (count / performanceMetrics.totalQueries) * 100,
  }));
  
  // Common failures
  const failedQueries = rewardHistory.filter(r => !r.was_successful);
  const failurePatterns = {};
  
  failedQueries.forEach(record => {
    const errorType = record.error_message ? 
      record.error_message.split(':')[0] : 'Unknown';
    failurePatterns[errorType] = (failurePatterns[errorType] || 0) + 1;
  });
  
  insights.commonFailures = Object.entries(failurePatterns)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([error, count]) => ({ error, count }));
  
  // Recommendations
  if (performanceMetrics.successfulQueries / performanceMetrics.totalQueries < 0.7) {
    insights.recommendations.push('Consider improving schema documentation for AI');
  }
  
  if (performanceMetrics.averageExecutionTime > 1000) {
    insights.recommendations.push('Optimize database with indexes for common queries');
  }
  
  const langDist = performanceMetrics.languageDistribution;
  if (Object.keys(langDist).length > 1) {
    insights.recommendations.push('Multi-language support is active - ensure translations are accurate');
  }
  
  return insights;
};

/**
 * Train AI based on reward history (feedback loop)
 */
export const trainFromHistory = async () => {
  try {
    // Identify high-performing queries
    const highPerformingQueries = rewardHistory
      .filter(r => r.reward_score >= 80)
      .slice(-50);
    
    // Identify low-performing queries
    const lowPerformingQueries = rewardHistory
      .filter(r => r.reward_score < 40)
      .slice(-50);
    
    return {
      success: true,
      trainingData: {
        positive_examples: highPerformingQueries.length,
        negative_examples: lowPerformingQueries.length,
        insights: getLearningInsights(),
      },
      message: 'Training data compiled from reward history',
    };
    
  } catch (error) {
    console.error('Error training from history:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Reset reward system (for testing or maintenance)
 */
export const resetRewardSystem = async () => {
  try {
    rewardHistory = [];
    performanceMetrics = {
      totalQueries: 0,
      successfulQueries: 0,
      failedQueries: 0,
      averageExecutionTime: 0,
      languageDistribution: {},
      commonPatterns: {},
    };
    
    console.log('Reward system reset successfully');
    return { success: true };
    
  } catch (error) {
    console.error('Error resetting reward system:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Initialize on module load
initializeRewardSystem().catch(err => {
  console.error('Failed to initialize reward system:', err);
});

export default {
  initializeRewardSystem,
  updateRewardSystem,
  getPerformanceMetrics,
  getLearningInsights,
  trainFromHistory,
  resetRewardSystem,
};
