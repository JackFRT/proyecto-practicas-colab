import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class Profile implements OnInit {
  router = inject(Router);
  http = inject(HttpClient);
  cdr = inject(ChangeDetectorRef);

  tabActivo: string = 'socio';
  cargando: boolean = true;
  toastMsg: string = '';
  rolUsuario: string = 'cliente';

  usuario: any = {};
  historial: any[] = [];
  cupones: any[] = [];
  ordenesExpandidas: Set<number> = new Set();

  editNombre: string = '';
  editEmail: string = '';
  editPass: string = '';
  editDni: string = '';
  editTelefono: string = '';

  ngOnInit() {
    const guardado = typeof localStorage !== 'undefined' ? localStorage.getItem('usuario_cactus') : null;
    if (!guardado) { this.router.navigate(['/login']); return; }
    
    const user = JSON.parse(guardado);
    this.rolUsuario = user.rol || 'cliente';

    if (this.rolUsuario === 'empleado') {
        this.tabActivo = 'info';
    }

    this.cargarDatos(user.id_usuario);
  }

  cargarDatos(id_usuario: number) {
    this.cargando = true;
    this.http.post<any>('http://localhost/cactus-api/perfil_api.php', { accion: 'cargar_perfil', id_usuario }).subscribe({
      next: (res) => {
        if (res.success) {
          this.usuario = res.usuario;
          
          this.usuario.datos_nivel = this.calcularNivelSocio(parseInt(this.usuario.visitas_presenciales) || 0);

          this.historial = res.historial;
          this.cupones = res.cupones;

          this.editNombre = this.usuario.nombre;
          this.editEmail = this.usuario.email;
          this.editDni = this.usuario.dni || '';
          this.editTelefono = this.usuario.telefono || '';
        }
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => { this.mostrarToast('Error al conectar con el servidor.'); this.cargando = false; this.cdr.detectChanges(); }
    });
  }

  calcularNivelSocio(visitasTotales: number) {
      let nivel = 0;
      let descuento = 0;
      let progreso = 0;
      let metaNivel = 3;
      let visitasNivelActual = visitasTotales;
      let textoNext = 'Nivel 1 (2% Dcto)';

      if (visitasTotales >= 68) {
          nivel = 5; descuento = 15; progreso = 100; metaNivel = 25;
          visitasNivelActual = 25; textoNext = '¡Nivel Máximo Alcanzado!';
      } else if (visitasTotales >= 43) {
          nivel = 4; descuento = 10; metaNivel = 25;
          visitasNivelActual = visitasTotales - 43;
          progreso = (visitasNivelActual / metaNivel) * 100;
          textoNext = 'Nivel 5 (15% Dcto)';
      } else if (visitasTotales >= 23) {
          nivel = 3; descuento = 7; metaNivel = 20;
          visitasNivelActual = visitasTotales - 23;
          progreso = (visitasNivelActual / metaNivel) * 100;
          textoNext = 'Nivel 4 (10% Dcto)';
      } else if (visitasTotales >= 11) {
          nivel = 2; descuento = 5; metaNivel = 12;
          visitasNivelActual = visitasTotales - 11;
          progreso = (visitasNivelActual / metaNivel) * 100;
          textoNext = 'Nivel 3 (7% Dcto)';
      } else if (visitasTotales >= 3) {
          nivel = 1; descuento = 2; metaNivel = 8;
          visitasNivelActual = visitasTotales - 3;
          progreso = (visitasNivelActual / metaNivel) * 100;
          textoNext = 'Nivel 2 (5% Dcto)';
      } else {
          nivel = 0; descuento = 0; metaNivel = 3;
          visitasNivelActual = visitasTotales;
          progreso = (visitasNivelActual / metaNivel) * 100;
          textoNext = 'Nivel 1 (2% Dcto)';
      }

      return {
          nivel,
          descuento,
          progreso,
          visitasNivelActual,
          metaNivel,
          textoNext,
          beneficios: descuento > 0 ? `Descuento permanente del ${descuento}% en todas tus compras en tienda.` : 'Aún no tienes beneficios fijos. ¡Sigue visitándonos!'
      };
  }

  cambiarTab(tab: string) { this.tabActivo = tab; }

  toggleOrden(id: number) {
    this.ordenesExpandidas.has(id) ? this.ordenesExpandidas.delete(id) : this.ordenesExpandidas.add(id);
  }

  esCuponDeCompra(codigo: string): boolean {
    return codigo.toUpperCase().startsWith('MOKA-');
  }

  getRutaImagen(producto: any): string {
    let img = producto.imagen_url || 'placeholder.png';
    if (producto.estilo_seleccionado && producto.estilo_seleccionado !== 'Estándar' && producto.estilo_seleccionado !== 'Principal') {
        if (producto.estilo_seleccionado === producto.nombre_estilo1) img = producto.imagen_extra1;
        else if (producto.estilo_seleccionado === producto.nombre_estilo2) img = producto.imagen_extra2;
        else if (producto.estilo_seleccionado === producto.nombre_estilo3) img = producto.imagen_extra3;
    }
    return `http://localhost/cactus-api/images/cactus/${img}`;
  }

  actualizarPerfil() {
    this.cargando = true;
    const payload = {
        accion: 'actualizar_perfil',
        id_usuario: this.usuario.id_usuario,
        nombre: this.editNombre,
        email: this.editEmail,
        password: this.editPass,
        dni: this.editDni,
        telefono: this.editTelefono
    };

    this.http.post<any>('http://localhost/cactus-api/perfil_api.php', payload).subscribe(res => {
        if (res.success) {
            this.mostrarToast(res.mensaje);
            const local = JSON.parse(localStorage.getItem('usuario_cactus')!);
            local.nombre = this.editNombre;
            local.email = this.editEmail;
            local.dni = this.editDni;
            local.telefono = this.editTelefono;
            localStorage.setItem('usuario_cactus', JSON.stringify(local));
            
            this.editPass = '';
        } else {
            this.mostrarToast(res.mensaje);
        }
        this.cargando = false;
        this.cdr.detectChanges();
    });
  }

  eliminarCuenta() {
    if (confirm('ALERTA: Esta acción es irreversible. ¿Deseas eliminar tu cuenta, progreso y premios?')) {
        this.http.post<any>('http://localhost/cactus-api/perfil_api.php', { accion: 'eliminar_cuenta', id_usuario: this.usuario.id_usuario }).subscribe(res => {
            if (res.success) {
                localStorage.removeItem('usuario_cactus');
                this.router.navigate(['/']);
            }
        });
    }
  }

  abrirPDF(id_reserva: number) {
    window.open(`http://localhost/cactus-api/generar_comprobante.php?id=${id_reserva}`, '_blank');
  }

  irTienda() { this.router.navigate(['/']); }
  irPanelEmpleado() { this.router.navigate(['/empleado/dashboard']); }
  irPanelAdmin() { this.router.navigate(['/admin/panel']); }

  cerrarSesion() {
    localStorage.removeItem('usuario_cactus');
    this.router.navigate(['/login']);
  }

  mostrarToast(msg: string) {
    this.toastMsg = msg;
    setTimeout(() => { this.toastMsg = ''; this.cdr.detectChanges(); }, 3500);
  }
}