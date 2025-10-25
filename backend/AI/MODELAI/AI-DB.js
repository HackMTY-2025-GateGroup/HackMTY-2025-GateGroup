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
  console.warn('⚠️ GEMINI_API_KEY is not defined in environment variables');
}

// Initialize Gemini API
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// Database schema definition for AI context - Airline Inventory Management System
const DATABASE_SCHEMA = `
Database Schema: Airline Inventory Management System

Table: profiles (User Profiles)
- id (UUID, Primary Key): Unique profile identifier
- auth_id (UUID, Unique): Linked to auth.users(id)
- name (TEXT): User's name
- email (TEXT, Unique): User's email
- phone (TEXT): User's phone number
- role (TEXT): User role - CHECK (role IN ('admin','inventory_manager','aircraft_manager','flight_attendant'))
- created_at (TIMESTAMPTZ): Creation timestamp
- updated_at (TIMESTAMPTZ): Last update timestamp

Table: aircrafts (Aircraft Fleet)
- id (UUID, Primary Key): Unique aircraft identifier
- tail_number (TEXT, Unique): Aircraft tail number
- model (TEXT): Aircraft model
- capacity (INTEGER): Passenger capacity
- notes (TEXT): Additional notes
- created_at (TIMESTAMPTZ): Creation timestamp

Table: flights (Flight Information)
- id (UUID, Primary Key): Unique flight identifier
- aircraft_id (UUID, Foreign Key): References aircrafts(id)
- flight_number (TEXT): Flight number
- departure_at (TIMESTAMPTZ): Departure time
- arrival_at (TIMESTAMPTZ): Arrival time
- origin (TEXT): Origin airport
- destination (TEXT): Destination airport
- created_at (TIMESTAMPTZ): Creation timestamp

Table: lounges (Airport Lounges)
- id (UUID, Primary Key): Unique lounge identifier
- code (TEXT, Unique): Lounge code
- name (TEXT): Lounge name
- airport_code (TEXT): Airport code
- latitude (DOUBLE PRECISION): Geographic latitude
- longitude (DOUBLE PRECISION): Geographic longitude
- capacity (INTEGER): Lounge capacity
- created_at (TIMESTAMPTZ): Creation timestamp

Table: trolleys (Service Trolleys)
- id (UUID, Primary Key): Unique trolley identifier
- code (TEXT): Trolley code (e.g., TROL-01)
- flight_id (UUID, Foreign Key): References flights(id)
- status (TEXT): Trolley status - CHECK (status IN ('ready','in-flight','returned','maintenance'))
- last_check (TIMESTAMPTZ): Last inspection time
- created_at (TIMESTAMPTZ): Creation timestamp

Table: products (Product Catalog)
- id (UUID, Primary Key): Unique product identifier
- sku (TEXT, Unique): Stock Keeping Unit
- name (TEXT, NOT NULL): Product name
- description (TEXT): Product description
- category (TEXT): Product category
- perishable (BOOLEAN): Is product perishable
- shelf_life_days (INTEGER): Shelf life in days
- min_stock (INTEGER): Minimum stock level
- max_stock (INTEGER): Maximum stock level
- dimensions (JSONB): Product dimensions {width_cm, height_cm, depth_cm}
- metadata (JSONB): Additional metadata
- created_at (TIMESTAMPTZ): Creation timestamp

Table: inventories (Inventory Locations)
- id (UUID, Primary Key): Unique inventory identifier
- location_type (TEXT, NOT NULL): Location type - CHECK (location_type IN ('general','trolley','flight','lounge','aircraft_storage'))
- location_id (UUID): Reference to location (trolleys.id, flights.id, lounges.id, etc.)
- name (TEXT): Inventory name
- notes (TEXT): Additional notes
- updated_at (TIMESTAMPTZ): Last update timestamp
- created_at (TIMESTAMPTZ): Creation timestamp

Table: inventory_items (Inventory Items with Batches)
- id (UUID, Primary Key): Unique item identifier
- inventory_id (UUID, Foreign Key): References inventories(id)
- product_id (UUID, Foreign Key): References products(id)
- batch_id (TEXT): Batch identifier
- quantity (INTEGER, NOT NULL): Current quantity
- reserved (INTEGER): Reserved quantity
- min_stock (INTEGER): Minimum stock level
- max_stock (INTEGER): Maximum stock level
- expiry_date (DATE): Expiration date
- storage_temp_celsius (NUMERIC): Storage temperature in Celsius
- cv_metadata (JSONB): Computer vision metadata
- last_temp_updated_at (TIMESTAMPTZ): Last temperature update
- created_at (TIMESTAMPTZ): Creation timestamp
- updated_at (TIMESTAMPTZ): Last update timestamp

Table: inventory_movements (Inventory Movement History)
- id (UUID, Primary Key): Unique movement identifier
- item_id (UUID, Foreign Key): References inventory_items(id)
- inventory_id (UUID, Foreign Key): References inventories(id)
- performed_by (UUID, Foreign Key): References profiles(id)
- qty_change (INTEGER, NOT NULL): Quantity change (positive or negative)
- movement_type (TEXT, NOT NULL): Movement type - CHECK (movement_type IN ('in','out','transfer','adjustment','waste','replenishment'))
- from_inventory (UUID): Source inventory for transfers
- to_inventory (UUID): Destination inventory for transfers
- flight_id (UUID, Foreign Key): References flights(id)
- notes (TEXT): Movement notes
- created_at (TIMESTAMPTZ): Movement timestamp

Table: expiry_alerts (Expiration Alerts)
- id (UUID, Primary Key): Unique alert identifier
- item_id (UUID, Foreign Key): References inventory_items(id)
- inventory_id (UUID, Foreign Key): References inventories(id)
- expiry_date (DATE, NOT NULL): Expiration date
- level (TEXT, NOT NULL): Alert level - CHECK (level IN ('info','warning','critical'))
- message (TEXT): Alert message
- acknowledged (BOOLEAN): Is alert acknowledged
- acknowledged_by (UUID, Foreign Key): References profiles(id)
- created_at (TIMESTAMPTZ): Alert creation timestamp

Table: image_analysis (Computer Vision Analysis Results)
- id (UUID, Primary Key): Unique analysis identifier
- inventory_id (UUID, Foreign Key): References inventories(id)
- trolley_id (UUID, Foreign Key): References trolleys(id)
- image_path (TEXT): Path to analyzed image
- analysis_result (JSONB): Analysis results {detections, occupancy, note}
- confidence (NUMERIC): Confidence score (0-1)
- model_version (TEXT): CV model version
- created_at (TIMESTAMPTZ): Analysis timestamp

Table: agent_logs (AI Agent Activity Logs)
- id (UUID, Primary Key): Unique log identifier
- agent_name (TEXT, NOT NULL): Name of AI agent
- action (TEXT, NOT NULL): Action performed
- input (JSONB): Input parameters
- output (JSONB): Output results
- status (TEXT): Status - CHECK (status IN ('ok','warning','error'))
- related_item (UUID, Foreign Key): References inventory_items(id)
- created_at (TIMESTAMPTZ): Log timestamp

Table: kpi_history (KPI Historical Data)
- id (UUID, Primary Key): Unique KPI record identifier
- inventory_id (UUID, Foreign Key): References inventories(id)
- trolley_id (UUID, Foreign Key): References trolleys(id)
- kpi_name (TEXT, NOT NULL): KPI name
- kpi_value (NUMERIC): KPI value
- context (JSONB): Additional context
- recorded_at (TIMESTAMPTZ): Recording timestamp

Table: profiles_assignments (Staff Assignments)
- id (UUID, Primary Key): Unique assignment identifier
- profile_id (UUID, Foreign Key): References profiles(id)
- aircraft_id (UUID, Foreign Key): References aircrafts(id)
- flight_id (UUID, Foreign Key): References flights(id)
- role (TEXT): Assignment role
- created_at (TIMESTAMPTZ): Assignment timestamp

Table: agent_tasks (AI Agent Task Scheduling)
- id (UUID, Primary Key): Unique task identifier
- agent_name (TEXT): Name of AI agent
- task_type (TEXT): Type of task
- inventory_id (UUID, Foreign Key): References inventories(id)
- payload (JSONB): Task parameters
- schedule_at (TIMESTAMPTZ): Scheduled execution time
- status (TEXT): Task status (default: 'pending')
- result_id (UUID, Foreign Key): References agent_logs(id)
- created_at (TIMESTAMPTZ): Task creation timestamp

Table: temperature_logs (Temperature Monitoring)
- id (UUID, Primary Key): Unique log identifier
- inventory_id (UUID, Foreign Key): References inventories(id)
- trolley_id (UUID, Foreign Key): References trolleys(id)
- sensor_id (TEXT): Sensor identifier
- temp_celsius (NUMERIC): Temperature in Celsius
- recorded_at (TIMESTAMPTZ): Recording timestamp

Table: suppliers (Supplier Information)
- id (UUID, Primary Key): Unique supplier identifier
- name (TEXT): Supplier name
- contact (JSONB): Contact information
- created_at (TIMESTAMPTZ): Creation timestamp

Table: purchase_orders (Purchase Orders)
- id (UUID, Primary Key): Unique order identifier
- supplier_id (UUID, Foreign Key): References suppliers(id)
- created_by (UUID, Foreign Key): References profiles(id)
- items (JSONB): Order items
- status (TEXT): Order status (default: 'draft')
- created_at (TIMESTAMPTZ): Order creation timestamp

Key Relationships:
- profiles.auth_id → auth.users(id)
- flights.aircraft_id → aircrafts.id
- trolleys.flight_id → flights.id
- inventories.location_id → (trolleys.id | flights.id | lounges.id | aircrafts.id based on location_type)
- inventory_items.inventory_id → inventories.id
- inventory_items.product_id → products.id
- inventory_movements.item_id → inventory_items.id
- inventory_movements.inventory_id → inventories.id
- inventory_movements.performed_by → profiles.id
- inventory_movements.flight_id → flights.id
- expiry_alerts.item_id → inventory_items.id
- image_analysis.inventory_id → inventories.id
- image_analysis.trolley_id → trolleys.id
- profiles_assignments.profile_id → profiles.id
- profiles_assignments.aircraft_id → aircrafts.id
- profiles_assignments.flight_id → flights.id
- temperature_logs.inventory_id → inventories.id
- purchase_orders.supplier_id → suppliers.id
`;

