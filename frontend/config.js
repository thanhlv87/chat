// Configuration for different environments
const CONFIG = {
  // Development settings
  development: {
    API_BASE: 'http://localhost:3001/api',
    SOCKET_URL: 'http://localhost:3001',
    UPLOAD_URL: 'http://localhost:3001/uploads'
  },

  // Production settings - tự động detect từ Railway
  production: {
    API_BASE: `https://${window.location.hostname}/api`,
    SOCKET_URL: `https://${window.location.hostname}`,
    UPLOAD_URL: `https://${window.location.hostname}/uploads`
  }
};

// Auto-detect environment
const isProduction = window.location.hostname !== 'localhost' &&
                    window.location.hostname !== '127.0.0.1';

const currentConfig = isProduction ? CONFIG.production : CONFIG.development;

console.log('🌍 Environment:', isProduction ? 'Production' : 'Development');
console.log('🔗 API Base:', currentConfig.API_BASE);

// Export configuration
window.APP_CONFIG = currentConfig;