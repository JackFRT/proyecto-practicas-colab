import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.html',
  styleUrl: './admin.css'
})
export class AdminPanel implements OnInit {
  router = inject(Router);
  http = inject(HttpClient);
  cdr = inject(ChangeDetectorRef);

  adminActual: any = null;
  cargando: boolean = true;
  tabActivo: string = 'dashboard';
  toastMsg: string = '';

  usuarios: any[] = [];
  ventas: any[] = [];
  ingresosTotales: number = 0;

  usuariosFiltrados: any[] = [];
  terminoBusquedaUsuario: string = '';
  
  ventasFiltradas: any[] = [];
  filtroTiempoVentas: string = 'todos';
  statsEmpleados: any[] = [];
  statsProductos: any[] = [];

  modalSeguridadAbierto: boolean = false;
  passwordConfirmacion: string = '';
  accionPendiente: any = null;

  modalImagenAbierto: boolean = false;
  imagenSeleccionada: string = '';

  ngOnInit() {
    const userGuardado = typeof localStorage !== 'undefined' ? localStorage.getItem('usuario_cactus') : null;
    if (!userGuardado) { this.router.navigate(['/login']); return; }
    
    this.adminActual = JSON.parse(userGuardado);
    if (this.adminActual.rol !== 'admin') { 
        this.router.navigate(['/']); 
        return; 
    }

    this.cargarDatos();
  }

  cargarDatos() {
    this.cargando = true;
    // Nueva URL de Java por método GET
    this.http.get<any>('http://localhost:8080/api/admin/dashboard').subscribe({
      next: (res) => {
        if (res.success) {
          this.usuarios = res.usuarios || [];
          this.ventas = res.ventas || [];
          this.ingresosTotales = res.ingresos_totales || 0;
          
          this.filtrarUsuarios();
          this.aplicarFiltrosVentas();
        }
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => { this.mostrarToast('Error de conexión.'); this.cargando = false; this.cdr.detectChanges(); }
    });
  }

  cambiarTab(tab: string) { 
    this.tabActivo = tab; 
  }

  ofuscarEmail(email: string): string {
    if (!email || !email.includes('@')) return email;
    const [nombre, dominio] = email.split('@');
    if (nombre.length <= 2) return `${nombre}***@${dominio}`;
    return `${nombre.substring(0, 2)}***@${dominio}`;
  }

  filtrarUsuarios() {
    const termino = this.terminoBusquedaUsuario.toLowerCase().trim();
    if (!termino) {
        this.usuariosFiltrados = this.usuarios;
        return;
    }
    this.usuariosFiltrados = this.usuarios.filter(u => 
        u.nombre.toLowerCase().includes(termino) || 
        u.email.toLowerCase() === termino
    );
  }

  ejecutarAccionSegura(accion: string, idUsuario: number, extraData: any = {}) {
    this.accionPendiente = { accion, idUsuario, extraData };
    this.passwordConfirmacion = '';
    this.modalSeguridadAbierto = true;
  }

  confirmarAccionSegura() {
    if (!this.passwordConfirmacion.trim()) {
        this.mostrarToast('La contraseña es requerida.');
        return;
    }

    // Determinamos la URL correcta en Java según la acción
    let url = '';
    const payload: any = { 
        id_usuario_objetivo: this.accionPendiente.idUsuario 
    };

    if (this.accionPendiente.accion === 'cambiar_rol') {
        url = 'http://localhost:8080/api/admin/cambiar-rol';
        payload.nuevo_rol = this.accionPendiente.extraData.nuevo_rol;
    } else if (this.accionPendiente.accion === 'resetear_ruleta') {
        url = 'http://localhost:8080/api/admin/resetear-ruleta';
    }

    this.cargando = true;
    this.http.post<any>(url, payload).subscribe({
      next: (res) => {
        if(res.success) {
          this.mostrarToast(res.mensaje);
          this.cargarDatos();
        } else { 
          alert(res.mensaje); 
        }
        this.cerrarModalSeguridad();
        this.cargando = false;
      },
      error: () => {
        this.mostrarToast('Error al ejecutar la acción.');
        this.cerrarModalSeguridad();
        this.cargando = false;
      }
    });
  }

  cerrarModalSeguridad() {
    this.modalSeguridadAbierto = false;
    this.passwordConfirmacion = '';
    this.accionPendiente = null;
  }

  verComprobante(archivo: string) {
      if (!archivo) return;
      // Apunta al puerto de Java (Solo útil para imágenes antiguas antes del sistema de tickets)
      this.imagenSeleccionada = `http://localhost:8080/images/comprobantes/${archivo}`;
      this.modalImagenAbierto = true;
  }

  cerrarModalImagen() {
      this.modalImagenAbierto = false;
      this.imagenSeleccionada = '';
  }

  cambiarRol(idUsuario: number, event: any) {
    const nuevoRol = event.target.value;
    this.ejecutarAccionSegura('cambiar_rol', idUsuario, { nuevo_rol: nuevoRol });
  }

  resetearRuleta(idUsuario: number) {
    this.ejecutarAccionSegura('resetear_ruleta', idUsuario);
  }

  aplicarFiltrosVentas() {
    const ahora = new Date();
    
    this.ventasFiltradas = this.ventas.filter(v => {
        if (this.filtroTiempoVentas === 'todos') return true;
        
        // Ajustado al modelo Pedido de Java
        const fechaVenta = new Date(v.fechaPedido);
        const diffTime = Math.abs(ahora.getTime() - fechaVenta.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (this.filtroTiempoVentas === 'dia') return diffDays <= 1;
        if (this.filtroTiempoVentas === 'semana') return diffDays <= 7;
        if (this.filtroTiempoVentas === 'mes') return diffDays <= 30;
        return true;
    });

    this.calcularMetricasVentas();
  }

  calcularMetricasVentas() {
    const mapEmpleados = new Map<string, { total_ventas: number, ingresos: number }>();
    
    this.ventasFiltradas.forEach(v => {
        // Ajustado para leer el objeto EmpleadoAtencion de Java
        const emp = (v.empleadoAtencion && v.empleadoAtencion.nombre) ? v.empleadoAtencion.nombre : 'Sistema Web'; 
        const actual = mapEmpleados.get(emp) || { total_ventas: 0, ingresos: 0 };
        actual.total_ventas += 1;
        actual.ingresos += parseFloat(v.totalPagado);
        mapEmpleados.set(emp, actual);
    });
    
    this.statsEmpleados = Array.from(mapEmpleados.entries())
        .map(([nombre, stats]) => ({ nombre, ...stats }))
        .sort((a, b) => b.ingresos - a.ingresos);
  }

  ir(ruta: string) { this.router.navigate([ruta]); }
  
  cerrarSesion() { 
    localStorage.removeItem('usuario_cactus'); 
    this.router.navigate(['/login']); 
  }
  
  mostrarToast(msg: string) {
    this.toastMsg = msg;
    setTimeout(() => { this.toastMsg = ''; this.cdr.detectChanges(); }, 3500);
  }
}