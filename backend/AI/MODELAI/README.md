# AI Database Query System - Documentation

## Overview
This AI system converts natural language queries into SQL and executes them on your Supabase database. It includes a reward-based learning system to improve over time.

## Files

### AI-DB.js
Main AI agent that:
- Converts natural language to SQL queries using Google Gemini AI
- Detects language (English/Spanish)
- Implements agent loop for clarification when needed
- Executes queries safely
- Formats responses in natural language
- Prevents SQL injection
- Validates queries before execution

### AIReward.js
Reward system that:
- Tracks query performance
- Learns from successes and failures
- Provides improvement suggestions
- Analyzes common patterns
- Calculates performance metrics
- Stores historical data for training

## Setup

### 1. Install Dependencies
```bash
npm install @google/generative-ai
```

### 2. Environment Variables
Add to your existing `.env` file:
```env
# Gemini AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-pro
```

Get your Gemini API key from: https://makersuite.google.com/app/apikey

### 3. Database Setup (Optional but Recommended)
Create the reward history table in Supabase SQL Editor.

**Note:** The system works without this table (using in-memory storage), but you won't have persistent learning history.

See [SETUP.md](./SETUP.md) for the complete SQL script and detailed instructions.

## Usage

### Basic Query Processing

```javascript
import { processAIQuery } from './AI/MODELAI/AI-DB.js';

// Simple query
const result = await processAIQuery("What are the total sales for last month?");

// With conversation history
const conversationHistory = [
  {
    query: "Show me sales",
    sql: "SELECT * FROM Ordenes2 WHERE TipoOrden = 'Venta'",
    result: [...]
  }
];
const result = await processAIQuery(
  "What about last week?",
  conversationHistory
);

// With user feedback
const result = await processAIQuery(
  "List all products",
  [],
  { success: true, rating: 5 }
);
```

### Response Types

#### 1. Need More Information
```javascript
{
  action: 'request_info',
  message: 'Could you specify which time period?',
  language: 'en',
  conversationId: '1698234567890'
}
```

#### 2. General Response (Not a DB Query)
```javascript
{
  action: 'general_response',
  message: 'I can help you query the database...',
  language: 'en'
}
```

#### 3. Successful Query
```javascript
{
  action: 'query_executed',
  sql: 'SELECT SUM(Total) FROM Ordenes2...',
  data: [...],
  rowCount: 10,
  formatted: 'The total sales for last month were $50,000...',
  language: 'en'
}
```

#### 4. Error
```javascript
{
  action: 'error',
  error: 'Error processing query: ...',
  language: 'en'
}
```

## Integration with Controllers

### Update aiController.js

```javascript
import { processAIQuery } from './MODELAI/AI-DB.js';
import { getPerformanceMetrics, getLearningInsights } from './MODELAI/AIReward.js';

export const queryDatabase = async (req, res) => {
  try {
    const { query, conversationHistory, feedback } = req.body;
    
    const result = await processAIQuery(query, conversationHistory, feedback);
    
    res.status(200).json({
      success: true,
      result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const getAIMetrics = async (req, res) => {
  try {
    const metrics = getPerformanceMetrics();
    const insights = getLearningInsights();
    
    res.status(200).json({
      success: true,
      metrics,
      insights
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
```

### Update aiRoutes.js

```javascript
import express from 'express';
import { queryDatabase, getAIMetrics } from './aiController.js';

const router = express.Router();

router.post('/query', queryDatabase);
router.get('/metrics', getAIMetrics);

export default router;
```

## Example Queries

### English
- "What are the total sales for last month?"
- "List all orders from supplier Acme Corp"
- "Which products have been sold more than 100 units?"
- "Show me pending purchase orders"
- "What is the average order value by client?"

### Spanish
- "¿Cuáles son las ventas totales del mes pasado?"
- "Lista todas las órdenes del proveedor Acme Corp"
- "¿Qué productos se han vendido más de 100 unidades?"
- "Muéstrame las órdenes de compra pendientes"
- "¿Cuál es el valor promedio de orden por cliente?"

## Features

### 1. Agent Loop
The AI agent can:
- Detect when it needs more information
- Ask clarifying questions
- Remember conversation context
- Make informed decisions about database queries

### 2. Language Detection
Automatically detects Spanish or English and responds accordingly.

### 3. Safety Features
- SQL injection prevention
- Query validation
- Schema verification
- Error handling

### 4. Learning System
- Tracks successful queries
- Identifies failure patterns
- Provides improvement suggestions
- Calculates reward scores
- Analyzes common query types

### 5. Performance Monitoring
- Execution time tracking
- Success rate calculation
- Query pattern analysis
- Language distribution
- Historical trends

## Reward System Metrics

### Reward Score Calculation
- Base score: 50
- Success bonus: +30
- Fast execution (<100ms): +10
- Slow execution (>2s): -10
- User rating: -20 to +20

### Performance Metrics
- Total queries
- Success rate
- Average execution time
- Language distribution
- Common patterns
- Recent query history

### Learning Insights
- Top query patterns
- Common failures
- Improvement recommendations
- Training data compilation

## Best Practices

1. **Always provide context**: Include relevant details in queries
2. **Use specific terms**: "Last month" is better than "recently"
3. **Provide feedback**: Rate queries to improve the system
4. **Check metrics regularly**: Monitor performance and learning
5. **Review SQL output**: Verify generated queries make sense
6. **Handle errors gracefully**: Use the agent loop for clarification

## Troubleshooting

### Issue: "GEMINI_API_KEY is not defined"
**Solution**: Add your Gemini API key to `.env` file

### Issue: "Reward system using in-memory storage"
**Solution**: This is normal if you haven't created the `ai_reward_history` table. The system works fine, but won't persist data between restarts. Create the table using the SQL in [SETUP.md](./SETUP.md) if you want persistence.

### Issue: "Query needs more information"
**Solution**: Provide more specific details or continue the conversation

### Issue: Queries don't execute
**Solution**: The current implementation generates SQL but uses simplified execution. For production, you may want to:
1. Create an RPC function in Supabase (see [SETUP.md](./SETUP.md))
2. Or execute the generated SQL manually in Supabase
3. The SQL generation still works perfectly for validation and review

### Issue: Low success rate
**Solution**: Review schema documentation and example queries. Make sure your table names match the `DATABASE_SCHEMA` in `AI-DB.js`

## Future Enhancements

- [ ] Multi-turn conversation support
- [ ] Query result caching
- [ ] Advanced pattern recognition
- [ ] Custom query templates
- [ ] Real-time learning updates
- [ ] Query suggestion engine
- [ ] Performance optimization recommendations
- [ ] Multi-database support

## Support

For issues or questions:
1. Check the error messages
2. Review the metrics for insights
3. Verify environment variables
4. Check Supabase connection
5. Review database schema alignment
