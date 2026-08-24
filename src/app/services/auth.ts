import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  http = inject(HttpClient);

  usuarioActual = signal<any>(null);

  constructor() {
    const sesionGuardada = localStorage.getItem('usuario_cactus');
    if (sesionGuardada) {
      this.usuarioActual.set(JSON.parse(sesionGuardada));
    }
  }

  iniciarSesion(correo: string, password: string) {
    // 1. Apuntamos al nuevo endpoint de Spring Boot
    const urlAPI = 'http://localhost:8080/api/auth/login';
    
    // 2. Mapeamos 'correo' a 'email' para que coincida con el DTO (LoginRequest.java)
    return this.http.post<any>(urlAPI, { email: correo, password: password });
  }

  // Agregado para conectarlo a tu formulario de registro
  registrar(usuario: any) {
    const urlAPI = 'http://localhost:8080/api/auth/registro';
    return this.http.post<any>(urlAPI, usuario);
  }

  guardarSesion(usuario: any) {
    this.usuarioActual.set(usuario);
    localStorage.setItem('usuario_cactus', JSON.stringify(usuario));
  }

  cerrarSesion() {
    this.usuarioActual.set(null);
    localStorage.removeItem('usuario_cactus');
  }
}