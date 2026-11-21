import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CartService } from '../../services/cart';
import { ThemeService } from '../../services/theme';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './catalog.html',
  styleUrl: './catalog.css',
})
export class Catalog implements OnInit {
  http = inject(HttpClient);
  cdr = inject(ChangeDetectorRef);
  cartService = inject(CartService);
  themeService = inject(ThemeService);
  router = inject(Router);

  todosCafe: any[] = [];
  todosCactus: any[] = [];
  todosSouvenirs: any[] = [];
  categorias: any[] = [];
  cuponesDisponibles: any[] = [];

  tipoActual: 'cafe' | 'cactus' | 'recuerdo' = 'cafe';
  categoriaSeleccionada: string = 'todos';
  paginaActual: number = 1;
  itemsPorPagina: number = 4;
  totalPaginas: number = 1;
  productosPaginados: any[] = [];
  productosFiltrados: any[] = [];

  modalTienda: string | null = null;
  productoSeleccionado: any = null;
  estiloSeleccionado: string = 'Estándar';
  cantidadSeleccionada: number = 1;
  toastMsg: string = '';

  // Verificación de mayoría de edad (+18) para bebidas con alcohol
  modalEdadAbierto: boolean = false;
  accionEdadPendiente: 'carrito' | 'comprar' | 'checkout' | null = null;
  edadVerificada: boolean = false;

  tipoComprobante: string = 'Boleta de Venta';
  documentoCliente: string = '';
  telefonoCliente: string = '';
  codigoCupon: string = '';
  descuentoAplicado: number = 0;
  cargandoPago: boolean = false;

  ordenGeneradaId: number = 0;
  codigoTicketGenerado: string = '';
  premioLealtad: any = null;
  usuarioActual: any = null;
  mensajeFidelidad: string = '';
  archivoComprobante: File | null = null;

  terminoBusqueda: string = '';

  imagenModalActual: string = '';
  imagenesProducto: string[] = [];
  variantesProducto: any[] = [];
  varianteSeleccionada: any = null;
  tieneVariantesReales: boolean = false;
  stockVariedadActual: number = 0;
  precioCalculado: number = 0;
  precioOriginal: number = 0;
  descuentoSocio: number = 0;
  nivelSocio: number = 0;

  modalidadCafeteria: 'en_mesa' | 'para_llevar' = 'para_llevar';
  mensajeCafeteria: string = '';
  tiempoLlegada: string = '30 minutos';

  numeroPagoCopiado: boolean = false;
  qrExpandido: boolean = false;

  actividadActualIndex: number = 0;
  actividadesLocal = [
    {
      etiqueta: 'Fomento a la Cultura • Beneficio Especial',
      icono: 'fa-book-open',
      titulo: 'SE PREMIA LA LECTURA EN NUESTRA BIBLIOTECA',
      descripcion: 'Al leer un libro de la biblioteca de nuestro local, recibes un Café Americano totalmente gratis para acompañar tu lectura. Incentivamos el hábito lector en un ambiente tranquilo rodeado de naturaleza.',
      destacado: '☕ Café Americano Gratis • Aplica 1 por persona',
      imagen: '/assets/images/decoracion/artesanias.jpg'
    },
    {
      etiqueta: 'Experiencia Educativa • Museo Vivo',
      icono: 'fa-seedling',
      titulo: 'VISITAS GUIADAS Y CHARLAS EN EL MUSEO DEL CACTUS',
      descripcion: 'Participa en nuestros recorridos guiados por el Museo del Cactus y charlas especializadas realizadas directamente por el fundador, donde conocerás la historia, conservación y secretos de nuestra colección de cactáceas.',
      destacado: '🌵 Charlas y recorrido guiado por el fundador',
      imagen: '/assets/images/decoracion/henryAy.jpg'
    },
    {
      etiqueta: 'Tradición Ayacuchana • Café de Especialidad',
      icono: 'fa-mug-hot',
      titulo: 'EL ARTE DEL TUESTE Y CULTIVO',
      descripcion: 'Descubre el proceso detrás de nuestra selección de granos de especialidad del VRAEM y nuestra colección viva de cactáceas en el corazón de Ayacucho.',
      destacado: '✨ Granos selectos del VRAEM & Cactáceas nativas',
      imagen: '/assets/images/decoracion/cactusWaris.jpg'
    }
  ];

  moverActividad(direccion: number) {
    const total = this.actividadesLocal.length;
    this.actividadActualIndex = (this.actividadActualIndex + direccion + total) % total;
    this.cdr.detectChanges();
  }

