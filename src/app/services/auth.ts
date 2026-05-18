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
    const urlAPI = 'http://localhost/cactus-api/login.php';
    return this.http.post<any>(urlAPI, { correo, password });
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