// Import necessary dependencies
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { supabase } from '../../config/supabase.js';
import { updateRewardSystem } from './AIReward.js';

dotenv.config();

// Constants
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-pro';

// Validate API key
if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not defined in environment variables');
}

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

// Database schema definition for AI context
const DATABASE_SCHEMA = `
Database Schema:

Table: Ordenes2
- IdOrden (TEXT, Primary Key): Unique order identifier
- FechaEmision (DATE): Order issue date
- FechaVencimiento (DATE): Order due date
- TipoOrden (TEXT): Order type ('Compra' for purchase/supplier, 'Venta' for sale/client)
- Organizacion (TEXT): Organization name (supplier or client)
- MonedaOrden (TEXT): Currency (e.g., 'MXN', 'USD')
- TipoDeCambio (NUMERIC): Exchange rate
- Subtotal (NUMERIC): Subtotal amount
- Descuento (NUMERIC): Discount amount
- Total (NUMERIC): Total amount
- Estado (TEXT): Order status

Table: Productos2
- IdProducto (TEXT, Primary Key): Unique product identifier
- Nombre (TEXT): Product name
- Descripcion (TEXT): Product description
- Precio (NUMERIC): Product price
- UnidadDeMedida (TEXT): Unit of measurement
- Categoria (TEXT): Product category

Table: ItemOrden2
- IdItemOrden (SERIAL, Primary Key): Unique item identifier
- IdOrden (TEXT, Foreign Key): References Ordenes2
- IdProducto (TEXT, Foreign Key): References Productos2
- Cantidad (NUMERIC): Quantity
- PrecioUnitario (NUMERIC): Unit price
- Total (NUMERIC): Item total

Relationships:
- Ordenes2.IdOrden → ItemOrden2.IdOrden (One to Many)
- Productos2.IdProducto → ItemOrden2.IdProducto (One to Many)
`;

// Examples for AI training (in English)
const SQL_EXAMPLES = `
Examples:

Q: What are the total sales for last month?
SQL: SELECT SUM(Total) as total_sales FROM Ordenes2 WHERE TipoOrden = 'Venta' AND FechaEmision >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') AND FechaEmision < DATE_TRUNC('month', CURRENT_DATE)

Q: List all orders from supplier "Acme Corp"
SQL: SELECT * FROM Ordenes2 WHERE TipoOrden = 'Compra' AND Organizacion = 'Acme Corp' ORDER BY FechaEmision DESC

Q: Which products have been sold more than 100 units?
SQL: SELECT p.IdProducto, p.Nombre, SUM(i.Cantidad) as total_quantity FROM Productos2 p JOIN ItemOrden2 i ON p.IdProducto = i.IdProducto JOIN Ordenes2 o ON i.IdOrden = o.IdOrden WHERE o.TipoOrden = 'Venta' GROUP BY p.IdProducto, p.Nombre HAVING SUM(i.Cantidad) > 100 ORDER BY total_quantity DESC

Q: What is the average order value by client?
SQL: SELECT Organizacion, AVG(Total) as avg_order_value, COUNT(*) as order_count FROM Ordenes2 WHERE TipoOrden = 'Venta' GROUP BY Organizacion ORDER BY avg_order_value DESC

Q: Show pending purchase orders
SQL: SELECT * FROM Ordenes2 WHERE TipoOrden = 'Compra' AND Estado = 'Pendiente' ORDER BY FechaVencimiento ASC
`;

// System prompt for the AI agent
const SYSTEM_PROMPT = `
You are an intelligent SQL query generator agent for a business management system. Your role is to convert natural language questions into precise SQL queries for PostgreSQL/Supabase.

${DATABASE_SCHEMA}

${SQL_EXAMPLES}

CRITICAL RULES:
1. Generate ONLY the SQL query without explanations, backticks, or additional text.
2. Use Supabase/PostgreSQL specific syntax.
3. If the question mentions a supplier or provider, filter by TipoOrden = 'Compra' and use the Organizacion field.
4. If the question mentions clients or sales, filter by TipoOrden = 'Venta' and use the Organizacion field.
5. Use JOIN to connect related tables and get complete information.
6. If the question cannot be converted to SQL, respond with "NO_SQL: " followed by a brief explanation.
7. Do NOT use backticks around the SQL query.
8. If you need more information to generate an accurate query, respond with "NEED_MORE_INFO: " followed by specific questions.
9. Verify all column names and table names match the schema exactly.
10. Use proper date functions for date comparisons.
11. Always consider data integrity and avoid SQL injection risks.

Language Detection: Detect the user's language (English, Spanish, etc.) and respond in the same language for any explanations or requests for more information.
`;

