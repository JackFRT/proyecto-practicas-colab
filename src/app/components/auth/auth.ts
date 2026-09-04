import { Component, inject, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Moka } from '../../services/moka'; 

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [FormsModule, RouterLink, CommonModule],
  templateUrl: './auth.html',
  styleUrl: './auth.css'
})
export class Auth implements OnInit, OnDestroy {
  http = inject(HttpClient);
  router = inject(Router);
  cdr = inject(ChangeDetectorRef);
  mokaService = inject(Moka);

  isLoginMode: boolean = true;
  isRecuperarMode: boolean = false; 
  showPassword: boolean = false;
  
  nombre: string = '';
  email: string = '';
  password: string = '';
  dni: string = '';
  telefono: string = '';
  codigoRecuperacion: string = ''; 
  pasoRecuperacion: number = 1; 
  
  mensajeError: string = '';
  mensajeExito: string = '';
  cargando: boolean = false;

  mokaTexto: string = '';
  mokaImg: string = 'barista_saludando.png';

  ngOnInit() {
      const saludo = this.mokaService.interactuar();
      this.mokaTexto = "¡Hola! Estoy aquí para asegurarme de que entres a salvo al museo.";
      this.mokaImg = saludo.imagen;
  }

  ngOnDestroy() {
      this.mokaService.passwordVisible = false;
  }

  toggleMode() {
    this.isLoginMode = !this.isLoginMode;
    this.isRecuperarMode = false;
    this.showPassword = false;
    this.limpiarMensajes();
    
    this.mokaTexto = this.isLoginMode ? "¿De vuelta al Oasis? ¡Qué alegría!" : "¡Genial! Una nueva cuenta. Te prometo muchos beneficios.";
    this.mokaImg = "barista_feliz.png";
  }

  abrirRecuperacion(event: Event) {
    event.preventDefault();
    this.isRecuperarMode = true;
    this.pasoRecuperacion = 1;
    this.showPassword = false;
    this.limpiarMensajes();
    
    this.mokaTexto = "Uy... ¿olvidaste la llave? No te preocupes, yo te ayudo a recuperarla.";
    this.mokaImg = "barista_emocionada.png";
  }

  volverLogin() {
    this.isRecuperarMode = false;
    this.isLoginMode = true;
    this.showPassword = false;
    this.limpiarMensajes();
  }

  limpiarMensajes() {
    this.mensajeError = '';
    this.mensajeExito = '';
    this.password = '';
    this.codigoRecuperacion = '';
  }

  togglePassword() {
      this.showPassword = !this.showPassword;
      
      this.mokaService.passwordVisible = this.showPassword; 
      
      const reaccion = this.mokaService.reaccionarPassword(this.showPassword);
      this.mokaService.dispararEvento(reaccion.texto, reaccion.imagen, true);
  }

  interactuarMoka() {
      const reaccion = this.mokaService.interactuar();
      this.mokaTexto = reaccion.texto;
      this.mokaImg = reaccion.imagen;
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

    if (this.isLoginMode) {
      this.http.post<any>('http://localhost:8080/api/auth/login', { 
        email: this.email, 
        password: this.password 
      }).subscribe({
        next: (res) => {
          this.cargando = false;
          if (res.success) {
            localStorage.setItem('usuario_cactus', JSON.stringify(res.usuario));
            
            if (res.usuario.rol === 'admin') {
              this.router.navigate(['/admin/panel']);
            } else if (res.usuario.rol === 'empleado') {
              this.router.navigate(['/empleado/dashboard']);
            } else {
              this.router.navigate(['/']); 
            }
          } else {
            this.mensajeError = res.mensaje || "Correo o contraseña incorrectos.";
            this.mokaService.dispararEvento("Uy, parece que hubo un error con tus datos. ¡Inténtalo de nuevo!", "barista_sad.png", true);
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.cargando = false;
          this.mensajeError = "Error de servidor.";
          this.mokaService.dispararEvento("Ay... no me pude conectar con la base de datos.", "barista_asustada.png", true);
          this.cdr.detectChanges();
        }
      });

    } else {
      const payload = { 
        nombre: this.nombre, 
        email: this.email, 
        password: this.password, 
        dni: this.dni, 
        telefono: this.telefono 
      };

      this.http.post<any>('http://localhost:8080/api/auth/registro', payload).subscribe({
        next: (res) => {
          this.cargando = false;
          if (res.success) {
            this.mensajeExito = "¡Cuenta creada con éxito! Por favor inicia sesión.";
            this.isLoginMode = true; 
            this.password = ''; 
            this.mokaService.dispararEvento("¡Registro exitoso! Ahora pon tu correo y entremos.", "barista_emocionada.png", true);
          } else {
            this.mensajeError = res.mensaje || "Error al registrar.";
            this.mokaService.dispararEvento("Ese correo ya parece tener dueño. ¡Intenta con otro!", "barista_sad.png", true);
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.cargando = false;
          this.mensajeError = "Error de servidor.";
          this.mokaService.dispararEvento("Ay... no me pude conectar con la base de datos.", "barista_asustada.png", true);
          this.cdr.detectChanges();
        }
      });
    }
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