// Examples for AI training (in English and Spanish)
const SQL_EXAMPLES = `
Examples:

Q: Show all products that are about to expire in the next 7 days
SQL: SELECT p.name, ii.batch_id, ii.quantity, ii.expiry_date, i.name as inventory_location FROM inventory_items ii JOIN products p ON ii.product_id = p.id JOIN inventories i ON ii.inventory_id = i.id WHERE ii.expiry_date <= CURRENT_DATE + INTERVAL '7 days' AND ii.expiry_date >= CURRENT_DATE ORDER BY ii.expiry_date ASC

Q: ¿Cuáles son los vuelos programados para hoy?
SQL: SELECT flight_number, origin, destination, departure_at, arrival_at, a.tail_number FROM flights f LEFT JOIN aircrafts a ON f.aircraft_id = a.id WHERE DATE(departure_at) = CURRENT_DATE ORDER BY departure_at

Q: List all trolleys currently in flight
SQL: SELECT t.code, t.status, f.flight_number, f.origin, f.destination FROM trolleys t LEFT JOIN flights f ON t.flight_id = f.id WHERE t.status = 'in-flight' ORDER BY t.code

Q: What products are low on stock in general inventory?
SQL: SELECT p.name, p.sku, ii.quantity, ii.min_stock, i.name as inventory_name FROM inventory_items ii JOIN products p ON ii.product_id = p.id JOIN inventories i ON ii.inventory_id = i.id WHERE i.location_type = 'general' AND ii.quantity <= ii.min_stock ORDER BY ii.quantity ASC

Q: Show all inventory movements for flight "AA123" today
SQL: SELECT im.movement_type, im.qty_change, p.name as product, im.notes, im.created_at, pr.name as performed_by FROM inventory_movements im LEFT JOIN inventory_items ii ON im.item_id = ii.id LEFT JOIN products p ON ii.product_id = p.id LEFT JOIN profiles pr ON im.performed_by = pr.id LEFT JOIN flights f ON im.flight_id = f.id WHERE f.flight_number = 'AA123' AND DATE(im.created_at) = CURRENT_DATE ORDER BY im.created_at DESC

Q: ¿Qué alertas críticas de caducidad hay sin reconocer?
SQL: SELECT ea.message, ea.expiry_date, ea.level, p.name as product, i.name as inventory FROM expiry_alerts ea JOIN inventory_items ii ON ea.item_id = ii.id JOIN products p ON ii.product_id = p.id JOIN inventories i ON ea.inventory_id = i.id WHERE ea.acknowledged = false AND ea.level = 'critical' ORDER BY ea.expiry_date ASC

Q: Show temperature logs for trolley "TROL-01" in the last 24 hours
SQL: SELECT temp_celsius, recorded_at, sensor_id FROM temperature_logs WHERE trolley_id = (SELECT id FROM trolleys WHERE code = 'TROL-01') AND recorded_at >= NOW() - INTERVAL '24 hours' ORDER BY recorded_at DESC

Q: Which flight attendants are assigned to flights departing today?
SQL: SELECT p.name, p.email, f.flight_number, f.departure_at, f.destination FROM profiles p JOIN profiles_assignments pa ON p.id = pa.profile_id JOIN flights f ON pa.flight_id = f.id WHERE p.role = 'flight_attendant' AND DATE(f.departure_at) = CURRENT_DATE ORDER BY f.departure_at

Q: List all perishable products with their shelf life
SQL: SELECT name, sku, category, shelf_life_days FROM products WHERE perishable = true ORDER BY shelf_life_days ASC

Q: Show inventory occupancy by location type
SQL: SELECT i.location_type, COUNT(DISTINCT i.id) as inventory_count, COUNT(ii.id) as total_items, SUM(ii.quantity) as total_quantity FROM inventories i LEFT JOIN inventory_items ii ON i.id = ii.inventory_id GROUP BY i.location_type ORDER BY total_quantity DESC

Q: ¿Cuáles son las órdenes de compra pendientes?
SQL: SELECT po.id, s.name as supplier, po.status, po.created_at, p.name as created_by FROM purchase_orders po LEFT JOIN suppliers s ON po.supplier_id = s.id LEFT JOIN profiles p ON po.created_by = p.id WHERE po.status = 'draft' OR po.status = 'pending' ORDER BY po.created_at DESC
`;

