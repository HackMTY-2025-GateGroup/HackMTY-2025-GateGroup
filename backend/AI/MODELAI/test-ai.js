/**
 * Test file for AI Database Query System
 * 
 * This file demonstrates how to use the AI query system
 * Run with: node AI/MODELAI/test-ai.js
 */

import { processAIQuery, naturalLanguageToSQL, validateSQL } from './AI-DB.js';
import { getPerformanceMetrics, getLearningInsights } from './AIReward.js';

// Test queries in both English and Spanish
const testQueries = [
  // English queries
  {
    query: "What are the total sales for last month?",
    language: "en"
  },
  {
    query: "List all orders from supplier Acme Corp",
    language: "en"
  },
  {
    query: "Which products have been sold more than 100 units?",
    language: "en"
  },
  {
    query: "Show me pending purchase orders",
    language: "en"
  },
  {
    query: "What is the average order value by client?",
    language: "en"
  },
  
  // Spanish queries
  {
    query: "¿Cuáles son las ventas totales del mes pasado?",
    language: "es"
  },
  {
    query: "Lista todas las órdenes del proveedor Acme Corp",
    language: "es"
  },
  {
    query: "¿Qué productos se han vendido más de 100 unidades?",
    language: "es"
  },
  {
    query: "Muéstrame las órdenes de compra pendientes",
    language: "es"
  },
  {
    query: "¿Cuál es el valor promedio de orden por cliente?",
    language: "es"
  },
];

/**
 * Test SQL generation without execution
 */
async function testSQLGeneration() {
  console.log('\n=== Testing SQL Generation ===\n');
  
  for (const testCase of testQueries) {
    try {
      console.log(`Query (${testCase.language}): ${testCase.query}`);
      
      const result = await naturalLanguageToSQL(testCase.query);
      
      if (result.status === 'success') {
        console.log('✓ Generated SQL:', result.sql);
        console.log('✓ Valid SQL:', validateSQL(result.sql));
      } else if (result.status === 'need_info') {
        console.log('⚠ Need more info:', result.message);
      } else {
        console.log('✗ Not a SQL query:', result.message);
      }
      
      console.log('---');
    } catch (error) {
      console.error('✗ Error:', error.message);
      console.log('---');
    }
  }
}

/**
 * Test full query processing (with execution)
 */
async function testFullQueryProcessing() {
  console.log('\n=== Testing Full Query Processing ===\n');
  
  const sampleQuery = "What are the total sales for last month?";
  
  try {
    console.log('Query:', sampleQuery);
    
    const result = await processAIQuery(sampleQuery);
    
    console.log('Action:', result.action);
    console.log('Language:', result.language);
    
    if (result.action === 'query_executed') {
      console.log('SQL:', result.sql);
      console.log('Rows:', result.rowCount);
      console.log('Formatted Response:', result.formatted);
    } else if (result.action === 'request_info') {
      console.log('Message:', result.message);
    } else if (result.action === 'error') {
      console.error('Error:', result.error);
    }
    
  } catch (error) {
    console.error('✗ Error:', error.message);
  }
}

/**
 * Test conversation with context
 */
async function testConversationContext() {
  console.log('\n=== Testing Conversation Context ===\n');
  
  // First query
  const query1 = "Show me all sales";
  console.log('Query 1:', query1);
  
  try {
    const result1 = await processAIQuery(query1);
    console.log('Response 1:', result1.formatted || result1.message);
    
    // Second query with context
    const conversationHistory = [{
      query: query1,
      sql: result1.sql,
      result: result1.data
    }];
    
    const query2 = "What about last week?";
    console.log('\nQuery 2 (with context):', query2);
    
    const result2 = await processAIQuery(query2, conversationHistory);
    console.log('Response 2:', result2.formatted || result2.message);
    
  } catch (error) {
    console.error('✗ Error:', error.message);
  }
}

/**
 * Test performance metrics
 */
async function testMetrics() {
  console.log('\n=== Testing Performance Metrics ===\n');
  
  try {
    const metrics = getPerformanceMetrics();
    console.log('Performance Metrics:');
    console.log('- Total Queries:', metrics.totalQueries);
    console.log('- Successful:', metrics.successfulQueries);
    console.log('- Failed:', metrics.failedQueries);
    console.log('- Success Rate:', metrics.successRate.toFixed(2) + '%');
    console.log('- Average Execution Time:', metrics.averageExecutionTime.toFixed(2) + 'ms');
    console.log('- Language Distribution:', metrics.languageDistribution);
    
    const insights = getLearningInsights();
    console.log('\nLearning Insights:');
    console.log('- Top Patterns:', insights.topPatterns);
    console.log('- Common Failures:', insights.commonFailures);
    console.log('- Recommendations:', insights.recommendations);
    
  } catch (error) {
    console.error('✗ Error:', error.message);
  }
}

/**
 * Test with user feedback
 */
async function testWithFeedback() {
  console.log('\n=== Testing With User Feedback ===\n');
  
  const query = "List all products";
  console.log('Query:', query);
  
  try {
    // Simulate positive feedback
    const feedback = { success: true, rating: 5 };
    
    const result = await processAIQuery(query, [], feedback);
    
    console.log('Action:', result.action);
    console.log('Feedback processed successfully!');
    
    // Check updated metrics
    const metrics = getPerformanceMetrics();
    console.log('Updated Success Rate:', metrics.successRate.toFixed(2) + '%');
    
  } catch (error) {
    console.error('✗ Error:', error.message);
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   AI Database Query System - Test Suite   ║');
  console.log('╚════════════════════════════════════════════╝');
  
  try {
    // Test 1: SQL Generation
    await testSQLGeneration();
    
    // Test 2: Full Query Processing
    // await testFullQueryProcessing(); // Uncomment when database is ready
    
    // Test 3: Conversation Context
    // await testConversationContext(); // Uncomment when database is ready
    
    // Test 4: Metrics
    await testMetrics();
    
    // Test 5: Feedback
    // await testWithFeedback(); // Uncomment when database is ready
    
    console.log('\n✓ All tests completed!\n');
    
  } catch (error) {
    console.error('\n✗ Test suite failed:', error.message);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}

export {
  testSQLGeneration,
  testFullQueryProcessing,
  testConversationContext,
  testMetrics,
  testWithFeedback,
  runAllTests
};
