// API Configuration for dynamic backend endpoints
// All backend URLs and settings should be configured here

const config = {
  // Supabase Configuration (via Lovable Cloud)
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    projectId: import.meta.env.VITE_SUPABASE_PROJECT_ID,
  },

  // API Endpoints
  endpoints: {
    // Dashboard analytics
    analytics: '/api/analytics',
    kpis: '/api/kpis',
    
    // CRM Alerts
    alerts: '/api/alerts',
    notifications: '/api/notifications',
    
    // Photo Management
    photoUpload: '/api/photos/upload',
    photoAnalysis: '/api/photos/analyze',
    photoList: '/api/photos',
    
    // Chatbot
    chatbot: '/api/chatbot',
    chatHistory: '/api/chat/history',
    
    // User Administration
    users: '/api/users',
    roles: '/api/roles',
    permissions: '/api/permissions',
  },

  // Feature Flags
  features: {
    enableComputerVision: true,
    enableChatbot: true,
    enableRealTimeAlerts: true,
  },

  // App Settings
  app: {
    name: 'Airline Catering Waste Management',
    version: '1.0.0',
    maxPhotoSize: 10 * 1024 * 1024, // 10MB
    supportedImageFormats: ['image/jpeg', 'image/png', 'image/webp'],
  },
};

export default config;
