/**
 * Configuración centralizada de la URL del Backend.
 * - En entorno local (localhost / 127.0.0.1) utiliza automáticamente http://localhost:8080
 * - En Cloudflare Pages utiliza la URL de Railway Hobby configurada en RAILWAY_BACKEND_URL
 */
export const RAILWAY_BACKEND_URL = 'https://backend-museo-production.up.railway.app';

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const customUrl = (window as any).__API_BASE_URL__ || localStorage.getItem('API_URL_RAILWAY');
    if (customUrl) {
      return String(customUrl).replace(/\/+$/, '');
    }
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:8080';
    }
  }
  return RAILWAY_BACKEND_URL;
}
