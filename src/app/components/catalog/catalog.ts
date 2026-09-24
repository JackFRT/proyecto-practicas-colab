import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { CartService } from '../../services/cart';

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

  todosCactus: any[] = [];
  todosSouvenirs: any[] = [];
  categorias: any[] = []; 
  cuponesDisponibles: any[] = []; // Nueva lista local de cupones

  tipoActual: 'cactus' | 'recuerdo' = 'cactus'; 
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

  tipoComprobante: string = 'Ninguno';
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
  

  get userRole(): string {
    if (typeof localStorage === 'undefined') return 'cliente';
    const user = localStorage.getItem('usuario_cactus');
    return user ? JSON.parse(user).rol : 'cliente';
  }

  ngOnInit() {
    document.documentElement.style.setProperty('--color-catalogo', '#A3B18A');
    const userGuardado = typeof localStorage !== 'undefined' ? localStorage.getItem('usuario_cactus') : null;
    
    if (userGuardado) {
        this.usuarioActual = JSON.parse(userGuardado);
        const idValidado = this.usuarioActual.idUsuario || this.usuarioActual.id_usuario;
        
        // Llamada al nuevo PerfilController en Spring Boot
        this.http.get<any>(`http://localhost:8080/api/perfil/cargar/${idValidado}`).subscribe(res => {
            if (res.success) {
                this.usuarioActual = res.usuario;
                this.cuponesDisponibles = res.cupones || [];
                localStorage.setItem('usuario_cactus', JSON.stringify(this.usuarioActual));
                
                // Compatibilidad con los nombres de variables de Java (visitasPresenciales)
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
        });
    }

    // Llamada al nuevo HomeController en Spring Boot
    this.http.get<any>('http://localhost:8080/api/publico/inicio').subscribe({
      next: (data) => {
        this.todosCactus = data.cactus || [];
        this.todosSouvenirs = data.souvenirs || [];
        this.categorias = data.categorias || [];

        this.aplicarFiltros();
        this.cdr.detectChanges();
      }
    });

    this.cartService.mostrarCarrito$.subscribe(abrir => {
        if (abrir) { this.modalTienda = 'carrito'; this.cdr.detectChanges(); }
    });
  }

  getRutaImagen(nombreArchivo: string, carpeta: string = 'cactus'): string {
    if (!nombreArchivo) return ''; 
    return `http://localhost:8080/images/${carpeta}/${nombreArchivo}`;
  }

  mostrarToast(msg: string) {
    this.toastMsg = msg;
    setTimeout(() => this.toastMsg = '', 3500);
  }

  terminoBusqueda: string = '';

  cambiarTipo(nuevoTipo: 'cactus' | 'recuerdo') {
    this.tipoActual = nuevoTipo;
    this.categoriaSeleccionada = 'todos'; 
    this.terminoBusqueda = '';
    this.paginaActual = 1; 
    document.documentElement.style.setProperty('--color-catalogo', nuevoTipo === 'cactus' ? '#A3B18A' : '#9eb6d6');
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
    let baseDatos = this.tipoActual === 'cactus' ? this.todosCactus : this.todosSouvenirs;
    
    this.productosFiltrados = baseDatos.filter(p => {
      // Soporte para variables Java (nombreComun) y PHP (nombre_comun)
      const nombreC = p.nombreComun || p.nombre_comun || '';
      const nombreCi = p.nombreCientifico || p.nombre_cientifico || '';
      const nombreCompleto = `${nombreC} ${nombreCi}`.toLowerCase();
      const matchBusqueda = !this.terminoBusqueda || nombreCompleto.includes(this.terminoBusqueda.toLowerCase());

      let matchCategoria = true;
      if (this.categoriaSeleccionada !== 'todos') {
        const idCat = p.categoria ? p.categoria.idCategoria : p.id_categoria;
        matchCategoria = idCat == this.categoriaSeleccionada;
      }

      return matchBusqueda && matchCategoria;
    });

    this.totalPaginas = Math.ceil(this.productosFiltrados.length / this.itemsPorPagina) || 1;
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

  abrirDetalle(producto: any) {
    this.productoSeleccionado = producto;
    
    this.imagenesProducto = producto.imagenes || [];
    if (this.imagenesProducto.length === 0 && (producto.imagenUrl || producto.imagen_url)) {
        this.imagenesProducto.push(producto.imagenUrl || producto.imagen_url);
    }
    this.imagenModalActual = this.imagenesProducto.length > 0 ? this.imagenesProducto[0] : '';
    
    this.variantesProducto = producto.variantes || [];
    this.precioOriginal = parseFloat(producto.precioBase || producto.precio_base || producto.precio) || 0;
    this.precioCalculado = this.precioOriginal * (1 - (this.descuentoSocio / 100));
    this.cantidadSeleccionada = 1;

    if (producto.tipo === 'recuerdo' && this.variantesProducto.length > 0) {
        if (this.variantesProducto.length === 1 && (this.variantesProducto[0].nombreVariante || this.variantesProducto[0].nombre_variante) === 'Estándar') {
            this.tieneVariantesReales = false;
            this.varianteSeleccionada = this.variantesProducto[0];
            this.stockVariedadActual = this.variantesProducto[0].stock;
        } else {
            this.tieneVariantesReales = true;
            if (this.variantesProducto.length === 1) {
                this.varianteSeleccionada = this.variantesProducto[0];
                this.stockVariedadActual = this.variantesProducto[0].stock;
            } else {
                this.varianteSeleccionada = null; 
                this.stockVariedadActual = 0; 
            }
        }
    } else {
        this.tieneVariantesReales = false;
        this.varianteSeleccionada = 'única';
        this.stockVariedadActual = producto.stock || 10; 
    }

    this.modalTienda = 'detalle';
    this.cdr.detectChanges();
  }
  
  cambiarImagenModal(img: string) {
    this.imagenModalActual = img;
    this.cdr.detectChanges();
  }

  onVarianteChange(variante: any) {
    this.varianteSeleccionada = variante;
    if (variante) {
        this.stockVariedadActual = variante.stock;
        const base = parseFloat(this.productoSeleccionado.precioBase || this.productoSeleccionado.precio_base || this.productoSeleccionado.precio) || 0;
        this.precioOriginal = base + parseFloat(variante.precioAdicional || variante.precio_adicional || 0);
        this.precioCalculado = this.precioOriginal * (1 - (this.descuentoSocio / 100));
        
        const rutaImg = variante.rutaImagen || variante.ruta_imagen;
        if (rutaImg) {
            this.imagenModalActual = rutaImg;
            if (!this.imagenesProducto.includes(rutaImg)) {
                this.imagenesProducto.push(rutaImg);
            }
        } else {
            const indexVariante = this.variantesProducto.indexOf(variante);
            if (indexVariante !== -1 && this.imagenesProducto.length > indexVariante + 1) {
                this.imagenModalActual = this.imagenesProducto[indexVariante + 1];
            }
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
    return {
        ...this.productoSeleccionado,
        id_producto: this.productoSeleccionado.idProducto || this.productoSeleccionado.id_producto || this.productoSeleccionado.id_cactus,
        imagen_url: this.imagenModalActual,
        precio: this.precioCalculado,
        cantidad: this.cantidadSeleccionada,
        estilo: this.varianteSeleccionada && this.varianteSeleccionada !== 'única' ? (this.varianteSeleccionada.nombreVariante || this.varianteSeleccionada.nombre_variante) : 'Estándar',
    };
  }

  

  comprarDirecto(event?: Event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    this.cartService.agregarItem(this.obtenerItemPreparado());
    this.cerrarModalTienda();
    this.irACheckout(); 
  }

  agregarAlCarrito(event?: Event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    this.cartService.agregarItem(this.obtenerItemPreparado());
    this.mostrarToast(`¡Añadido a tu canasta!`);
  }

  cerrarModalTienda() {
    this.modalTienda = null;
    this.productoSeleccionado = null;
    this.cartService.cerrarModal();
    this.cdr.detectChanges();
  }

  eliminarDelCarrito(index: number) { 
      this.cartService.eliminarItem(index); 
  }
  
  calcularTotalFinal(): number {
    const sub = this.cartService.getSubtotal();
    return sub - (sub * (this.descuentoAplicado / 100));
  }

  abrirCarrito() { this.modalTienda = 'carrito'; }

  irACheckout() {
    if (!this.usuarioActual) { alert("Por favor, inicia sesión para comprar."); return; }
    
    this.documentoCliente = this.usuarioActual.dni || '';
    this.telefonoCliente = this.usuarioActual.telefono || '';
    
    this.modalTienda = 'checkout';
  }

  aplicarCupon() {
    if (!this.codigoCupon) return;
    const codigoLimpio = this.codigoCupon.trim().toUpperCase();

    if (this.descuentoAplicado > 0) {
        this.mostrarToast('Ya tienes un cupón aplicado a esta compra.');
        return;
    }

    // Validación local directa con la información del Perfil de Java
    const cuponValido = this.cuponesDisponibles.find(c => c.codigo === codigoLimpio);

    if (cuponValido) {
        this.descuentoAplicado = cuponValido.descuentoPorcentaje || cuponValido.descuento_porcentaje;
        this.codigoCupon = codigoLimpio; 
        this.mostrarToast(`¡Éxito! Se aplicó un ${this.descuentoAplicado}% de descuento.`);
    } else {
        this.mostrarToast('El cupón ingresado no es válido, ya fue usado o pertenece a otra cuenta.');
        this.descuentoAplicado = 0;
    }
    this.cdr.detectChanges();
  }

  procesarPago() {
    const finalDni = this.documentoCliente || this.usuarioActual?.dni || '';
    const finalTel = this.telefonoCliente || this.usuarioActual?.telefono || '';

    if (this.tipoComprobante === 'Boleta de Venta' && !finalDni) { alert("La Boleta requiere un número de DNI."); return; }
    if (this.tipoComprobante === 'Factura' && !finalDni) { alert("La Factura requiere un número de RUC."); return; }
    
    this.cargandoPago = true;

    // JSON estructurado directo para el nuevo PedidoController de Spring Boot
    const payload = {
        id_usuario: this.usuarioActual.idUsuario || this.usuarioActual.id_usuario,
        total_pagado: this.calcularTotalFinal(),
        codigo_cupon: this.descuentoAplicado > 0 ? this.codigoCupon : '',
        tipo_consumo: 'para_llevar',
        notas_cliente: `Comprobante: ${this.tipoComprobante} | Doc: ${finalDni} | Tel: ${finalTel}`,
        carrito: this.cartService.items
    };

    this.http.post<any>('http://localhost:8080/api/pedidos/crear', payload).subscribe({
      next: (res) => {
        if (res.success) {
          this.usuarioActual.dni = finalDni;
          this.usuarioActual.telefono = finalTel;
          localStorage.setItem('usuario_cactus', JSON.stringify(this.usuarioActual));

          this.ordenGeneradaId = res.id_pedido;
          this.codigoTicketGenerado = res.codigo_ticket;
          this.mensajeFidelidad = res.mensaje_fidelidad;
          this.premioLealtad = res.premio_lealtad || null;
          
          this.cartService.limpiarCarrito(); 
          this.modalTienda = 'success';
        } else { alert(res.mensaje); }
        this.cargandoPago = false;
        this.cdr.detectChanges();
      },
      error: () => { 
        alert("Error de conexión con el servidor Java."); 
        this.cargandoPago = false;
        this.cdr.detectChanges();
      }
    });
  }

  cerrarExito() {
    this.modalTienda = null;
    this.descuentoAplicado = 0;
    this.codigoCupon = '';
    this.cdr.detectChanges();
  }

  
}