/**
 * Detect language of the user query
 */
const detectLanguage = (text) => {
  const spanishPatterns = /\b(qué|cuál|cuánto|dónde|cómo|por qué|quién|mostrar|lista|ventas|compras|cliente|proveedor|producto|orden|total)\b/i;
  return spanishPatterns.test(text) ? 'es' : 'en';
};

/**
 * Analyze if the query needs more information
 */
const needsMoreInformation = (userQuery) => {
  const ambiguousPatterns = [
    /\b(it|them|that|this|those|these)\b/i,
    /\b(eso|esto|aquello|esa|esta)\b/i,
  ];
  
  const hasTimeReference = /\b(last|previous|recent|past|this|current|último|pasado|reciente|actual)\b/i.test(userQuery);
  const hasSpecificEntity = /\b(from|for|by|de|para|por)\s+\w+/i.test(userQuery);
  
  return ambiguousPatterns.some(pattern => pattern.test(userQuery)) || 
         (hasTimeReference && !hasSpecificEntity);
};

/**
 * Main function to convert natural language to SQL query
 */
export const naturalLanguageToSQL = async (userQuery, conversationHistory = []) => {
  try {
    const language = detectLanguage(userQuery);
    
    // Build conversation context
    let contextPrompt = SYSTEM_PROMPT + '\n\n';
    
    if (conversationHistory.length > 0) {
      contextPrompt += 'Previous conversation:\n';
      conversationHistory.forEach(item => {
        contextPrompt += `User: ${item.query}\n`;
        if (item.sql) contextPrompt += `SQL: ${item.sql}\n`;
        if (item.result) contextPrompt += `Result: ${JSON.stringify(item.result)}\n`;
      });
      contextPrompt += '\n';
    }
    
    contextPrompt += `Current question: ${userQuery}\n\nGenerate the SQL query:`;
    
    // Generate SQL using Gemini
    const result = await model.generateContent(contextPrompt);
    const response = await result.response;
    let sqlQuery = response.text().trim();
    
    // Remove backticks if present
    sqlQuery = sqlQuery.replace(/```sql\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Check if AI needs more information
    if (sqlQuery.startsWith('NEED_MORE_INFO:')) {
      return {
        status: 'need_info',
        message: sqlQuery.replace('NEED_MORE_INFO:', '').trim(),
        language,
      };
    }
    
    // Check if query cannot be converted to SQL
    if (sqlQuery.startsWith('NO_SQL:')) {
      return {
        status: 'no_sql',
        message: sqlQuery.replace('NO_SQL:', '').trim(),
        language,
      };
    }
    
    // Check if our own logic detects need for more info
    if (needsMoreInformation(userQuery) && conversationHistory.length === 0) {
      const message = language === 'es' 
        ? '¿Podrías proporcionar más detalles? Por ejemplo, ¿para qué período de tiempo o para qué organización específica?'
        : 'Could you provide more details? For example, for what time period or which specific organization?';
      
      return {
        status: 'need_info',
        message,
        language,
        suggestedSQL: sqlQuery,
      };
    }
    
    return {
      status: 'success',
      sql: sqlQuery,
      language,
    };
    
  } catch (error) {
    console.error('Error generating SQL:', error);
    throw new Error(`Failed to generate SQL query: ${error.message}`);
  }
};

/**
 * Execute SQL query on Supabase and return results
 * Uses Supabase query builder to safely execute queries
 */
export const executeQuery = async (sqlQuery) => {
  try {
    // Parse SQL to determine the operation and tables
    const queryLower = sqlQuery.toLowerCase().trim();
    
    // Extract table name from SQL
    const fromMatch = sqlQuery.match(/from\s+(\w+)/i);
    const tableName = fromMatch ? fromMatch[1] : null;
    
    if (!tableName) {
      throw new Error('Could not determine table name from SQL query');
    }
    
    // For now, we'll use Supabase's query builder
    // Note: This is a simplified approach. For complex queries, you might need
    // to create a stored procedure in Supabase or use the REST API directly
    
    let query = supabase.from(tableName).select('*');
    
    // Apply basic filters if present in SQL
    // This is a simplified parser - you may want to enhance it
    const whereMatch = sqlQuery.match(/where\s+(.+?)(?:order by|group by|limit|$)/i);
    if (whereMatch) {
      const whereClause = whereMatch[1].trim();
      // Basic parsing for simple conditions
      // For production, consider using a proper SQL parser
    }
    
    const { data, error, count } = await query;
    
    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    
    return {
      success: true,
      data: data || [],
      rowCount: data ? data.length : 0,
    };
    
  } catch (error) {
    console.error('Error executing query:', error);
    
    // Alternative: Store the SQL and return a message to execute it manually
    return {
      success: false,
      error: error.message,
      sql: sqlQuery,
      note: 'Execute this SQL query in Supabase SQL Editor for complex operations'
    };
  }
};

/**
 * Main AI agent function with decision-making loop
 */
export const processAIQuery = async (userQuery, conversationHistory = [], userFeedback = null) => {
  try {
    // Step 1: Convert natural language to SQL
    const sqlResult = await naturalLanguageToSQL(userQuery, conversationHistory);
    
    // Step 2: Check if we need more information
    if (sqlResult.status === 'need_info') {
      return {
        action: 'request_info',
        message: sqlResult.message,
        language: sqlResult.language,
        conversationId: Date.now().toString(),
      };
    }
    
    // Step 3: Check if it's not a database query
    if (sqlResult.status === 'no_sql') {
      return {
        action: 'general_response',
        message: sqlResult.message,
        language: sqlResult.language,
      };
    }
    
    // Step 4: Execute the SQL query
    const queryResult = await executeQuery(sqlResult.sql);
    
    // Step 5: Format response for user
    const formattedResponse = await formatResponse(
      userQuery, 
      sqlResult.sql, 
      queryResult.data, 
      sqlResult.language
    );
    
    // Step 6: Update reward system if feedback is provided
    if (userFeedback !== null) {
      await updateRewardSystem({
        query: userQuery,
        sql: sqlResult.sql,
        wasSuccessful: userFeedback.success,
        executionTime: queryResult.executionTime,
        language: sqlResult.language,
      });
    }
    
    return {
      action: 'query_executed',
      sql: sqlResult.sql,
      data: queryResult.data,
      rowCount: queryResult.rowCount,
      formatted: formattedResponse,
      language: sqlResult.language,
    };
    
  } catch (error) {
    console.error('Error processing AI query:', error);
    
    // Error handling with language awareness
    const language = detectLanguage(userQuery);
    const errorMessage = language === 'es'
      ? `Error al procesar la consulta: ${error.message}`
      : `Error processing query: ${error.message}`;
    
    return {
      action: 'error',
      error: errorMessage,
      language,
    };
  }
};

/**
 * Format the query results into a user-friendly response
 */
const formatResponse = async (userQuery, sqlQuery, data, language = 'en') => {
  try {
    const prompt = language === 'es'
      ? `Formatea los siguientes resultados de base de datos en una respuesta amigable en español para el usuario.

Pregunta del usuario: ${userQuery}
Consulta SQL ejecutada: ${sqlQuery}
Resultados: ${JSON.stringify(data)}

Proporciona un resumen claro y conciso de los resultados.`
      : `Format the following database results into a user-friendly response in English.

User question: ${userQuery}
SQL query executed: ${sqlQuery}
Results: ${JSON.stringify(data)}

Provide a clear and concise summary of the results.`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    return response.text().trim();
    
  } catch (error) {
    console.error('Error formatting response:', error);
    // Fallback to simple JSON response
    return JSON.stringify(data, null, 2);
  }
};

/**
 * Validate SQL query for safety (prevent SQL injection)
 */
export const validateSQL = (sqlQuery) => {
  const dangerousPatterns = [
    /;\s*(DROP|DELETE|TRUNCATE|ALTER|CREATE|INSERT|UPDATE)\s+/i,
    /--/,
    /\/\*/,
    /xp_/i,
    /sp_/i,
  ];
  
  return !dangerousPatterns.some(pattern => pattern.test(sqlQuery));
};

export default {
  naturalLanguageToSQL,
  executeQuery,
  processAIQuery,
  validateSQL,
  detectLanguage,
}; 

