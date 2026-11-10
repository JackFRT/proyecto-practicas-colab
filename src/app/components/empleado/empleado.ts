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
  menuLateralAbierto: boolean = true;
  
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

    this.nombreEmpleado = (user.nombre || 'Empleado').toUpperCase();
    this.idEmpleado = user.id_usuario || user.idUsuario || user.id || 0;
    this.rolEmpleado = user.rol;
    
    this.prepararRuleta(); 
    this.cargarDashboard();
    this.cargarCupones();
  }

  cambiarTab(tab: string) {
    this.tabActivo = tab;
    if (tab === 'inventario') this.cambiarVistaInventario(this.vistaInventario);
    if (tab === 'marketing') this.cargarCupones();
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

  getRutaImagen(rutaBD: any, tipo: string = ''): string {
    if (!rutaBD) return '/assets/images/mascota_cactus/mascota.jpg'; 
    
    let fileName = typeof rutaBD === 'string' ? rutaBD : String(rutaBD);
    if (fileName.startsWith('http') || fileName.startsWith('assets/')) return fileName;

    // Si la ruta ya trae la estructura de carpetas, la respetamos directo
    if (fileName.includes('images/')) {
        return `http://localhost:8080/api/archivos/${fileName}`;
    }

    fileName = fileName.split('\\').pop()?.split('/').pop() || fileName;

    // Si no pasan el tipo, intentamos deducirlo o usamos 'cactus' por defecto
    let carpetaTipo = tipo ? tipo : 'cactus';
    if (carpetaTipo === 'noticias') carpetaTipo = 'news';
    return `http://localhost:8080/api/archivos/images/${carpetaTipo}/${fileName}`;
  }

  // 1. Obtener la ruta de la portada real
  getFotoPortada(item: any): string {
    if (!item) return '';
    
    // Si viene una propiedad directa
    if (item.foto_principal) return item.foto_principal;

    if (item.imagenes && item.imagenes.length > 0) {
      // Buscar la que tenga esPrincipal o es_principal en true
      const principal = item.imagenes.find((img: any) => img.esPrincipal === true || img.es_principal === true);
      if (principal) {
        return principal.ruta_imagen || principal.rutaImagen || '';
      }
      // Si ninguna está marcada, tomamos la primera
      return item.imagenes[0].ruta_imagen || item.imagenes[0].rutaImagen || '';
    }
    return '';
  }

  // 2. Obtener únicamente las fotos adicionales (excluyendo la portada)
  getFotosAdicionales(item: any): any[] {
    if (!item || !item.imagenes || item.imagenes.length === 0) return [];
    
    // Filtramos las que NO son principales
    return item.imagenes.filter((img: any) => {
      const esP = img.esPrincipal === true || img.es_principal === true;
      return !esP;
    });
  }

  aplicarFiltros() {
    this.inventarioFiltrado = this.inventario.filter(item => {
        // 1. Validamos el tipo (Spring Boot envía 'tipo_producto')
        const tipoItem = item.tipo_producto || item.tipo;
        const matchTipo = tipoItem === this.vistaInventario;
        
        // 2. Validamos la búsqueda
        const nombreComun = item.nombre_comun || item.nombre || '';
        const nombreCientifico = item.nombre_cientifico || item.subtitulo || '';
        const nombreCompleto = `${nombreComun} ${nombreCientifico}`.toLowerCase();
        const matchBusqueda = nombreCompleto.includes(this.terminoBusqueda.toLowerCase());
        
        // 3. Validamos la categoría (Spring Boot la envía como objeto anidado: categoria.nombre)
        const nombreCat = (item.categoria && item.categoria.nombre) ? item.categoria.nombre : (item.nombre_categoria || 'todas');
        const matchCategoria = this.categoriaFiltro === 'todas' || nombreCat === this.categoriaFiltro;
        
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
      
      const ordenPayload = this.noticias.map((n, idx) => ({
        id_noticia: n.id_noticia || n.idNoticia,
        prioridad: idx + 1
      }));
      this.http.post<any>('http://localhost:8080/api/marketing/noticias/reordenar', ordenPayload).subscribe({
        next: (res) => { if (res.success) this.mostrarToast("Prioridad actualizada"); }
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
    
    // 1. Cargamos el dashboard principal (Órdenes, Cupones, Noticias, Ruleta)
    this.http.get<any>(`http://localhost:8080/api/empleado/dashboard/${this.idEmpleado}`).subscribe({
      next: (res) => {
        if (res && res.success) {
          this.reservas_activas = res.ordenesActivas || [];
          this.historial_atendidas = res.historial || [];
          this.stats_empleado = { total_atendidas: res.totalAtendidas || 0 };
          this.num_notificaciones = this.reservas_activas.length;

          // Asignamos cupones y noticias directamente del backend o respaldamos con listados
          this.cupones = res.cupones || [];
          this.noticias = res.noticias || [];
          this.premios_ruleta = res.ruleta || res.premios_ruleta || [];
          
          if (this.cupones.length === 0) {
              this.http.get<any[]>('http://localhost:8080/api/marketing/cupones/listar').subscribe(c => {
                  this.cupones = c || [];
                  this.cdr.detectChanges();
              });
          }
          if (this.noticias.length === 0) {
              this.http.get<any[]>('http://localhost:8080/api/marketing/noticias/listar').subscribe(n => {
                  this.noticias = n || [];
                  this.cdr.detectChanges();
              });
          }

          this.autoRepararRuleta();
          this.prepararRuleta();
        }
        
        // 2. Cargamos las categorías de forma independiente
        this.http.get<any>('http://localhost:8080/api/inventario/categorias').subscribe({
            next: (categoriasBD) => {
                this.categorias = categoriasBD || [];
                
                // 3. Cargamos los productos del inventario de forma independiente
                this.http.get<any>('http://localhost:8080/api/inventario/productos').subscribe({
                    next: (productosBD) => {
                        this.inventario = productosBD || [];
                        this.aplicarFiltros();
                        this.cargando = false;
                        this.cdr.detectChanges();
                    },
                    error: (errProd) => {
                        console.error("Error cargando productos:", errProd);
                        this.inventario = [];
                        this.aplicarFiltros();
                        this.cargando = false;
                        this.cdr.detectChanges();
                    }
                });
            },
            error: (errCat) => {
                console.error("Error cargando categorías:", errCat);
                this.categorias = [];
                this.cargando = false;
                this.cdr.detectChanges();
            }
        });
      },
      error: (err) => { 
        console.error("Error cargando dashboard principal:", err);
        // Aun si falla el dashboard general, intentamos cargar el inventario para no bloquear la pantalla
        this.http.get<any>('http://localhost:8080/api/inventario/productos').subscribe({
            next: (productosBD) => {
                this.inventario = productosBD || [];
                this.aplicarFiltros();
                this.cargando = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.cargando = false;
                this.cdr.detectChanges();
            }
        });
      }
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
    else if (accion === 'guardar_cupon') urlTarget = 'http://localhost:8080/api/marketing/cupones/guardar';
    else if (accion === 'guardar_premio_ruleta') urlTarget = 'http://localhost:8080/api/ruleta/guardar';

    if (urlTarget === '') {
        alert("Acción no reconocida: " + accion);
        this.cargando = false;
        return;
    }

    // 🌟 RUTA A: PRODUCTOS Y NOTICIAS (Envían Archivos/Fotos intactos)
    if (accion === 'guardar_producto' || accion === 'guardar_noticia') {
        const formData = new FormData(form);
        const cleanFormData = new FormData(); // Creamos uno limpio desde cero

        // Pasamos el ID del empleado
        cleanFormData.append('id_empleado', this.idEmpleado.toString());

        if (accion === 'guardar_producto') {
            // 1. Manejo del ID del Producto (solo si estamos editando)
            if (this.itemEditando && (this.itemEditando.id_producto || this.itemEditando.id_cactus)) {
                cleanFormData.append('id_producto', (this.itemEditando.id_producto || this.itemEditando.id_cactus).toString());
            }

            // 2. Textos Básicos
            const nombreComun = formData.get('nombre_comun');
            if (nombreComun) cleanFormData.append('nombre_comun', nombreComun);

            const nombreCientifico = formData.get('nombre_cientifico');
            if (nombreCientifico) cleanFormData.append('nombre_cientifico', nombreCientifico);

            const precio = formData.get('precio');
            if (precio) cleanFormData.append('precio', precio);

            const cuidados = formData.get('cuidados');
            if (cuidados) cleanFormData.append('cuidados', cuidados);

            const detallesTecnicos = formData.get('detalles_tecnicos');
            if (detallesTecnicos) cleanFormData.append('detalles_tecnicos', detallesTecnicos);

            const stock = formData.get('stock');
            if (stock) cleanFormData.append('stock', stock);

            const tipoProducto = formData.get('tipo_producto');
            if (tipoProducto) cleanFormData.append('tipo_producto', tipoProducto);

            const activo = formData.get('activo');
            if (activo !== null) cleanFormData.append('activo', activo);

            const contieneAlcohol = formData.get('contiene_alcohol');
            cleanFormData.append('contiene_alcohol', contieneAlcohol ? 'true' : 'false');

            // 3. Categoría (aseguramos que no vaya vacía para evitar error 500)
            const idCat = formData.get('id_categoria');
            if (idCat && idCat !== '') {
                cleanFormData.append('id_categoria', idCat);
            }

            // 4. Variantes JSON (Recuerdos)
            if (this.tieneEstilos) {
                cleanFormData.append('variantes_json', JSON.stringify(this.variantesDinamicas));
            }

            // 5. Foto Principal
            const fotoPrincipal = formData.get('foto_principal');
            if (fotoPrincipal && (fotoPrincipal as File).size > 0) {
                cleanFormData.append('foto_principal', fotoPrincipal);
            }

            // 6. Fotos Adicionales (Múltiples)
            const fotosAdicionales = formData.getAll('fotos_adicionales[]');
            fotosAdicionales.forEach(foto => {
                if ((foto as File).size > 0) {
                    cleanFormData.append('fotos_adicionales[]', foto);
                }
            });

            // 7. Fotos de Variantes
            const fotosVariantes = formData.getAll('fotos_variantes[]');
            fotosVariantes.forEach(fotoVar => {
                cleanFormData.append('fotos_variantes[]', fotoVar);
            });
            
            console.log("🚀 Enviando Producto a Java (FormData)");
        }

        // Si es noticia, usamos el original
        const dataAEnviar = accion === 'guardar_producto' ? cleanFormData : formData;

        this.http.post<any>(urlTarget, dataAEnviar).subscribe({
            next: (res) => this.manejarRespuesta(res, accion, form),
            error: (err) => { 
                console.error("Error del backend al guardar archivo:", err);
                if (err.error && err.error.mensaje) {
                    alert(err.error.mensaje);
                } else {
                    alert("Error de conexión. Revisa la consola F12."); 
                }
                this.cargando = false;
                this.cdr.detectChanges();
            }
        });
    }
    // 🌟 RUTA B: CATEGORÍAS, RULETA Y CUPONES (Envían JSON Ligero)
    else {
        const formData = new FormData(form);
        let payload: any = {};

        // CONSTRUCCIÓN MANUAL ESTRICTA PARA CATEGORÍAS
        if (accion === 'guardar_categoria') {
            payload = {
                nombre: formData.get('nombre'),
                tipo: formData.get('tipo')
            };
            
            // Solo añadimos el ID si estamos editando (y lo convertimos a número)
            const idCat = formData.get('id_categoria');
            if (idCat && idCat !== '') {
                payload.id_categoria = Number(idCat);
            }
        } 
        // CONSTRUCCIÓN PARA EL RESTO (Ruleta, Cupones, etc.)
        else {
            formData.forEach((value, key) => payload[key] = value);
            payload.id_empleado = this.idEmpleado;
            if (!payload.id_premio || payload.id_premio === '' || payload.id_premio === 'undefined' || payload.id_premio === 'null') {
                delete payload.id_premio;
            }
        }
        
        console.log("🚀 Enviando Payload a Java:", payload);

        this.http.post<any>(urlTarget, payload).subscribe({
            next: (res) => this.manejarRespuesta(res, accion, form),
            error: (err) => { 
                console.error("Error del backend:", err);
                const msg = err.error?.mensaje || "Error de conexión con el servidor.";
                alert(msg);
                this.cargando = false;
                this.cdr.detectChanges();
            }
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
          
          // Refrescamos los datos específicos al instante
          if (accion === 'guardar_cupon') {
              this.http.get<any[]>('http://localhost:8080/api/marketing/cupones/listar').subscribe({
                  next: (lista) => { this.cupones = lista || []; this.cdr.detectChanges(); }
              });
          } else if (accion === 'guardar_noticia') {
              this.http.get<any[]>('http://localhost:8080/api/marketing/noticias/listar').subscribe({
                  next: (lista) => { this.noticias = lista || []; this.cdr.detectChanges(); }
              });
          }
          
          this.cargarDashboard(); 
      } else { 
          alert(res.mensaje); 
      }
      this.cargando = false;
      this.cdr.detectChanges();
  }

  cargarCupones() {
    this.http.get<any[]>('http://localhost:8080/api/marketing/cupones/listar').subscribe({
      next: (res) => {
        this.cupones = res || [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error("Error al cargar cupones:", err);
      }
    });
  }

 ejecutarAccion(accion: string, extraData: any = {}) {
      if ((accion.includes('eliminar') || accion === 'cancelar') && !confirm("¿Estás seguro de que deseas eliminar este elemento? Esta acción no se puede deshacer.")) return;
      if (accion === 'reportar' && !confirm("ALERTA: ¿Bloquear usuario por 7 días?")) return;
      
      let urlTarget = '';
      let metodo = 'POST';

      if (accion.includes('eliminar_producto')) {
          const idProd = extraData.id || extraData.id_producto;
          urlTarget = `http://localhost:8080/api/inventario/productos/eliminar/${idProd}`;
          metodo = 'DELETE';
      } else if (accion.includes('eliminar_categoria')) {
          const idCat = extraData.id || extraData.id_categoria || extraData.idCategoria;
          urlTarget = `http://localhost:8080/api/inventario/categorias/eliminar/${idCat}`;
          metodo = 'DELETE';
      } else if (accion === 'aprobar' || accion === 'listo' || accion === 'completar' || accion === 'cancelar' || accion === 'reportar') {
          urlTarget = `http://localhost:8080/api/empleado/ordenes/${extraData.id_reserva}/estado`;
          extraData.accion = accion;
          extraData.nuevo_estado = accion;
          extraData.id_empleado = this.idEmpleado;
      } else if (accion === 'registrar_visita') {
          urlTarget = `http://localhost:8080/api/usuarios/${extraData.id_cliente}/visita`;
      } else if (accion === 'toggle_noticia') {
          urlTarget = `http://localhost:8080/api/marketing/noticias/toggle/${extraData.id}/usuario/${this.idEmpleado}`;
      } else if (accion === 'eliminar_premio_ruleta') {
          const idPremio = extraData.id || extraData.id_premio;
          urlTarget = `http://localhost:8080/api/ruleta/eliminar/${idPremio}`;
          metodo = 'DELETE';
      } else if (accion === 'guardar_probabilidades_ruleta') {
          urlTarget = `http://localhost:8080/api/ruleta/probabilidades`;
      } else if (accion === 'eliminar_imagen') {
          urlTarget = `http://localhost:8080/api/inventario/productos/${extraData.id_producto}/imagen/${extraData.id_imagen}`;
          metodo = 'DELETE';
      } else if (accion === 'eliminar_cupon') {
        const idCup = extraData.id || extraData.id_cupon;
        urlTarget = `http://localhost:8080/api/marketing/cupones/eliminar/${idCup}`;
        metodo = 'DELETE';
    } else if (accion === 'eliminar_noticia') {
        const idNot = extraData.id || extraData.id_noticia;
        urlTarget = `http://localhost:8080/api/marketing/noticias/eliminar/${idNot}/usuario/${this.idEmpleado}`;
        metodo = 'DELETE';
    }

      const request = metodo === 'DELETE' ? this.http.delete<any>(urlTarget) : this.http.post<any>(urlTarget, extraData);

      request.subscribe({
          next: (res) => { 
              if(res.success) { 
                  this.mostrarToast(res.mensaje); 

                  // ---> LA MAGIA ESTÁ AQUÍ <---
                  if (accion === 'eliminar_imagen') {
                      // Borramos la imagen visualmente del modal SIN cerrarlo
                      if (this.itemEditando && this.itemEditando.imagenes) {
                          this.itemEditando.imagenes = this.itemEditando.imagenes.filter((i:any) => 
                              (i.id_imagen || i.idImagen || i.id) !== extraData.id_imagen
                          );
                      }
                  } else {
                      // Solo cerramos el modal si NO estamos borrando una imagen
                      this.cerrarModales();
                  }

                  this.cargarDashboard(); 
              } else { 
                  alert(res.mensaje); 
              }
              this.cdr.detectChanges();
          },
          error: (err) => {
              if (err.error && err.error.mensaje) {
                  alert(err.error.mensaje);
              } else {
                  console.error("Error del servidor:", err);
                  alert("Error de conexión con el servidor.");
              }
          }
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
    const listaPremios = this.premios_ruleta.map(p => ({
      id_premio: p.id_premio || p.idPremio,
      probabilidad: Math.round(p.probabilidad * 10) / 10
    }));
    this.ejecutarAccion('guardar_probabilidades_ruleta', { premios: listaPremios });
  }

  abrirModalNuevoPremio() {
    const coloresSugeridos = ['#4f772d', '#e07a5f', '#d1b88e', '#2a9d8f', '#e76f51', '#8c583a', '#3a5a40'];
    const colorElegido = coloresSugeridos[this.premios_ruleta.length % coloresSugeridos.length];
    this.itemEditando = { titulo: '', descuento_porcentaje: 10, color_seccion: colorElegido, es_nuevo: true };
    this.modalAbierto = 'premio_ruleta';
  }

  autoRepararRuleta() {
      if (this.premios_ruleta.length === 0) return;
      let hayCambios = false;

      const premiosNuevos = this.premios_ruleta.filter(p => !(parseFloat(p.probabilidad) > 0));
      const premiosValidos = this.premios_ruleta.filter(p => parseFloat(p.probabilidad) > 0);

      if (premiosNuevos.length > 0) {
          hayCambios = true;
          if (premiosValidos.length === 0) {
              const cuota = Number((100.0 / premiosNuevos.length).toFixed(1));
              let suma = 0;
              premiosNuevos.forEach((p, idx) => {
                  if (idx === premiosNuevos.length - 1) {
                      p.probabilidad = Number((100.0 - suma).toFixed(1));
                  } else {
                      p.probabilidad = cuota;
                      suma += cuota;
                  }
              });
          } else {
              const cuotaUnitaria = Math.min(15.0, Number((100.0 / this.premios_ruleta.length).toFixed(1)));
              const porcentajeParaNuevos = Number((cuotaUnitaria * premiosNuevos.length).toFixed(1));
              const porcentajeRestante = Number((100.0 - porcentajeParaNuevos).toFixed(1));

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

              premiosNuevos.forEach(p => p.probabilidad = cuotaUnitaria);
          }
      } 
      else {
          let sumaTotal = 0;
          this.premios_ruleta.forEach(p => sumaTotal += parseFloat(p.probabilidad));
          
          if (sumaTotal > 0 && Math.abs(sumaTotal - 100.0) > 0.5) {
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

      if (hayCambios) {
          const listaPremios = this.premios_ruleta.map(p => ({
              id_premio: p.id_premio || p.idPremio,
              probabilidad: Math.round((parseFloat(p.probabilidad) || 0) * 10) / 10
          }));
          this.http.post<any>('http://localhost:8080/api/ruleta/probabilidades', { premios: listaPremios }).subscribe();
      }
  }
}