  cambiarActividad(index: number) {
    this.actividadActualIndex = index;
    this.cdr.detectChanges();
  }

  copiarNumeroPago(event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const numero = '981851430';
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(numero).catch(() => {});
    }
    this.numeroPagoCopiado = true;
    this.mostrarToast('¡Número 981 851 430 copiado al portapapeles!');
    this.cdr.detectChanges();
    setTimeout(() => {
      this.numeroPagoCopiado = false;
      this.cdr.detectChanges();
    }, 2500);
  }

  abrirQrExpandido(event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.qrExpandido = true;
    this.cdr.detectChanges();
  }

  cerrarQrExpandido(event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.qrExpandido = false;
    this.cdr.detectChanges();
  }

  get userRole(): string {
    if (typeof localStorage === 'undefined') return 'cliente';
    const user = localStorage.getItem('usuario_cactus');
    return user ? JSON.parse(user).rol : 'cliente';
  }

  ngOnInit() {
    document.documentElement.style.setProperty('--color-catalogo', '#A3B18A');
    this.cartService.sincronizarConSesion();
    const userGuardado = typeof localStorage !== 'undefined' ? localStorage.getItem('usuario_cactus') : null;

    if (userGuardado) {
      this.usuarioActual = JSON.parse(userGuardado);
      const idValidado = this.usuarioActual.idUsuario || this.usuarioActual.id_usuario;

      if (idValidado) {
        this.http.get<any>(`http://localhost:8080/api/perfil/cargar/${idValidado}`).subscribe({
          next: (res) => {
            if (res.success) {
              this.usuarioActual = res.usuario;
              this.cuponesDisponibles = res.cupones || [];
              localStorage.setItem('usuario_cactus', JSON.stringify(this.usuarioActual));

              const visitas = parseInt(this.usuarioActual.visitasPresenciales || this.usuarioActual.visitas_presenciales) || 0;
              if (visitas >= 51) { this.nivelSocio = 5; this.descuentoSocio = 15; }
              else if (visitas >= 31) { this.nivelSocio = 4; this.descuentoSocio = 10; }
              else if (visitas >= 16) { this.nivelSocio = 3; this.descuentoSocio = 7; }
              else if (visitas >= 8) { this.nivelSocio = 2; this.descuentoSocio = 5; }
              else if (visitas >= 3) { this.nivelSocio = 1; this.descuentoSocio = 2; }
              else { this.nivelSocio = 0; this.descuentoSocio = 0; }

              if (this.productoSeleccionado) {
                this.precioCalculado = this.precioOriginal * (1 - (this.descuentoSocio / 100));
              }
              this.cdr.detectChanges();
            }
          }
        });
      }
    }

    this.http.get<any>('http://localhost:8080/api/publico/inicio').subscribe({
      next: (data) => {
        this.todosCafe = data.cafeteria || data.cafe || [];
        this.todosCactus = data.cactus || [];
        this.todosSouvenirs = data.souvenirs || data.recuerdos || [];
        this.categorias = data.categorias || [];

        if (this.todosCafe.length > 0) {
          this.tipoActual = 'cafe';
        } else if (this.todosCactus.length > 0) {
          this.tipoActual = 'cactus';
        } else if (this.todosSouvenirs.length > 0) {
          this.tipoActual = 'recuerdo';
        } else {
          this.tipoActual = 'cafe';
        }

        this.aplicarFiltros();
        this.cdr.detectChanges();
      }
    });

    this.cartService.mostrarCarrito$.subscribe(abrir => {
      if (abrir && !this.modalTienda) {
        this.modalTienda = 'carrito';
        this.cdr.detectChanges();
      }
    });
  }

  esProductoConAlcohol(producto: any): boolean {
    if (!producto) return false;
    return producto.contiene_alcohol === true || producto.contieneAlcohol === true;
  }

  getRutaImagen(nombreArchivo: any, carpetaHint?: string): string {
    if (!nombreArchivo) return '/assets/images/museo/logo-cafe.png';
    const str = typeof nombreArchivo === 'string'
      ? nombreArchivo
      : (nombreArchivo.ruta_imagen || nombreArchivo.rutaImagen || '');
    if (!str) return '/assets/images/museo/logo-cafe.png';
    if (str.startsWith('http') || str.startsWith('/assets')) return str;

    const carpeta = carpetaHint || (this.productoSeleccionado?.tipo || this.productoSeleccionado?.tipoProducto || this.tipoActual || 'cactus');
    return `http://localhost:8080/api/archivos/images/${carpeta}/${str}`;
  }

  getRutaImagenProducto(producto: any): string {
    const tipo = producto?.tipo || producto?.tipoProducto || this.tipoActual || 'cactus';
    const img = producto?.imagen_url || producto?.imagenUrl;
    return this.getRutaImagen(img, tipo);
  }

  mostrarToast(msg: string) {
    this.toastMsg = msg;
    setTimeout(() => {
      this.toastMsg = '';
      this.cdr.detectChanges();
    }, 3500);
  }

  cambiarTipo(nuevoTipo: 'cafe' | 'cactus' | 'recuerdo') {
    this.tipoActual = nuevoTipo;
    this.categoriaSeleccionada = 'todos';
    this.terminoBusqueda = '';
    this.paginaActual = 1;
    this.aplicarFiltros();
  }

  cambiarCategoria(event: any) {
    this.categoriaSeleccionada = event.target.value;
    this.paginaActual = 1;
    this.aplicarFiltros();
  }

  onBuscar(event: Event) {
    this.terminoBusqueda = (event.target as HTMLInputElement).value;
    this.paginaActual = 1;
    this.aplicarFiltros();
  }

  aplicarFiltros() {
    let baseDatos: any[] = [];
    if (this.tipoActual === 'cafe') {
      baseDatos = this.todosCafe;
    } else if (this.tipoActual === 'cactus') {
      baseDatos = this.todosCactus;
    } else {
      baseDatos = this.todosSouvenirs;
    }

    this.productosFiltrados = baseDatos.filter(p => {
      const nombreC = p.nombreComun || p.nombre_comun || p.nombre || '';
      const nombreCi = p.nombreCientifico || p.nombre_cientifico || p.subtitulo || '';
      const nombreCompleto = `${nombreC} ${nombreCi}`.toLowerCase();
      const matchBusqueda = !this.terminoBusqueda || nombreCompleto.includes(this.terminoBusqueda.toLowerCase());

      let matchCategoria = true;
      if (this.categoriaSeleccionada !== 'todos') {
        const idCat = p.categoria
          ? (p.categoria.idCategoria || p.categoria.id_categoria)
          : (p.id_categoria || p.idCategoria);
        matchCategoria = String(idCat) === String(this.categoriaSeleccionada);
      }

      return matchBusqueda && matchCategoria;
    });

    this.totalPaginas = Math.ceil(this.productosFiltrados.length / this.itemsPorPagina) || 1;
    if (this.paginaActual > this.totalPaginas) this.paginaActual = 1;
    this.actualizarPaginacion();
  }

  cambiarPagina(direccion: number) {
    const nuevaPagina = this.paginaActual + direccion;
    if (nuevaPagina >= 1 && nuevaPagina <= this.totalPaginas) {
      this.paginaActual = nuevaPagina;
      this.actualizarPaginacion();
    }
  }

  actualizarPaginacion() {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    this.productosPaginados = this.productosFiltrados.slice(inicio, inicio + this.itemsPorPagina);
  }

  abrirDetalle(producto: any) {
    this.productoSeleccionado = producto;

    const rawImgs = producto.imagenes || [];
    this.imagenesProducto = rawImgs
      .map((img: any) => typeof img === 'string' ? img : (img.ruta_imagen || img.rutaImagen))
      .filter((s: string) => !!s);

    if (this.imagenesProducto.length === 0 && (producto.imagenUrl || producto.imagen_url)) {
      this.imagenesProducto.push(producto.imagenUrl || producto.imagen_url);
    }
    this.imagenModalActual = this.imagenesProducto.length > 0 ? this.imagenesProducto[0] : '';

    this.variantesProducto = producto.variantes || [];
    this.precioOriginal = parseFloat(producto.precioBase || producto.precio_base || producto.precio) || 0;
    this.precioCalculado = this.precioOriginal * (1 - (this.descuentoSocio / 100));
    this.cantidadSeleccionada = 1;

    const tipoProd = (producto.tipo || producto.tipoProducto || this.tipoActual || '').toLowerCase();
    if (tipoProd === 'recuerdo' && this.variantesProducto.length > 0) {
      const primeraNombre = this.variantesProducto[0].nombreVariante || this.variantesProducto[0].nombre_variante;
      if (this.variantesProducto.length === 1 && primeraNombre === 'Estándar') {
        this.tieneVariantesReales = false;
        this.varianteSeleccionada = this.variantesProducto[0];
        this.stockVariedadActual = this.variantesProducto[0].stock ?? producto.stock ?? 0;
      } else {
        this.tieneVariantesReales = true;
        if (this.variantesProducto.length === 1) {
          this.varianteSeleccionada = this.variantesProducto[0];
          this.stockVariedadActual = this.variantesProducto[0].stock ?? 0;
        } else {
          const disponible = this.variantesProducto.find((v: any) => (v.stock ?? 0) > 0) || null;
          this.varianteSeleccionada = disponible;
          this.stockVariedadActual = disponible ? disponible.stock : 0;
        }
      }
    } else if (tipoProd === 'cafe' || tipoProd === 'café' || tipoProd === 'cafeteria') {
      this.tieneVariantesReales = false;
      this.varianteSeleccionada = 'única';
      this.stockVariedadActual = producto.activo === false ? 0 : Math.max(producto.stock ?? 50, 50);
    } else {
      this.tieneVariantesReales = false;
      this.varianteSeleccionada = 'única';
      if (this.variantesProducto.length > 0) {
        this.stockVariedadActual = this.variantesProducto[0].stock ?? producto.stock ?? 10;
      } else {
        this.stockVariedadActual = producto.stock ?? 10;
      }
    }

    this.modalTienda = 'detalle';
    this.cartService.abrirModal();
    this.cdr.detectChanges();
  }

  cambiarImagenModal(img: string) {
    this.imagenModalActual = img;
    this.cdr.detectChanges();
  }

  onVarianteChange(variante: any) {
    this.varianteSeleccionada = variante;
    if (variante) {
      this.stockVariedadActual = variante.stock ?? 0;
      const base = parseFloat(this.productoSeleccionado.precioBase || this.productoSeleccionado.precio_base || this.productoSeleccionado.precio) || 0;
      this.precioOriginal = base + parseFloat(variante.precioAdicional || variante.precio_adicional || 0);
      this.precioCalculado = this.precioOriginal * (1 - (this.descuentoSocio / 100));

      const rutaImg = variante.rutaImagen || variante.ruta_imagen;
      if (rutaImg) {
        this.imagenModalActual = rutaImg;
      }

      if (this.cantidadSeleccionada > this.stockVariedadActual) {
        this.cantidadSeleccionada = this.stockVariedadActual > 0 ? 1 : 0;
      }
    }
  }

  cambiarCantidad(delta: number) {
    const nuevaCant = this.cantidadSeleccionada + delta;
    if (nuevaCant >= 1 && nuevaCant <= this.stockVariedadActual) {
      this.cantidadSeleccionada = nuevaCant;
    } else if (nuevaCant > this.stockVariedadActual) {
      this.mostrarToast(`Solo hay ${this.stockVariedadActual} unidades disponibles.`);
    }
  }

  obtenerItemPreparado() {
    const tipoProd = this.productoSeleccionado.tipo || this.productoSeleccionado.tipoProducto || this.tipoActual;
    return {
      ...this.productoSeleccionado,
      id_producto: this.productoSeleccionado.idProducto || this.productoSeleccionado.id_producto || this.productoSeleccionado.id_cactus,
      id_cactus: this.productoSeleccionado.idProducto || this.productoSeleccionado.id_producto || this.productoSeleccionado.id_cactus,
      nombre_comun: this.productoSeleccionado.nombre_comun || this.productoSeleccionado.nombre,
      tipo: tipoProd,
      contiene_alcohol: this.esProductoConAlcohol(this.productoSeleccionado),
      imagen_url: this.imagenModalActual,
      precio: this.precioCalculado,
      cantidad: this.cantidadSeleccionada,
      estilo: this.varianteSeleccionada && this.varianteSeleccionada !== 'única'
        ? (this.varianteSeleccionada.nombreVariante || this.varianteSeleccionada.nombre_variante)
        : 'Estándar',
    };
  }

  comprarDirecto(event?: Event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    if (this.esProductoConAlcohol(this.productoSeleccionado) && !this.edadVerificada) {
      this.accionEdadPendiente = 'comprar';
      this.modalEdadAbierto = true;
      this.cdr.detectChanges();
      return;
    }
    this.ejecutarCompraDirecta();
  }

  private verificarSesionParaCarrito(): boolean {
    const userGuardado = typeof localStorage !== 'undefined' ? localStorage.getItem('usuario_cactus') : null;
    if (!userGuardado) {
      this.mostrarToast('Inicia sesión primero para guardar productos en tu carrito.');
      this.cerrarModalTienda();
      setTimeout(() => this.router.navigate(['/login']), 900);
      return false;
    }
    this.usuarioActual = JSON.parse(userGuardado);
    return true;
  }

  private ejecutarCompraDirecta() {
    if (!this.verificarSesionParaCarrito()) return;
    this.cartService.agregarItem(this.obtenerItemPreparado());
    this.irACheckout();
  }

  agregarAlCarrito(event?: Event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    if (!this.verificarSesionParaCarrito()) return;
    if (this.esProductoConAlcohol(this.productoSeleccionado) && !this.edadVerificada) {
      this.accionEdadPendiente = 'carrito';
      this.modalEdadAbierto = true;
      this.cdr.detectChanges();
      return;
    }
    this.ejecutarAgregarAlCarrito();
  }

  private ejecutarAgregarAlCarrito() {
    if (!this.verificarSesionParaCarrito()) return;
    this.cartService.agregarItem(this.obtenerItemPreparado());
    this.mostrarToast('¡Añadido a tu canasta!');
  }

  confirmarMayoriaEdad(event?: Event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    this.edadVerificada = true;
    const accion = this.accionEdadPendiente;
    this.modalEdadAbierto = false;
    this.accionEdadPendiente = null;

    if (accion === 'carrito') {
      this.ejecutarAgregarAlCarrito();
    } else if (accion === 'comprar') {
      this.ejecutarCompraDirecta();
    } else if (accion === 'checkout') {
      this.irACheckout();
    }
    this.cdr.detectChanges();
  }

  rechazarMayoriaEdad(event?: Event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    this.modalEdadAbierto = false;
    this.accionEdadPendiente = null;
    this.mostrarToast('Venta restringida: No se pueden ordenar bebidas con alcohol si eres menor de edad.');
    this.cdr.detectChanges();
  }

  cerrarModalTienda(event?: Event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    this.modalTienda = null;
    this.modalEdadAbierto = false;
    this.accionEdadPendiente = null;
    this.productoSeleccionado = null;
    this.cartService.cerrarModal();
    this.cdr.detectChanges();
  }

  eliminarDelCarrito(index: number, event?: Event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    this.cartService.eliminarItem(index);
    this.cdr.detectChanges();
  }

  calcularTotalFinal(): number {
    const sub = this.cartService.getSubtotal();
    return sub - (sub * (this.descuentoAplicado / 100));
  }

  abrirCarrito(event?: Event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    this.modalTienda = 'carrito';
    this.cartService.abrirModal();
    this.cdr.detectChanges();
  }

  irACheckout(event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const tieneAlcoholEnCarrito = this.cartService.items.some(i => this.esProductoConAlcohol(i));
    if (tieneAlcoholEnCarrito && !this.edadVerificada) {
      this.accionEdadPendiente = 'checkout';
      this.modalEdadAbierto = true;
      this.cdr.detectChanges();
      return;
    }

    const userGuardado = typeof localStorage !== 'undefined' ? localStorage.getItem('usuario_cactus') : null;
    if (userGuardado) {
      this.usuarioActual = JSON.parse(userGuardado);
    }
    if (!this.usuarioActual) {
      this.mostrarToast('Inicia sesión para completar tu compra.');
      this.cerrarModalTienda();
      setTimeout(() => this.router.navigate(['/login']), 900);
      return;
    }

    this.documentoCliente = this.usuarioActual.dni || '';
    this.telefonoCliente = this.usuarioActual.telefono || '';
    this.modalTienda = 'checkout';
    this.cartService.abrirModal();
    this.cdr.detectChanges();
  }

  usuarioYaTieneDni(): boolean {
    const dni = this.usuarioActual?.dni;
    return !!(dni && String(dni).trim().length > 0);
  }

  usuarioYaTieneTelefono(): boolean {
    const tel = this.usuarioActual?.telefono;
    return !!(tel && String(tel).trim().length > 0);
  }

  tieneProductosCafeteriaEnCarrito(): boolean {
    return this.cartService.items.some(item => {
      const t = String(item?.tipo || item?.tipoProducto || item?.tipo_producto || '').toLowerCase();
      return t === 'cafe' || t === 'café' || t === 'cafeteria';
    });
  }

  aplicarCupon() {
    if (!this.codigoCupon || !this.codigoCupon.trim()) return;
    const codigoLimpio = this.codigoCupon.trim().toUpperCase();

    if (this.descuentoAplicado > 0) {
      this.mostrarToast('Ya tienes un cupón aplicado a esta compra.');
      return;
    }

    const idUsuario = this.usuarioActual?.idUsuario || this.usuarioActual?.id_usuario;

    this.http.post<any>('http://localhost:8080/api/pedidos/validar-cupon', {
      codigo: codigoLimpio,
      id_usuario: idUsuario
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.descuentoAplicado = res.descuento_porcentaje;
          this.codigoCupon = res.codigo;
          this.mostrarToast(res.mensaje || `¡Éxito! Se aplicó un ${this.descuentoAplicado}% de descuento.`);
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        const msg = err.error?.mensaje || 'El cupón ingresado no es válido o ha expirado.';
        this.mostrarToast(msg);
        this.descuentoAplicado = 0;
        this.cdr.detectChanges();
      }
    });
  }

  onFileSelected(event: any) {
    if (event.target.files.length > 0) {
      this.archivoComprobante = event.target.files[0];
    }
  }

  procesarPago(event?: Event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    if (!this.archivoComprobante && this.userRole !== 'admin') {
      this.mostrarToast('Sube la captura de tu pago por Yape o Plin para continuar.');
      return;
    }

    const finalTel = this.telefonoCliente || this.usuarioActual?.telefono || '';
    if (this.cartService.getTotalPlantas() >= 4 && !finalTel && this.userRole !== 'admin') {
      this.mostrarToast('Para pedidos de 4 o más unidades ingresa tu número de celular.');
      return;
    }

    this.cargandoPago = true;

    const formData = new FormData();
    const idValidado = this.usuarioActual.idUsuario || this.usuarioActual.id_usuario;
    const tipoComp = this.tipoComprobante === 'Factura' ? 'factura' : 'boleta';

    const hayCafe = this.tieneProductosCafeteriaEnCarrito();
    const tipoConsumoFinal = hayCafe ? this.modalidadCafeteria : 'para_llevar';
    const msgCafeFinal = hayCafe && this.mensajeCafeteria ? this.mensajeCafeteria.trim() : '';

    formData.append('id_usuario', idValidado.toString());
    formData.append('total_pagado', this.calcularTotalFinal().toFixed(2));
    formData.append('codigo_cupon', this.descuentoAplicado > 0 ? this.codigoCupon : '');
    formData.append('tipo_consumo', tipoConsumoFinal);
    formData.append('tipo_comprobante', tipoComp);
    formData.append('dni_opcional', this.documentoCliente || this.usuarioActual?.dni || '');
    formData.append('telefono_cliente', finalTel);
    formData.append('notas_cliente', finalTel ? `Cel/Wsp: ${finalTel}` : 'Sin notas');
    formData.append('tiempo_llegada', this.tiempoLlegada || '30 minutos');
    formData.append('mensaje_cafeteria', msgCafeFinal);
    formData.append('carrito', JSON.stringify(this.cartService.items));
    if (this.archivoComprobante) {
      formData.append('comprobante', this.archivoComprobante);
    }

    this.http.post<any>('http://localhost:8080/api/pedidos/crear', formData).subscribe({
      next: (res) => {
        if (res.success) {
          if (finalTel) this.usuarioActual.telefono = finalTel;
          if (this.documentoCliente) this.usuarioActual.dni = this.documentoCliente;
          localStorage.setItem('usuario_cactus', JSON.stringify(this.usuarioActual));

          this.ordenGeneradaId = res.id_pedido || res.id_reserva;
          this.codigoTicketGenerado = res.codigo_ticket;
          this.mensajeFidelidad = res.mensaje_fidelidad;
          this.premioLealtad = res.premio_lealtad || null;
          this.archivoComprobante = null;

          this.cartService.limpiarCarrito();
          this.modalTienda = 'success';
        } else {
          this.mostrarToast(res.mensaje || 'Error al registrar el pedido.');
        }
        this.cargandoPago = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.mostrarToast(err.error?.mensaje || 'Error de conexión con el servidor.');
        this.cargandoPago = false;
        this.cdr.detectChanges();
      }
    });
  }

  abrirComprobanteEmitido(event?: Event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    if (this.ordenGeneradaId) {
      window.open(`http://localhost:8080/api/pedidos/comprobante/${this.ordenGeneradaId}`, '_blank');
    }
  }

  cerrarExito(event?: Event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    this.descuentoAplicado = 0;
    this.codigoCupon = '';
    this.cerrarModalTienda();
  }
}
