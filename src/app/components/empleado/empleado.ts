import { Component, OnInit, inject, HostListener, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-empleado',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './empleado.html',
  styleUrl: './empleado.css'
})
export class Empleado implements OnInit {
  router = inject(Router);
  http = inject(HttpClient);
  cdr = inject(ChangeDetectorRef);

  nombreEmpleado: string = 'Empleado';
  idEmpleado: number = 0;
  rolEmpleado: string = 'empleado';
  tabActivo: string = 'ordenes';
  cargando: boolean = true;
  
  vistaInventario: 'cactus' | 'recuerdo' = 'cactus';
  terminoBusqueda: string = '';
  categoriaFiltro: string = 'todas';

  reservas_activas: any[] = [];
  historial_atendidas: any[] = [];
  inventario: any[] = [];
  cupones: any[] = [];
  noticias: any[] = [];
  stats_empleado: any = { total_atendidas: 0 };
  num_notificaciones: number = 0;
  inventarioFiltrado: any[] = [];

  modalAbierto: string | null = null;
  itemEditando: any = null;
  categorias: any[] = [];
  tieneEstilos: boolean = false;
  variantesDinamicas: { nombre_variante: string, stock: number, ruta_imagen?: string }[] = [];
  toastMsg: string = '';
  ordenesExpandidas: Set<number> = new Set();
  terminoFidelidad: string = '';
  sugerenciasClientes: any[] = [];
  clienteSeleccionado: any = null;
  verCategorias: boolean = false;
  catEditando: any = null;

  ngOnInit() {
    const usuarioGuardado = typeof localStorage !== 'undefined' ? localStorage.getItem('usuario_cactus') : null;
    if (!usuarioGuardado) { this.router.navigate(['/login']); return; }

    const user = JSON.parse(usuarioGuardado);
    if (user.rol !== 'empleado' && user.rol !== 'admin') { this.router.navigate(['/']); return; }

    this.nombreEmpleado = user.nombre.toUpperCase();
    this.idEmpleado = user.id_usuario || user.id || 0; 
    this.rolEmpleado = user.rol;
    
    this.prepararRuleta(); 
    this.cargarDashboard();
  }

  cambiarTab(tab: string) {
    this.tabActivo = tab;
    if (tab === 'inventario') this.cambiarVistaInventario(this.vistaInventario);
  }
  
  cerrarSesion() {
    localStorage.removeItem('usuario_cactus');
    this.router.navigate(['/login']);
  }

  irPanelAdmin() { this.router.navigate(['admin/panel']); }
  irTienda() { this.router.navigate(['/']); }

  mostrarToast(msg: string) {
    this.toastMsg = msg;
    setTimeout(() => this.toastMsg = '', 3000);
  }

  toggleOrden(id: number) {
    this.ordenesExpandidas.has(id) ? this.ordenesExpandidas.delete(id) : this.ordenesExpandidas.add(id);
  }

  getRutaImagen(nombreArchivo: string, carpeta: string = 'cactus'): string {
    if (!nombreArchivo) return ''; 
    return `http://localhost/cactus-api/images/${carpeta}/${nombreArchivo}`;
  }

  aplicarFiltros() {
    this.inventarioFiltrado = this.inventario.filter(item => {
        const matchTipo = item.tipo === this.vistaInventario;
        const nombreCompleto = `${item.nombre_comun} ${item.nombre_cientifico || ''}`.toLowerCase();
        const matchBusqueda = nombreCompleto.includes(this.terminoBusqueda.toLowerCase());
        const matchCategoria = this.categoriaFiltro === 'todas' || item.nombre_categoria === this.categoriaFiltro;
        
        if (this.vistaInventario === 'recuerdo') {
            return matchTipo && matchBusqueda;
        }
        return matchTipo && matchBusqueda && matchCategoria;
    });
  }

  cambiarVistaInventario(tipo: 'cactus' | 'recuerdo') {
    this.vistaInventario = tipo;
    this.categoriaFiltro = 'todas';
    this.aplicarFiltros();
  }

  onBuscar(event: Event) {
    this.terminoBusqueda = (event.target as HTMLInputElement).value;
    this.aplicarFiltros();
  }

  onFiltrarCategoria(event: Event) {
    this.categoriaFiltro = (event.target as HTMLSelectElement).value;
    this.aplicarFiltros();
  }

  abrirModal(tipo: string, item?: any) {
    this.itemEditando = item || null;
    this.modalAbierto = tipo;
    
    if (tipo === 'producto') {
      this.variantesDinamicas = [];
      this.tieneEstilos = false;

      if (item) {
        const variantesReales = item.variantes ? item.variantes.filter((v: any) => v.nombre_variante !== 'Estándar') : [];

        if (variantesReales.length > 0 || item.nombre_estilo1) {
            this.tieneEstilos = true;
            
            if (variantesReales.length > 0) {
                this.variantesDinamicas = variantesReales.map((v: any) => ({
                    nombre_variante: v.nombre_variante,
                    stock: v.stock,
                    ruta_imagen: v.ruta_imagen
                }));
            } else {
                if (item.nombre_estilo1) this.variantesDinamicas.push({ nombre_variante: item.nombre_estilo1, stock: item.stock_estilo1 || 0 });
                if (item.nombre_estilo2) this.variantesDinamicas.push({ nombre_variante: item.nombre_estilo2, stock: item.stock_estilo2 || 0 });
                if (item.nombre_estilo3) this.variantesDinamicas.push({ nombre_variante: item.nombre_estilo3, stock: item.stock_estilo3 || 0 });
            }
        }
      }
    }
  }

