import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../services/theme';

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
  themeService = inject(ThemeService);

  adminActual: any = null;
  cargando: boolean = true;
  tabActivo: string = 'dashboard';
  toastMsg: string = '';
  menuLateralAbierto: boolean = true;

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
    if (!userGuardado) {
      this.router.navigate(['/login']);
      return;
    }

    this.adminActual = JSON.parse(userGuardado);
    if (this.adminActual.rol !== 'admin') {
      this.router.navigate(['/']);
      return;
    }

    this.cargarDatos();
  }

  cargarDatos() {
    this.cargando = true;

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
      error: () => {
        this.mostrarToast('Error de conexión.');
        this.cargando = false;
        this.cdr.detectChanges();
      }
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
      (u.nombre || '').toLowerCase().includes(termino) ||
      (u.email || '').toLowerCase().includes(termino)
    );
  }

  ejecutarAccionSegura(accion: string, idUsuario: number, extraData: any = {}) {
    this.accionPendiente = { accion, idUsuario, extraData };
    this.passwordConfirmacion = '';
    this.modalSeguridadAbierto = true;
  }

  confirmarAccionSegura() {
    if (!this.passwordConfirmacion.trim()) {
      this.mostrarToast('La contraseña de administrador es requerida.');
      return;
    }

    let url = '';
    const payload: any = {
      id_admin: this.adminActual.idUsuario || this.adminActual.id_usuario,
      admin_password: this.passwordConfirmacion,
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
        if (res.success) {
          this.mostrarToast(res.mensaje);
          this.cargarDatos();
        } else {
          this.mostrarToast(res.mensaje || 'No se pudo completar la acción.');
        }
        this.cerrarModalSeguridad();
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.mostrarToast(err.error?.mensaje || 'Error al ejecutar la acción.');
        this.cerrarModalSeguridad();
        this.cargando = false;
        this.cdr.detectChanges();
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
    this.imagenSeleccionada = `http://localhost:8080/api/archivos/images/comprobantes/${archivo}`;
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

      const fechaStr = v.fechaPedido || v.fecha_reserva;
      if (!fechaStr) return true;
      const fechaVenta = new Date(fechaStr);
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
    const mapProductos = new Map<string, number>();

    this.ventasFiltradas.forEach(v => {
      const emp = (v.empleadoAtencion && v.empleadoAtencion.nombre)
        ? v.empleadoAtencion.nombre
        : (v.empleado_nombre || 'Sistema Web');
      const actual = mapEmpleados.get(emp) || { total_ventas: 0, ingresos: 0 };
      actual.total_ventas += 1;
      actual.ingresos += parseFloat(v.totalPagado ?? v.total_pagado ?? 0);
      mapEmpleados.set(emp, actual);

      if (v.detalles && Array.isArray(v.detalles)) {
        v.detalles.forEach((d: any) => {
          const nom = d.nombre_comun || d.producto?.nombre || 'Producto';
          const cant = parseInt(d.cantidad) || 1;
          mapProductos.set(nom, (mapProductos.get(nom) || 0) + cant);
        });
      }
    });

    this.statsEmpleados = Array.from(mapEmpleados.entries())
      .map(([nombre, stats]) => ({ nombre, ...stats }))
      .sort((a, b) => b.ingresos - a.ingresos);

    this.statsProductos = Array.from(mapProductos.entries())
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);
  }

  getTotalVentasFiltradas(): number {
    return this.ventasFiltradas.reduce((acc, v) => acc + (parseFloat(v.totalPagado ?? v.total_pagado ?? 0) || 0), 0);
  }

  getEtiquetaPeriodo(): string {
    if (this.filtroTiempoVentas === 'dia') return 'Hoy (Últimas 24 horas)';
    if (this.filtroTiempoVentas === 'semana') return 'Últimos 7 días';
    if (this.filtroTiempoVentas === 'mes') return 'Últimos 30 días';
    return 'Histórico Total';
  }

  private formatearFechaReporte(fechaStr: any): string {
    if (!fechaStr) return '-';
    const d = new Date(fechaStr);
    if (isNaN(d.getTime())) return String(fechaStr);
    return d.toLocaleString('es-PE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  private obtenerResumenProductosVenta(v: any): string {
    if (!v.detalles || !Array.isArray(v.detalles) || v.detalles.length === 0) {
      return 'Venta en tienda';
    }
    return v.detalles
      .map((d: any) => `${d.cantidad || 1}x ${d.nombre_comun || d.producto?.nombre || 'Producto'}`)
      .join(', ');
  }

  exportarReporteExcel() {
    const fechaArchivo = new Date().toISOString().slice(0, 10);
    const totalPeriodo = this.getTotalVentasFiltradas().toFixed(2);
    const periodo = this.getEtiquetaPeriodo();

    let filasVentas = '';
    this.ventasFiltradas.forEach(v => {
      const id = v.id_reserva || v.idPedido || '';
      const fecha = this.formatearFechaReporte(v.fecha_reserva || v.fechaPedido);
      const cliente = v.cliente || 'Cliente';
      const empleado = v.empleado_nombre || v.empleadoAtencion?.nombre || 'Web';
      const tipoComp = (v.tipo_comprobante || v.tipoComprobante || 'boleta').toUpperCase();
      const detalle = this.obtenerResumenProductosVenta(v);
      const monto = (parseFloat(v.total_pagado ?? v.totalPagado ?? 0) || 0).toFixed(2);

      filasVentas += `
        <tr>
          <td style="text-align:center;">#${id}</td>
          <td>${fecha}</td>
          <td>${cliente}</td>
          <td>${empleado}</td>
          <td style="text-align:center;">${tipoComp}</td>
          <td>${detalle}</td>
          <td style="text-align:right; font-weight:bold;">S/ ${monto}</td>
        </tr>`;
    });

    let filasEmpleados = '';
    this.statsEmpleados.forEach(emp => {
      filasEmpleados += `
        <tr>
          <td>${emp.nombre}</td>
          <td style="text-align:center;">${emp.total_ventas}</td>
          <td style="text-align:right;">S/ ${(emp.ingresos || 0).toFixed(2)}</td>
        </tr>`;
    });

    let filasProductos = '';
    this.statsProductos.forEach(p => {
      filasProductos += `
        <tr>
          <td>${p.nombre}</td>
          <td style="text-align:center;">${p.cantidad}</td>
        </tr>`;
    });

    const htmlExcel = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:x="urn:schemas-microsoft-com:office:excel"
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8">
        <style>
          table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; }
          th { background-color: #2d4234; color: #ffffff; font-weight: bold; padding: 8px; border: 1px solid #999; }
          td { padding: 6px 8px; border: 1px solid #ccc; }
          .titulo { font-size: 16px; font-weight: bold; background-color: #d1b88e; color: #1a281f; padding: 10px; }
        </style>
      </head>
      <body>
        <table>
          <tr><td colspan="7" class="titulo">REPORTE DE VENTAS - CAFÉ AYACUCHANO &amp; CACTUS MUSEUM</td></tr>
          <tr><td colspan="2"><strong>Periodo:</strong></td><td colspan="5">${periodo}</td></tr>
          <tr><td colspan="2"><strong>Generado por:</strong></td><td colspan="5">${this.adminActual?.nombre || 'Administrador'} (${new Date().toLocaleString('es-PE')})</td></tr>
          <tr><td colspan="2"><strong>Órdenes en el periodo:</strong></td><td colspan="5">${this.ventasFiltradas.length}</td></tr>
          <tr><td colspan="2"><strong>Ingresos del periodo:</strong></td><td colspan="5"><strong>S/ ${totalPeriodo}</strong></td></tr>
        </table>
        <br/>
        <table>
          <thead>
            <tr><th colspan="3">DESEMPEÑO DE EMPLEADOS</th></tr>
            <tr><th>Empleado</th><th>Órdenes Atendidas</th><th>Ingresos Generados</th></tr>
          </thead>
          <tbody>${filasEmpleados || '<tr><td colspan="3">Sin registros</td></tr>'}</tbody>
        </table>
        <br/>
        <table>
          <thead>
            <tr><th colspan="2">TOP 5 PRODUCTOS MÁS VENDIDOS</th></tr>
            <tr><th>Producto</th><th>Unidades Vendidas</th></tr>
          </thead>
          <tbody>${filasProductos || '<tr><td colspan="2">Sin registros</td></tr>'}</tbody>
        </table>
        <br/>
        <table>
          <thead>
            <tr>
              <th>N° Orden</th>
              <th>Fecha de Entrega</th>
              <th>Cliente</th>
              <th>Atendido por</th>
              <th>Comprobante</th>
              <th>Productos</th>
              <th>Monto Pagado</th>
            </tr>
          </thead>
          <tbody>
            ${filasVentas || '<tr><td colspan="7">No hay ventas en este periodo</td></tr>'}
            <tr>
              <td colspan="6" style="text-align:right; font-weight:bold; background:#f2efe9;">TOTAL INGRESOS:</td>
              <td style="text-align:right; font-weight:bold; background:#f2efe9;">S/ ${totalPeriodo}</td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>`;

    const blob = new Blob(['\ufeff', htmlExcel], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_ventas_cactus_museum_${fechaArchivo}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.mostrarToast('Reporte en Excel descargado correctamente.');
  }

  exportarReportePDF() {
    const totalPeriodo = this.getTotalVentasFiltradas().toFixed(2);
    const periodo = this.getEtiquetaPeriodo();
    const fechaActual = new Date().toLocaleString('es-PE');

    let filasVentas = '';
    this.ventasFiltradas.forEach(v => {
      const id = v.id_reserva || v.idPedido || '';
      const fecha = this.formatearFechaReporte(v.fecha_reserva || v.fechaPedido);
      const cliente = v.cliente || 'Cliente';
      const empleado = v.empleado_nombre || v.empleadoAtencion?.nombre || 'Web';
      const tipoComp = (v.tipo_comprobante || v.tipoComprobante || 'boleta').toUpperCase();
      const detalle = this.obtenerResumenProductosVenta(v);
      const monto = (parseFloat(v.total_pagado ?? v.totalPagado ?? 0) || 0).toFixed(2);

      filasVentas += `
        <tr>
          <td><strong>#${id}</strong></td>
          <td>${fecha}</td>
          <td>${cliente}</td>
          <td>${empleado}</td>
          <td>${tipoComp}</td>
          <td>${detalle}</td>
          <td style="text-align:right; font-weight:bold;">S/ ${monto}</td>
        </tr>`;
    });

    let filasEmpleados = '';
    this.statsEmpleados.forEach(emp => {
      filasEmpleados += `
        <tr>
          <td>${emp.nombre}</td>
          <td style="text-align:center;">${emp.total_ventas}</td>
          <td style="text-align:right; font-weight:bold;">S/ ${(emp.ingresos || 0).toFixed(2)}</td>
        </tr>`;
    });

    let filasProductos = '';
    this.statsProductos.forEach(p => {
      filasProductos += `
        <tr>
          <td>${p.nombre}</td>
          <td style="text-align:center; font-weight:bold;">${p.cantidad} unds.</td>
        </tr>`;
    });

    const ventana = window.open('', '_blank', 'width=980,height=780');
    if (!ventana) {
      this.mostrarToast('Habilita las ventanas emergentes para generar el PDF.');
      return;
    }

    const htmlPDF = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Reporte de Ventas - Café Ayacuchano & Cactus Museum</title>
        <style>
          * { box-sizing: border-box; font-family: 'Segoe UI', Arial, sans-serif; }
          body { margin: 0; padding: 28px; color: #1a281f; background: #fff; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #2d4234; padding-bottom: 16px; margin-bottom: 22px; }
          .header h1 { margin: 0 0 4px 0; font-size: 22px; color: #2d4234; text-transform: uppercase; }
          .header p { margin: 2px 0; font-size: 12px; color: #555; }
          .kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 22px; }
          .kpi-card { border: 1px solid #d5cfc2; background: #faf8f4; border-radius: 10px; padding: 14px; text-align: center; }
          .kpi-card span { display: block; font-size: 11px; color: #666; text-transform: uppercase; font-weight: bold; }
          .kpi-card strong { font-size: 22px; color: #2d4234; margin-top: 4px; display: block; }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 22px; }
          h3 { font-size: 14px; color: #2d4234; text-transform: uppercase; margin: 0 0 8px 0; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 18px; }
          th { background: #2d4234; color: #fff; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; }
          td { padding: 7px 10px; border-bottom: 1px solid #e5e5e5; }
          tr:nth-child(even) td { background: #fafafa; }
          .total-row td { background: #efe9dc !important; font-weight: bold; font-size: 13px; border-top: 2px solid #2d4234; }
          .no-print { margin-bottom: 18px; display: flex; justify-content: flex-end; gap: 10px; }
          .btn { background: #2d4234; color: #fff; border: none; padding: 9px 18px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 12px; }
          @media print { .no-print { display: none !important; } body { padding: 10px; } }
        </style>
      </head>
      <body>
        <div class="no-print">
          <button class="btn" onclick="window.print()">Guardar como PDF / Imprimir</button>
        </div>
        <div class="header">
          <div>
            <h1>Café Ayacuchano &amp; Cactus Museum</h1>
            <p>Jr. Asamblea 245 / Jr. San Cristóbal, Ayacucho</p>
            <p><strong>Reporte Ejecutivo de Ventas</strong></p>
          </div>
          <div style="text-align:right;">
            <p><strong>Periodo:</strong> ${periodo}</p>
            <p><strong>Fecha de Emisión:</strong> ${fechaActual}</p>
            <p><strong>Emitido por:</strong> ${this.adminActual?.nombre || 'Admin'}</p>
          </div>
        </div>

        <div class="kpis">
          <div class="kpi-card">
            <span>Órdenes del Periodo</span>
            <strong>${this.ventasFiltradas.length}</strong>
          </div>
          <div class="kpi-card">
            <span>Ingresos del Periodo</span>
            <strong>S/ ${totalPeriodo}</strong>
          </div>
          <div class="kpi-card">
            <span>Ingresos Históricos</span>
            <strong>S/ ${(this.ingresosTotales || 0).toFixed(2)}</strong>
          </div>
        </div>

        <div class="grid-2">
          <div>
            <h3>Desempeño de Empleados</h3>
            <table>
              <thead><tr><th>Empleado</th><th style="text-align:center;">Órdenes</th><th style="text-align:right;">Ingresos</th></tr></thead>
              <tbody>${filasEmpleados || '<tr><td colspan="3">Sin datos</td></tr>'}</tbody>
            </table>
          </div>
          <div>
            <h3>Top 5 Productos Más Vendidos</h3>
            <table>
              <thead><tr><th>Producto</th><th style="text-align:center;">Cantidad</th></tr></thead>
              <tbody>${filasProductos || '<tr><td colspan="2">Sin datos</td></tr>'}</tbody>
            </table>
          </div>
        </div>

        <h3>Detalle de Ventas Completadas</h3>
        <table>
          <thead>
            <tr>
              <th>Orden</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Atendido por</th>
              <th>Doc.</th>
              <th>Detalle</th>
              <th style="text-align:right;">Monto</th>
            </tr>
          </thead>
          <tbody>
            ${filasVentas || '<tr><td colspan="7" style="text-align:center;">No hay ventas registradas en este periodo.</td></tr>'}
            <tr class="total-row">
              <td colspan="6" style="text-align:right;">TOTAL DEL PERIODO:</td>
              <td style="text-align:right;">S/ ${totalPeriodo}</td>
            </tr>
          </tbody>
        </table>
        <script>
          window.onload = function() { setTimeout(function() { window.print(); }, 250); };
        </script>
      </body>
      </html>`;

    ventana.document.open();
    ventana.document.write(htmlPDF);
    ventana.document.close();
  }

  ir(ruta: string) {
    this.router.navigate([ruta]);
  }

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
