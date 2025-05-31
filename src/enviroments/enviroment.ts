// src/environments/environment.ts
export const environment = {
  production: false,
  // Asegúrate que esta URL base apunte a tu backend Spring Boot
  // Si todos tus controllers tienen @RequestMapping("/api/...")
  // entonces apiUrl: 'http://localhost:8901/api' estaría bien.
  // Si no, y las rutas son directas como "/login", "/clientes/register"
  // entonces apiUrl: 'http://localhost:8901' es mejor,
  // y construyes la URL completa en cada servicio.
  // Basado en las correcciones del backend, tus rutas API están bajo /api/
  // pero /login y /logout están en la raíz.
  apiUrl: 'http://localhost:8901', // URL base del backend
  apiPrefix: '/api' // Prefijo para las rutas de la API
};