  cerrarModales() {
    this.modalAbierto = null;
    this.itemEditando = null;
  }

  abrirModalCategorias() { 
      this.verCategorias = true; 
      this.catEditando = null; 
  }
  
  cerrarCategorias() { 
      this.verCategorias = false; 
      this.catEditando = null; 
  }

  toggleEstilos(event: any) { 
      this.tieneEstilos = event.target.checked; 
      if (this.tieneEstilos && this.variantesDinamicas.length === 0) {
          this.agregarVariante();
      }
  }

  agregarVariante() {
      this.variantesDinamicas.push({ nombre_variante: '', stock: 0 });
  }

  eliminarVariante(index: number) {
      this.variantesDinamicas.splice(index, 1);
  }

  draggedNewsIndex: number | null = null;
  onDragStartNews(index: number) { this.draggedNewsIndex = index; }
  onDragOverNews(event: any) { event.preventDefault(); }
  onDropNews(index: number) {
    if (this.draggedNewsIndex !== null && this.draggedNewsIndex !== index) {
      const draggedItem = this.noticias[this.draggedNewsIndex];
      this.noticias.splice(this.draggedNewsIndex, 1);
      this.noticias.splice(index, 0, draggedItem);
      
      const ordenIds = this.noticias.map(n => n.id_noticia);
      this.http.post<any>('http://localhost/cactus-api/marketing_api.php', { accion: 'reordenar_noticias', orden: ordenIds }).subscribe({
        next: (res) => { if(res.success) this.mostrarToast("Prioridad actualizada"); }
      });
    }
    this.draggedNewsIndex = null;
  }

  buscarClientes(event: Event) {
    const valor = (event.target as HTMLInputElement).value;
    this.terminoFidelidad = valor;
    this.clienteSeleccionado = null; 

    if (valor.length < 2) {
      this.sugerenciasClientes = [];
      return;
    }

    this.http.post<any>('http://localhost/cactus-api/ordenes_api.php', { accion: 'buscar_clientes', termino: valor }).subscribe({
      next: (res) => { 
        if (res.success) { 
            this.sugerenciasClientes = res.clientes; 
            this.cdr.detectChanges();
        } 
      }
    });
  }

  seleccionarCliente(cliente: any) {
    this.clienteSeleccionado = cliente;
    this.terminoFidelidad = `${cliente.nombre} (${cliente.email})`;
    this.sugerenciasClientes = [];
  }

  registrarVisita() {
    if (!this.clienteSeleccionado) return;
    
    this.ejecutarAccion('registrar_visita', { id_cliente: this.clienteSeleccionado.id_usuario });
    
    this.clienteSeleccionado = null;
    this.terminoFidelidad = '';
  }

  obtenerEndpoint(accion: string): string {
    if (accion === 'cargar') return 'obtener_dashboard.php';
    if (accion.includes('producto') || accion.includes('categoria')) return 'inventario_api.php';
    if (accion.includes('cupon') || accion.includes('noticia') || accion.includes('ruleta')) return 'marketing_api.php';
    return 'ordenes_api.php'; 
  }

  cargarDashboard() {
    this.cargando = true;
    this.http.post<any>('http://localhost/cactus-api/obtener_dashboard.php', { id_empleado: this.idEmpleado }).subscribe({
      next: (res) => {
        if (res.success) {
          this.reservas_activas = res.datos.reservas || [];
          this.inventario = res.datos.inventario || [];
          this.categorias = res.datos.categorias || [];
          this.cupones = res.datos.cupones || [];
          this.noticias = res.datos.noticias || [];
          this.premios_ruleta = res.datos.ruleta || [];
          this.stats_empleado = res.datos.stats || { total_atendidas: 0 };
          this.historial_atendidas = res.datos.historial_atendidas || [];
          this.num_notificaciones = this.reservas_activas.length;
          
          this.prepararRuleta();
          this.aplicarFiltros();
        }
        this.cargando = false;
      },
      error: (err) => { console.error("Error BD", err); this.cargando = false; }
    });
  }

  procesarFormulario(event: Event, accion: string) {
    event.preventDefault();
    this.cargando = true;
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    formData.append('accion', accion);
    formData.append('id_empleado', this.idEmpleado.toString());

    if (this.itemEditando && accion === 'guardar_producto') {
        formData.append('id_cactus', this.itemEditando.id_producto || this.itemEditando.id_cactus);
    }

    this.http.post<any>(`http://localhost/cactus-api/${this.obtenerEndpoint(accion)}`, formData).subscribe({
        next: (res) => {
            if (res.success) { 
                this.mostrarToast(res.mensaje);
                
                if (accion === 'guardar_categoria') {
                    this.catEditando = null;
                    form.reset();
                } else {
                    this.cerrarModales(); 
                }
                
                this.cargarDashboard(); 
            } else { alert(res.mensaje); }
            this.cargando = false;
        },
        error: () => { alert("Error de conexión"); this.cargando = false; }
    });
  }

