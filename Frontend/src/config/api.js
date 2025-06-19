// Configuración centralizada de la API
const API_CONFIG = {
  // URL base para todas las peticiones de API
  BASE_URL: 'http://3.136.236.195:5000/api',
  
  // Configuración de timeouts
  TIMEOUT: 10000, // 10 segundos
  
  // Headers por defecto
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
  },
  
  // Configuración de CORS
  WITH_CREDENTIALS: true,
};

export default API_CONFIG;