// System prompt for the AI agent
const SYSTEM_PROMPT = `
You are an intelligent SQL query generator agent for an Airline Inventory Management System. Your role is to convert natural language questions into precise SQL queries for PostgreSQL/Supabase.

${DATABASE_SCHEMA}

${SQL_EXAMPLES}

CRITICAL RULES:
1. Generate ONLY the SQL query without explanations, backticks, or additional text.
2. Use Supabase/PostgreSQL specific syntax.
3. When querying about flights, use the flights table with aircraft_id linking to aircrafts.
4. When querying about trolleys (service carts), use the trolleys table with status values: 'ready', 'in-flight', 'returned', 'maintenance'.
5. When querying about inventory, remember location_type can be: 'general', 'trolley', 'flight', 'lounge', 'aircraft_storage'.
6. For products, check the products table - use perishable flag for perishable items.
7. For stock levels, query inventory_items table which tracks quantity, min_stock, max_stock per inventory location.
8. For expiration alerts, use expiry_alerts table with level: 'info', 'warning', 'critical'.
9. For inventory movements, use inventory_movements with movement_type: 'in', 'out', 'transfer', 'adjustment', 'waste', 'replenishment'.
10. User roles in profiles: 'admin', 'inventory_manager', 'aircraft_manager', 'flight_attendant'.
11. Use JOIN to connect related tables and get complete information.
12. If the question cannot be converted to SQL, respond with "NO_SQL: " followed by a brief explanation.
13. Do NOT use backticks around the SQL query.
14. If you need more information to generate an accurate query, respond with "NEED_MORE_INFO: " followed by specific questions.
15. Verify all column names and table names match the schema exactly.
16. Use proper date functions for date comparisons (CURRENT_DATE, NOW(), INTERVAL).
17. Always consider data integrity and avoid SQL injection risks.
18. For temperature monitoring, use temperature_logs table with temp_celsius.
19. For computer vision analysis results, use image_analysis table.
20. For AI agent logs and KPIs, use agent_logs and kpi_history tables respectively.

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
    // Verificar si genAI está disponible
    if (!genAI) {
      throw new Error('IA no disponible: GEMINI_API_KEY no configurada correctamente');
    }

    // Inicializar el modelo con configuración específica
    const model = genAI.getGenerativeModel({ 
      model: GEMINI_MODEL,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    });

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

