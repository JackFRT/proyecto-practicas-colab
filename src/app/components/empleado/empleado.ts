import { Component, OnInit, inject, HostListener, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalesEmpleadoComponent } from '../../modales-empleado/modales-empleado';

@Component({
  selector: 'app-empleado',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalesEmpleadoComponent],
  templateUrl: './empleado.html',
  styleUrl: './empleado.css',
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
  
  vistaInventario: 'cactus' | 'cafe' | 'recuerdo' = 'cactus';
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

  ofuscarEmail(email: string): string {
    if (!email || !email.includes('@')) return email;
    const [nombre, dominio] = email.split('@');
    if (nombre.length <= 2) return `${nombre}***@${dominio}`;
    return `${nombre.substring(0, 2)}***@${dominio}`;
  }

  ofuscarDni(dni: string): string {
    if (!dni || dni.length < 4) return dni;
    return `${dni.substring(0, 2)}****${dni.substring(dni.length - 2)}`;
  }

  irConfiguracionPerfil() {
      this.router.navigate(['/cliente/perfil']); 
  }

  ngOnInit() {
    const usuarioGuardado = typeof localStorage !== 'undefined' ? localStorage.getItem('usuario_cactus') : null;
    if (!usuarioGuardado) { this.router.navigate(['/login']); return; }

    const user = JSON.parse(usuarioGuardado);
    if (user.rol !== 'empleado' && user.rol !== 'admin') { this.router.navigate(['/']); return; }

    this.idEmpleado = user.id_usuario || user.idUsuario || user.id || 0; 
    
    if (this.idEmpleado === 0) {
        console.error("CRÍTICO: No se pudo obtener el ID del usuario del localStorage:", user);
    }

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
    localStorage.removeItem('token_cactus');
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
    return `http://localhost:8080/images/${carpeta}/${nombreArchivo}`;
  }

  aplicarFiltros() {
    this.inventarioFiltrado = this.inventario.filter(item => {
        const matchTipo = item.tipo === this.vistaInventario;
        const nombreCompleto = `${item.nombre_comun} ${item.nombre_cientifico || ''}`.toLowerCase();
        const matchBusqueda = nombreCompleto.includes(this.terminoBusqueda.toLowerCase());
        const matchCategoria = this.categoriaFiltro === 'todas' || item.nombre_categoria === this.categoriaFiltro;
        
        return matchTipo && matchBusqueda && matchCategoria;
    });
  }

  cambiarVistaInventario(tipo: 'cactus' | 'cafe' | 'recuerdo') {
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
    this.itemEditando = item ? JSON.parse(JSON.stringify(item)) : null;
    this.modalAbierto = tipo;
    
    if (tipo === 'producto') {
      this.variantesDinamicas = [];
      this.tieneEstilos = false;

      if (this.itemEditando) {
        let variantesReales: any[] = [];
        
        if (this.itemEditando.variantes && Array.isArray(this.itemEditando.variantes)) {
            variantesReales = this.itemEditando.variantes.filter((v: any) => {
                const nombre = v.nombre_variante ? v.nombre_variante.trim().toLowerCase() : '';
                return nombre !== 'estándar' && nombre !== 'estandar' && nombre !== '';
            });
        }

        let tieneEstilo1Viejo = false;
        if (this.itemEditando.nombre_estilo1) {
            const nombreViejo = this.itemEditando.nombre_estilo1.trim().toLowerCase();
            if (nombreViejo !== 'estándar' && nombreViejo !== 'estandar' && nombreViejo !== '') {
                tieneEstilo1Viejo = true;
            }
        }

        if (variantesReales.length === 0 && !tieneEstilo1Viejo) {
            if (this.itemEditando.variantes && this.itemEditando.variantes.length > 0) {
                this.itemEditando.stock = this.itemEditando.variantes[0].stock;
            } else if (this.itemEditando.stock_estilo1 !== undefined && this.itemEditando.stock_estilo1 !== null) {
                this.itemEditando.stock = this.itemEditando.stock_estilo1;
            }
        }

        if (variantesReales.length > 0 || tieneEstilo1Viejo) {
            this.tieneEstilos = true;
            
            if (variantesReales.length > 0) {
                this.variantesDinamicas = variantesReales.map((v: any) => ({
                    nombre_variante: v.nombre_variante,
                    stock: v.stock,
                    ruta_imagen: v.ruta_imagen
                }));
            } else {
                if (tieneEstilo1Viejo) this.variantesDinamicas.push({ nombre_variante: this.itemEditando.nombre_estilo1, stock: this.itemEditando.stock_estilo1 || 0 });
                if (this.itemEditando.nombre_estilo2) this.variantesDinamicas.push({ nombre_variante: this.itemEditando.nombre_estilo2, stock: this.itemEditando.stock_estilo2 || 0 });
                if (this.itemEditando.nombre_estilo3) this.variantesDinamicas.push({ nombre_variante: this.itemEditando.nombre_estilo3, stock: this.itemEditando.stock_estilo3 || 0 });
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
      // Actualizado a ruta REST (Asegúrate de que este endpoint exista en MarketingController)
      this.http.post<any>('http://localhost:8080/api/marketing/noticias/reordenar', { orden: ordenIds }).subscribe({
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

    // Adaptado a la API REST de Usuarios
    this.http.get<any>(`http://localhost:8080/api/usuarios?termino=${valor}`).subscribe({
      next: (res) => { 
        this.sugerenciasClientes = res || []; 
        this.cdr.detectChanges();
      }
    });
  }

  seleccionarCliente(cliente: any) {
    this.clienteSeleccionado = cliente;
    this.terminoFidelidad = `${cliente.nombre} (${this.ofuscarEmail(cliente.email)})`;
    this.sugerenciasClientes = [];
  }

  registrarVisita() {
    if (!this.clienteSeleccionado) return;
    this.ejecutarAccion('registrar_visita', { id_cliente: this.clienteSeleccionado.idUsuario || this.clienteSeleccionado.id_usuario });
    this.clienteSeleccionado = null;
    this.terminoFidelidad = '';
  }

  cargarDashboard() {
    this.cargando = true;
    this.http.get<any>(`http://localhost:8080/api/empleado/dashboard/${this.idEmpleado}`).subscribe({
      next: (res) => {
        if (res.success) {
          this.reservas_activas = res.ordenesActivas || [];
          this.historial_atendidas = res.historial || [];
          this.stats_empleado = { total_atendidas: res.totalAtendidas || 0 };
          this.num_notificaciones = this.reservas_activas.length;

          this.inventario = res.inventario || res.productos || [];
          this.categorias = res.categorias || [];
          this.cupones = res.cupones || [];
          this.noticias = res.noticias || [];
          this.premios_ruleta = res.ruleta || res.premios_ruleta || [];
          
          this.autoRepararRuleta();
          this.prepararRuleta();
          this.aplicarFiltros();
        }
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => { console.error("Error BD", err); this.cargando = false; }
    });
  }

  procesarFormulario(event: Event, accion: string) {
    event.preventDefault();
    this.cargando = true;
    const form = event.target as HTMLFormElement;
    
    let urlTarget = '';
    if (accion === 'guardar_categoria') urlTarget = 'http://localhost:8080/api/inventario/categorias/guardar';
    else if (accion === 'guardar_producto') urlTarget = 'http://localhost:8080/api/inventario/productos/guardar';
    else if (accion === 'guardar_noticia') urlTarget = `http://localhost:8080/api/marketing/noticias/guardar/${this.idEmpleado}`;
    else if (accion === 'guardar_cupon') urlTarget = `http://localhost:8080/api/marketing/cupones/guardar/${this.idEmpleado}`;
    else if (accion === 'guardar_premio_ruleta') urlTarget = `http://localhost:8080/api/ruleta/guardar/${this.idEmpleado}`;

    if (urlTarget === '') {
        alert("Acción no reconocida: " + accion);
        this.cargando = false;
        return;
    }

    // 🌟 RUTA A: PRODUCTOS Y NOTICIAS (Envían Archivos/Fotos intactos)
    if (accion === 'guardar_producto' || accion === 'guardar_noticia') {
        const formData = new FormData(form);
        formData.append('id_empleado', this.idEmpleado.toString());
        
        if (accion === 'guardar_producto') {
            if (this.itemEditando) formData.append('id_producto', this.itemEditando.id_producto || this.itemEditando.id_cactus || '');
            if (this.tieneEstilos) formData.append('variantes_json', JSON.stringify(this.variantesDinamicas));
            if (formData.get('id_categoria') === '') formData.delete('id_categoria');
        }

        this.http.post<any>(urlTarget, formData).subscribe({
            next: (res) => this.manejarRespuesta(res, accion, form),
            error: () => { alert("Error de conexión"); this.cargando = false; }
        });
    } 
    // 🌟 RUTA B: CATEGORÍAS, RULETA Y CUPONES (Envían JSON Ligero)
    else {
        const formData = new FormData(form);
        const payload: any = {};
        formData.forEach((value, key) => payload[key] = value);
        payload.id_empleado = this.idEmpleado;

        // Limpieza para evitar errores 500 en Spring Boot
        if (payload.id_categoria === '') delete payload.id_categoria;
        if (payload.id_premio === '') delete payload.id_premio;
        
        // Adaptar nombres para que calcen perfecto con los modelos de Java
        if (payload.nombre_categoria) { payload.nombre = payload.nombre_categoria; delete payload.nombre_categoria; }
        if (payload.tipo_categoria) { payload.tipo = payload.tipo_categoria; delete payload.tipo_categoria; }

        this.http.post<any>(urlTarget, payload).subscribe({
            next: (res) => this.manejarRespuesta(res, accion, form),
            error: () => { alert("Error de conexión"); this.cargando = false; }
        });
    }
  }

  manejarRespuesta(res: any, accion: string, form: HTMLFormElement) {
      if (res.success) { 
          this.mostrarToast(res.mensaje);
          if (accion === 'guardar_categoria') {
              this.catEditando = null;
              form.reset();
          } else {
              this.cerrarModales(); 
          }
          this.cargarDashboard(); 
      } else { 
          alert(res.mensaje); 
      }
      this.cargando = false;
      this.cdr.detectChanges();
  }

  ejecutarAccion(accion: string, extraData: any = {}) {
      if ((accion.includes('eliminar') || accion === 'cancelar') && !confirm("¿Estás seguro de que deseas eliminar este elemento? Esta acción no se puede deshacer.")) return;
      if (accion === 'reportar' && !confirm("ALERTA: ¿Bloquear usuario por 7 días?")) return;
      
      let urlTarget = '';
      let metodo = 'POST';

      if (accion.includes('eliminar_producto')) {
          urlTarget = `http://localhost:8080/api/inventario/productos/eliminar/${extraData.id}`;
          metodo = 'DELETE';
      } else if (accion.includes('eliminar_categoria')) {
          urlTarget = `http://localhost:8080/api/inventario/categorias/eliminar/${extraData.id}`;
          metodo = 'DELETE';
      } else if (accion === 'aprobar' || accion === 'listo' || accion === 'completar') {
          urlTarget = `http://localhost:8080/api/empleado/ordenes/${extraData.id_reserva}/estado`;
          extraData.nuevo_estado = accion;
      } else if (accion === 'registrar_visita') {
          urlTarget = `http://localhost:8080/api/usuarios/${extraData.id_cliente}/visita`;
      } else if (accion === 'toggle_noticia') {
          urlTarget = `http://localhost:8080/api/marketing/noticias/toggle/${extraData.id}/usuario/${this.idEmpleado}`;
      } else if (accion === 'eliminar_premio_ruleta') { // <--- ¡AÑADE ESTO!
          urlTarget = `http://localhost:8080/api/ruleta/eliminar/${extraData.id}`;
          metodo = 'DELETE';
      } else if (accion === 'guardar_probabilidades_ruleta') { // <--- ¡Y ESTO!
          urlTarget = `http://localhost:8080/api/ruleta/probabilidades`;
    }

      const request = metodo === 'DELETE' ? this.http.delete<any>(urlTarget) : this.http.post<any>(urlTarget, extraData);

      request.subscribe({
          next: (res) => { 
              if(res.success) { 
                  this.mostrarToast(res.mensaje); 
                  this.cerrarModales();
                  this.cargarDashboard(); 
              } else { alert(res.mensaje); }
              this.cdr.detectChanges();
          },
          error: () => alert("Error de servidor.")
      });
  }

  ejecutarAccionOrden(id_reserva: number, accion: string, id_usuario_cliente: number = 0) {
    this.ejecutarAccion(accion, { id_reserva: id_reserva, id_usuario: id_usuario_cliente });
  }

  abrirPDF(id_reserva: number) {
    window.open(`http://localhost:8080/api/pedidos/ticket/${id_reserva}`, '_blank');
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

  @HostListener('document:pointermove', ['\$event'])
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

  abrirModalNuevoPremio() {
    this.itemEditando = { titulo: '', descuento_porcentaje: 0, color_seccion: '#e2e8f0', es_nuevo: true };
    this.modalAbierto = 'premio_ruleta';
  }

  autoRepararRuleta() {
      if (this.premios_ruleta.length === 0) return;
      let hayCambios = false;

      const premiosNuevos = this.premios_ruleta.filter(p => parseFloat(p.probabilidad) === 0);
      const premiosValidos = this.premios_ruleta.filter(p => parseFloat(p.probabilidad) > 0);

      if (premiosNuevos.length > 0) {
          hayCambios = true;
          const porcentajeParaNuevos = 5.0 * premiosNuevos.length;
          const porcentajeRestante = 100.0 - porcentajeParaNuevos;

          let sumaActual = 0;
          premiosValidos.forEach(p => sumaActual += parseFloat(p.probabilidad));

          let nuevaSuma = 0;
          let maxIndex = 0;
          let maxVal = -1;

          if (sumaActual > 0) {
              premiosValidos.forEach((p, i) => {
                  const proporcion = parseFloat(p.probabilidad) / sumaActual;
                  p.probabilidad = Number((proporcion * porcentajeRestante).toFixed(1));
                  nuevaSuma += p.probabilidad;

                  if (p.probabilidad > maxVal) { maxVal = p.probabilidad; maxIndex = i; }
              });

              const diferencia = Number((porcentajeRestante - nuevaSuma).toFixed(1));
              premiosValidos[maxIndex].probabilidad = Number((premiosValidos[maxIndex].probabilidad + diferencia).toFixed(1));
          }

          premiosNuevos.forEach(p => p.probabilidad = 5.0);
      } 
      else {
          let sumaTotal = 0;
          this.premios_ruleta.forEach(p => sumaTotal += parseFloat(p.probabilidad));
          
          if (Math.abs(sumaTotal - 100.0) > 0.5) {
              hayCambios = true;
              let nuevaSuma = 0;
              let maxIndex = 0;
              let maxVal = -1;
              
              this.premios_ruleta.forEach((p, i) => {
                  const proporcion = parseFloat(p.probabilidad) / sumaTotal;
                  p.probabilidad = Number((proporcion * 100.0).toFixed(1));
                  nuevaSuma += p.probabilidad;
                  if (p.probabilidad > maxVal) { maxVal = p.probabilidad; maxIndex = i; }
              });

              const diferencia = Number((100.0 - nuevaSuma).toFixed(1));
              if (this.premios_ruleta.length > 0) {
                  this.premios_ruleta[maxIndex].probabilidad = Number((this.premios_ruleta[maxIndex].probabilidad + diferencia).toFixed(1));
              }
          }
      }
  }
}