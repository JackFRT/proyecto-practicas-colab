import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // 1. Buscamos el token que acabas de guardar en el auth.ts
  const token = localStorage.getItem('token_cactus');

  // 2. Si hay un token, clonamos la petición y le agregamos la cabecera de seguridad
  if (token) {
    const peticionAutorizada = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(peticionAutorizada);
  }

  // 3. Si no hay token (ej. cuando recién está iniciando sesión), pasa normal
  return next(req);
};