  ejecutarAccion(accion: string, extraData: any = {}) {
      if ((accion.includes('eliminar') || accion === 'cancelar') && !confirm("¿Estás seguro?")) return;
      if (accion === 'reportar' && !confirm("ALERTA: ¿Bloquear usuario por 7 días?")) return;
      
      const payload = { accion, id_empleado: this.idEmpleado, ...extraData };

      this.http.post<any>(`http://localhost/cactus-api/${this.obtenerEndpoint(accion)}`, payload).subscribe({
          next: (res) => { 
              if(res.success) { this.mostrarToast(res.mensaje); this.cargarDashboard(); }
              else { alert(res.mensaje); }
          },
          error: () => alert("Error de servidor.")
      });
  }

  ejecutarAccionOrden(id_reserva: number, accion: string, id_usuario_cliente: number = 0) {
    this.ejecutarAccion(accion, { id_reserva: id_reserva, id_usuario: id_usuario_cliente });
  }

  abrirPDF(id_reserva: number) {
    window.open(`http://localhost/cactus-api/generar_comprobante.php?id=${id_reserva}`, '_blank');
  }

  enviarWhatsApp(telefono: string, cliente: string, total_pagado: number) {
    if (!telefono) return;
    const numLimpio = telefono.replace(/\D/g, ''); 
    let mensaje = `Hola ${cliente}, tu orden en Cactus Museum está lista para recojo.`;
    if (total_pagado >= 50) mensaje += ` Por el tamaño de tu pedido, te sugerimos venir en auto o traer bolsas de tela extra. ¡Te esperamos!`;
    window.open(`https://wa.me/${numLimpio}?text=${encodeURIComponent(mensaje)}`, '_blank');
  }

  premios_ruleta: any[] = [];
  draggingIndex: number | null = null;
  svgCenter = { x: 150, y: 150 };
  svgRadius = 140;

  prepararRuleta() {
    let acumulado = 0;
    this.premios_ruleta.forEach(p => {
        p.probabilidad = parseFloat(p.probabilidad) || 0;
        p.startPct = acumulado;
        acumulado += p.probabilidad;
        p.endPct = acumulado;
    });
  }

  getCoordinatesForPercent(percent: number) {
    const x = Math.cos(2 * Math.PI * percent / 100 - Math.PI / 2);
    const y = Math.sin(2 * Math.PI * percent / 100 - Math.PI / 2);
    return { x: this.svgCenter.x + x * this.svgRadius, y: this.svgCenter.y + y * this.svgRadius };
  }

  crearPath(startPct: number, endPct: number) {
    if (endPct - startPct === 100) endPct -= 0.001; 
    const start = this.getCoordinatesForPercent(startPct);
    const end = this.getCoordinatesForPercent(endPct);
    const largeArcFlag = endPct - startPct > 50 ? 1 : 0;
    return `M ${this.svgCenter.x} ${this.svgCenter.y} L ${start.x} ${start.y} A ${this.svgRadius} ${this.svgRadius} 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z`;
  }

  onPointerDown(index: number, event: PointerEvent) { event.preventDefault(); this.draggingIndex = index; }

  @HostListener('document:pointermove', ['$event'])
  onPointerMove(event: PointerEvent) {
    if (this.draggingIndex === null) return;
    const svgElement = document.getElementById('ruleta-svg');
    if (!svgElement) return;

    const rect = svgElement.getBoundingClientRect();
    const x = event.clientX - rect.left - this.svgCenter.x;
    const y = event.clientY - rect.top - this.svgCenter.y;
    
    let angle = Math.atan2(y, x) + Math.PI / 2;
    if (angle < 0) angle += 2 * Math.PI;
    let newBoundaryPct = (angle / (2 * Math.PI)) * 100;
    
    const sliceA = this.premios_ruleta[this.draggingIndex];
    const sliceB = this.premios_ruleta[this.draggingIndex + 1];
    const minPct = sliceA.startPct + 1; 
    const maxPct = sliceB.endPct - 1;   
    
    if (newBoundaryPct >= minPct && newBoundaryPct <= maxPct) {
        sliceA.probabilidad = newBoundaryPct - sliceA.startPct;
        sliceB.probabilidad = sliceB.endPct - newBoundaryPct;
        this.prepararRuleta(); 
    }
  }

  @HostListener('document:pointerup')
  onPointerUp() { this.draggingIndex = null; }

  guardarProbabilidades() {
    const payload: any = {};
    this.premios_ruleta.forEach(p => payload[p.id_premio] = Math.round(p.probabilidad * 10) / 10);
    this.ejecutarAccion('guardar_probabilidades_ruleta', { probabilidades: payload });
  }
}