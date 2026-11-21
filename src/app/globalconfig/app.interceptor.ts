import { HttpInterceptorFn } from '@angular/common/http';
import { getApiBaseUrl } from './api-config';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const apiBase = getApiBaseUrl();
  let targetUrl = req.url;

  // Redirige automáticamente http://localhost:8080 al dominio de Railway cuando está desplegado en Cloudflare Pages
  if (targetUrl.startsWith('http://localhost:8080') && apiBase !== 'http://localhost:8080') {
    targetUrl = targetUrl.replace('http://localhost:8080', apiBase);
  }

  const esRutaPublica =
    targetUrl.includes('/api/auth') ||
    targetUrl.includes('/api/publico') ||
    targetUrl.includes('/images');

  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token_cactus') : null;

  if (!esRutaPublica && token) {
    return next(
      req.clone({
        url: targetUrl,
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      })
    );
  }

  if (targetUrl !== req.url) {
    return next(req.clone({ url: targetUrl }));
  }

  return next(req);
};
