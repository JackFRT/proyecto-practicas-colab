import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [FormsModule, RouterLink, CommonModule],
  templateUrl: './auth.html',
  styleUrl: './auth.css'
})
export class Auth {
  http = inject(HttpClient);
  router = inject(Router);
  cdr = inject(ChangeDetectorRef);

  isLoginMode: boolean = true;
  isRecuperarMode: boolean = false; 
  
  nombre: string = '';
  email: string = '';
  password: string = '';
  codigoRecuperacion: string = ''; 
  pasoRecuperacion: number = 1; 
  
  mensajeError: string = '';
  mensajeExito: string = '';
  cargando: boolean = false;

  toggleMode() {
    this.isLoginMode = !this.isLoginMode;
    this.isRecuperarMode = false;
    this.limpiarMensajes();
  }

  abrirRecuperacion(event: Event) {
    event.preventDefault();
    this.isRecuperarMode = true;
    this.pasoRecuperacion = 1;
    this.limpiarMensajes();
  }

  volverLogin() {
    this.isRecuperarMode = false;
    this.isLoginMode = true;
    this.limpiarMensajes();
  }

  limpiarMensajes() {
    this.mensajeError = '';
    this.mensajeExito = '';
    this.password = '';
    this.codigoRecuperacion = '';
  }

  onSubmit() {
    if (this.isRecuperarMode) {
      this.procesarRecuperacion();
      return;
    }

    if (!this.email || !this.password || (!this.isLoginMode && !this.nombre)) {
      this.mensajeError = "Por favor, completa todos los campos requeridos.";
      return;
    }

    this.cargando = true;
    this.mensajeError = '';
    this.mensajeExito = '';

    const endpoint = this.isLoginMode ? 'login.php' : 'registro.php';
    const payload = this.isLoginMode 
      ? { email: this.email, password: this.password }
      : { nombre: this.nombre, email: this.email, password: this.password };

    this.http.post<any>(`http://localhost/cactus-api/${endpoint}`, payload).subscribe({
      next: (res) => {
        this.cargando = false;
        if (res.success) {
          if (this.isLoginMode) {
            if(res.usuario) localStorage.setItem('usuario_cactus', JSON.stringify(res.usuario));
            this.router.navigate(['/']);
          } else {
            this.mensajeExito = "¡Cuenta creada con éxito! Por favor inicia sesión.";
            this.isLoginMode = true; 
            this.password = ''; 
          }
        } else { this.mensajeError = res.mensaje || "Error en la operación"; }
        this.cdr.detectChanges();
      },
      error: () => { this.cargando = false; this.mensajeError = "Error de servidor."; this.cdr.detectChanges(); }
    });
  }

  procesarRecuperacion() {
    if (this.pasoRecuperacion === 1) {
      if (!this.email) { this.mensajeError = "Ingresa tu correo."; return; }
      
      this.cargando = true;
      this.http.post<any>('http://localhost/cactus-api/recuperar_api.php', { accion: 'solicitar_codigo', email: this.email }).subscribe({
        next: (res) => {
          this.cargando = false;
          if (res.success) {
            this.mensajeExito = "Te hemos enviado un código de 6 dígitos a tu correo.";
            this.mensajeError = '';
            this.pasoRecuperacion = 2;
          } else { this.mensajeError = res.mensaje; }
          this.cdr.detectChanges();
        },
        error: () => { this.cargando = false; this.mensajeError = "Error de servidor."; this.cdr.detectChanges(); }
      });
    } 
    else if (this.pasoRecuperacion === 2) {
      if (!this.codigoRecuperacion || !this.password) { this.mensajeError = "Completa los campos."; return; }
      
      this.cargando = true;
      this.http.post<any>('http://localhost/cactus-api/recuperar_api.php', { accion: 'cambiar_password', email: this.email, codigo: this.codigoRecuperacion, nueva_password: this.password }).subscribe({
        next: (res) => {
          this.cargando = false;
          if (res.success) {
            this.mensajeExito = "¡Contraseña actualizada! Ya puedes iniciar sesión.";
            setTimeout(() => this.volverLogin(), 2500);
          } else { this.mensajeError = res.mensaje; }
          this.cdr.detectChanges();
        },
        error: () => { this.cargando = false; this.mensajeError = "Error de servidor."; this.cdr.detectChanges(); }
      });
    }
  }
}