import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  
  // 1. Si la ruta es pública (login, registro, noticias), la dejamos pasar limpia sin token
  if (req.url.includes('/api/auth') || req.url.includes('/api/publico') || req.url.includes('/images')) {
    return next(req);
  }

  const token = localStorage.getItem('token_cactus');

  if (token) {
    const peticionAutorizada = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(peticionAutorizada);
  }

  return next(req);
};