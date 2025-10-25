import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const PORT = process.env.PORT || 5000;

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'GateGroup Airline Inventory Management API',
      version: '1.0.0',
      description: `
      `,
      contact: {
        name: 'GateGroup Team',
        email: 'support@gategroup.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Servidor de desarrollo local',
      },
      {
        url: 'https://api.gategroup.com',
        description: 'Servidor de producción',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Ingrese el JWT token obtenido del login',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            role: { 
              type: 'string', 
              enum: ['admin', 'inventory_manager', 'aircraft_manager', 'flight_attendant'] 
            },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Profile: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            auth_id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            role: { 
              type: 'string', 
              enum: ['admin', 'inventory_manager', 'aircraft_manager', 'flight_attendant'] 
            },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Aircraft: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            tail_number: { type: 'string' },
            model: { type: 'string' },
            capacity: { type: 'integer' },
            notes: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Flight: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            aircraft_id: { type: 'string', format: 'uuid' },
            flight_number: { type: 'string' },
            departure_at: { type: 'string', format: 'date-time' },
            arrival_at: { type: 'string', format: 'date-time' },
            origin: { type: 'string' },
            destination: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Trolley: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            code: { type: 'string' },
            flight_id: { type: 'string', format: 'uuid' },
            status: { 
              type: 'string', 
              enum: ['ready', 'in-flight', 'returned', 'maintenance'] 
            },
            last_check: { type: 'string', format: 'date-time' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Product: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            sku: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            perishable: { type: 'boolean' },
            shelf_life_days: { type: 'integer' },
            min_stock: { type: 'integer' },
            max_stock: { type: 'integer' },
            dimensions: { type: 'object' },
            metadata: { type: 'object' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Inventory: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            location_type: { 
              type: 'string', 
              enum: ['general', 'trolley', 'flight', 'lounge', 'aircraft_storage'] 
            },
            location_id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            notes: { type: 'string' },
            updated_at: { type: 'string', format: 'date-time' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        InventoryItem: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            inventory_id: { type: 'string', format: 'uuid' },
            product_id: { type: 'string', format: 'uuid' },
            batch_id: { type: 'string' },
            quantity: { type: 'integer' },
            reserved: { type: 'integer' },
            min_stock: { type: 'integer' },
            max_stock: { type: 'integer' },
            expiry_date: { type: 'string', format: 'date' },
            storage_temp_celsius: { type: 'number' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Lounge: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            code: { type: 'string' },
            name: { type: 'string' },
            airport_code: { type: 'string' },
            latitude: { type: 'number' },
            longitude: { type: 'number' },
            capacity: { type: 'integer' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        ExpiryAlert: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            item_id: { type: 'string', format: 'uuid' },
            inventory_id: { type: 'string', format: 'uuid' },
            expiry_date: { type: 'string', format: 'date' },
            level: { type: 'string', enum: ['info', 'warning', 'critical'] },
            message: { type: 'string' },
            acknowledged: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        InventoryMovement: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            item_id: { type: 'string', format: 'uuid' },
            inventory_id: { type: 'string', format: 'uuid' },
            performed_by: { type: 'string', format: 'uuid' },
            qty_change: { type: 'integer' },
            movement_type: { 
              type: 'string', 
              enum: ['in', 'out', 'transfer', 'adjustment', 'waste', 'replenishment'] 
            },
            from_inventory: { type: 'string', format: 'uuid' },
            to_inventory: { type: 'string', format: 'uuid' },
            flight_id: { type: 'string', format: 'uuid' },
            notes: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            error: { type: 'string' },
          },
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'object' },
          },
        },
      },
    },
    tags: [
      { name: 'Authentication', description: 'Endpoints de autenticación y registro' },
      { name: 'Users', description: 'Gestión de usuarios' },
      { name: 'OTP', description: 'Verificación por OTP' },
      { name: 'AI', description: 'Servicios de Inteligencia Artificial' },
      { name: 'Profiles', description: 'Gestión de perfiles de usuario' },
      { name: 'Aircrafts', description: 'Gestión de aeronaves' },
      { name: 'Flights', description: 'Gestión de vuelos' },
      { name: 'Trolleys', description: 'Gestión de carritos' },
      { name: 'Products', description: 'Gestión de productos' },
      { name: 'Inventories', description: 'Gestión de inventarios' },
      { name: 'Inventory Items', description: 'Ítems de inventario' },
      { name: 'Lounges', description: 'Gestión de salas' },
      { name: 'Movements', description: 'Movimientos de inventario' },
      { name: 'Alerts', description: 'Alertas de caducidad' },
      { name: 'Analytics', description: 'Análisis y reportes' },
    ],
    // security: [
    //   {
    //     bearerAuth: [],
    //   },
    // ], // COMMENTED FOR TESTING - No authentication required
  },
  apis: [
    './api/routes/*.js',
    './AI/aiRoutes.js',
    './controllers/*.js',
    './AI/aiController.js',
  ],
};

const specs = swaggerJsdoc(options);

export { swaggerUi, specs };