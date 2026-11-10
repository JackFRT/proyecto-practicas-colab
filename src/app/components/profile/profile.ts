import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../services/theme';

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
  themeService = inject(ThemeService);

  tabActivo: string = 'socio';
  cargando: boolean = true;
  toastMsg: string = '';
  rolUsuario: string = 'cliente';
  menuLateralAbierto: boolean = true;

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
    if (!guardado) {
      this.router.navigate(['/login']);
      return;
    }

    const user = JSON.parse(guardado);
    this.rolUsuario = user.rol || 'cliente';

    if (this.rolUsuario === 'empleado') {
      this.tabActivo = 'info';
    }

    const idUsuario = user.idUsuario || user.id_usuario;
    this.cargarDatos(idUsuario);
  }

  cargarDatos(id_usuario: number) {
    this.cargando = true;
    this.http.get<any>(`http://localhost:8080/api/perfil/cargar/${id_usuario}`).subscribe({
      next: (res) => {
        if (res.success) {
          this.usuario = res.usuario;
          const visitas = parseInt(this.usuario.visitas_presenciales ?? this.usuario.visitasPresenciales) || 0;
          const comprados = parseInt(this.usuario.productos_comprados ?? this.usuario.productosComprados) || 0;

          this.usuario.datos_nivel = this.calcularNivelSocio(visitas);
          this.usuario.plantas_acumuladas = res.datos_nivel?.plantas_acumuladas ?? (comprados % 4);
          this.usuario.progreso_plantas = res.datos_nivel?.progreso_plantas ?? ((this.usuario.plantas_acumuladas / 4) * 100);

          this.historial = res.historial || [];
          this.cupones = res.cupones || [];

          this.editNombre = this.usuario.nombre || '';
          this.editEmail = this.usuario.email || '';
          this.editDni = this.usuario.dni || '';
          this.editTelefono = this.usuario.telefono || '';

          localStorage.setItem('usuario_cactus', JSON.stringify(this.usuario));
        }
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.mostrarToast('Error al conectar con el servidor.');
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  calcularNivelSocio(visitasTotales: number) {
    let nivel = 0;
    let descuento = 0;
    let progreso = 0;
    let metaNivel = 3;
    let visitasNivelActual = visitasTotales;
    let textoNext = 'Nivel 1 (2% Dcto)';

    if (visitasTotales >= 51) {
      nivel = 5; descuento = 15; progreso = 100; metaNivel = 20;
      visitasNivelActual = 20; textoNext = '¡Nivel Máximo Alcanzado!';
    } else if (visitasTotales >= 31) {
      nivel = 4; descuento = 10; metaNivel = 20;
      visitasNivelActual = visitasTotales - 31;
      progreso = (visitasNivelActual / metaNivel) * 100;
      textoNext = 'Nivel 5 (15% Dcto)';
    } else if (visitasTotales >= 16) {
      nivel = 3; descuento = 7; metaNivel = 15;
      visitasNivelActual = visitasTotales - 16;
      progreso = (visitasNivelActual / metaNivel) * 100;
      textoNext = 'Nivel 4 (10% Dcto)';
    } else if (visitasTotales >= 8) {
      nivel = 2; descuento = 5; metaNivel = 8;
      visitasNivelActual = visitasTotales - 8;
      progreso = (visitasNivelActual / metaNivel) * 100;
      textoNext = 'Nivel 3 (7% Dcto)';
    } else if (visitasTotales >= 3) {
      nivel = 1; descuento = 2; metaNivel = 5;
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
      beneficios: descuento > 0
        ? `Descuento permanente del ${descuento}% en todas tus compras en tienda.`
        : 'Aún no tienes beneficios fijos. ¡Sigue visitándonos para subir de nivel!'
    };
  }

  cambiarTab(tab: string) {
    this.tabActivo = tab;
  }

  toggleOrden(id: number) {
    this.ordenesExpandidas.has(id) ? this.ordenesExpandidas.delete(id) : this.ordenesExpandidas.add(id);
  }

  esCuponDeCompra(codigo: string): boolean {
    return (codigo || '').toUpperCase().startsWith('MOKA-');
  }

  getRutaImagen(item: any): string {
    const img = item?.imagen_url || item?.producto?.imagen_url || '';
    if (!img) return '/assets/images/museo/logo-cafe.png';
    if (img.startsWith('http') || img.startsWith('/assets')) return img;
    const tipo = item?.producto?.tipo || item?.producto?.tipoProducto || 'cactus';
    return `http://localhost:8080/api/archivos/images/${tipo}/${img}`;
  }

  actualizarPerfil() {
    this.cargando = true;
    const idUsuario = this.usuario.idUsuario || this.usuario.id_usuario;
    const payload = {
      id_usuario: idUsuario,
      nombre: this.editNombre,
      email: this.editEmail,
      nueva_password: this.editPass,
      dni: this.editDni,
      telefono: this.editTelefono
    };

    this.http.post<any>('http://localhost:8080/api/perfil/actualizar', payload).subscribe({
      next: (res) => {
        if (res.success) {
          this.mostrarToast(res.mensaje || 'Perfil actualizado correctamente.');
          this.usuario.nombre = this.editNombre;
          this.usuario.dni = this.editDni;
          this.usuario.telefono = this.editTelefono;
          localStorage.setItem('usuario_cactus', JSON.stringify(this.usuario));
          this.editPass = '';
        } else {
          this.mostrarToast(res.mensaje || 'No se pudo actualizar el perfil.');
        }
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.mostrarToast(err.error?.mensaje || 'Error al actualizar el perfil.');
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  eliminarCuenta() {
    if (confirm('ALERTA: Esta acción es irreversible. ¿Deseas eliminar tu cuenta, progreso y premios permanentemente?')) {
      const idUsuario = this.usuario.idUsuario || this.usuario.id_usuario;
      this.http.delete<any>(`http://localhost:8080/api/perfil/eliminar/${idUsuario}`).subscribe({
        next: (res) => {
          if (res.success) {
            localStorage.removeItem('usuario_cactus');
            localStorage.removeItem('token_cactus');
            this.router.navigate(['/']);
          } else {
            this.mostrarToast(res.mensaje || 'Error al eliminar la cuenta.');
          }
        },
        error: () => {
          this.mostrarToast('Error al eliminar la cuenta.');
        }
      });
    }
  }

  abrirPDF(id_reserva: number) {
    window.open(`http://localhost:8080/api/pedidos/comprobante/${id_reserva}`, '_blank');
  }

  irTienda() { this.router.navigate(['/']); }
  irPanelEmpleado() { this.router.navigate(['/empleado/dashboard']); }
  irPanelAdmin() { this.router.navigate(['/admin/panel']); }

  cerrarSesion() {
    localStorage.removeItem('usuario_cactus');
    localStorage.removeItem('token_cactus');
    this.router.navigate(['/login']);
  }

  mostrarToast(msg: string) {
    this.toastMsg = msg;
    setTimeout(() => { this.toastMsg = ''; this.cdr.detectChanges(); }, 3500);
  }
}
