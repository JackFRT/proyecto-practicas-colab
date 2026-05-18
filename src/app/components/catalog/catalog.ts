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
  archivoComprobante: File | null = null;
  cargandoPago: boolean = false;

  ordenGeneradaId: number = 0;
  totalPlantasCompradas: number = 0;
  premioLealtad: any = null;
  usuarioActual: any = null;
  mensajeFidelidad: string = '';

  ngOnInit() {
    document.documentElement.style.setProperty('--color-catalogo', '#A3B18A');
    const userGuardado = typeof localStorage !== 'undefined' ? localStorage.getItem('usuario_cactus') : null;
    if (userGuardado) this.usuarioActual = JSON.parse(userGuardado);

    this.http.get<any>('http://localhost/cactus-api/obtener_inicio.php').subscribe({
      next: (data) => {
        this.todosCactus = data.cactus || [];
        this.todosSouvenirs = data.souvenirs || [];
        
        this.categorias = data.categorias || [];

        this.aplicarFiltros();
        this.cdr.detectChanges();
      }
    });

    this.cartService.mostrarCarrito$.subscribe(abrir => {
        if (abrir) this.modalTienda = 'carrito';
    });
  }

  getRutaImagen(nombreArchivo: string, carpeta: string = 'cactus'): string {
    if (!nombreArchivo) return ''; 
    return `http://localhost/cactus-api/images/${carpeta}/${nombreArchivo}`;
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
      const nombreCompleto = `${p.nombre_comun} ${p.nombre_cientifico || ''}`.toLowerCase();
      const matchBusqueda = !this.terminoBusqueda || nombreCompleto.includes(this.terminoBusqueda.toLowerCase());

      let matchCategoria = true;
      if (this.categoriaSeleccionada !== 'todos') {
        matchCategoria = p.id_categoria == this.categoriaSeleccionada;
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
  stockVariedadActual: number = 0;
  precioCalculado: number = 0;

  abrirDetalle(producto: any) {
    this.productoSeleccionado = producto;
    
    this.imagenesProducto = producto.imagenes || [];
    if (this.imagenesProducto.length === 0 && producto.imagen_url) {
        this.imagenesProducto.push(producto.imagen_url);
    }
    this.imagenModalActual = this.imagenesProducto.length > 0 ? this.imagenesProducto[0] : '';
    
    this.variantesProducto = producto.variantes || [];
    this.precioCalculado = parseFloat(producto.precio_base || producto.precio) || 0;
    this.cantidadSeleccionada = 1;

    if (producto.tipo === 'recuerdo' && this.variantesProducto.length > 0) {
        this.varianteSeleccionada = null; 
        this.stockVariedadActual = 0; 
    } else {
        this.varianteSeleccionada = 'única';
        this.stockVariedadActual = producto.stock || 10; 
    }

    this.modalTienda = 'detalle';
  }
  
  cambiarImagenModal(img: string) {
    this.imagenModalActual = img;
  }

  onVarianteChange(variante: any) {
    this.varianteSeleccionada = variante;
    if (variante) {
        this.stockVariedadActual = variante.stock;
        
        const base = parseFloat(this.productoSeleccionado.precio_base || this.productoSeleccionado.precio) || 0;
        this.precioCalculado = base + parseFloat(variante.precio_adicional || 0);
        
        if (variante.ruta_imagen) {
            this.imagenModalActual = variante.ruta_imagen;
            if (!this.imagenesProducto.includes(variante.ruta_imagen)) {
                this.imagenesProducto.push(variante.ruta_imagen);
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
        id_cactus: this.productoSeleccionado.id_producto || this.productoSeleccionado.id_cactus,
        imagen_url: this.imagenModalActual,
        precio: this.precioCalculado,
        cantidad: this.cantidadSeleccionada,
        estilo: this.varianteSeleccionada && this.varianteSeleccionada !== 'única' ? this.varianteSeleccionada.nombre_variante : 'Estándar',
        id_variante: this.varianteSeleccionada && this.varianteSeleccionada !== 'única' ? this.varianteSeleccionada.id_variante : null
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
    
    if (this.descuentoAplicado > 0) {
        this.mostrarToast('Ya tienes un cupón aplicado a esta compra.');
        return;
    }

    this.http.post<any>('http://localhost/cactus-api/ordenes_api.php', { 
        accion: 'validar_cupon', 
        codigo: this.codigoCupon, 
        id_usuario: this.usuarioActual.id_usuario 
    }).subscribe(res => {
      if (res.success) {
        this.descuentoAplicado = res.descuento;
        this.mostrarToast(`¡Éxito! Se aplicó un ${res.descuento}% de descuento.`);
      } else { 
        this.mostrarToast(res.mensaje); 
        this.descuentoAplicado = 0; 
        this.codigoCupon = '';
      }
    });
  }

  onFileSelected(event: any) {
    if (event.target.files.length > 0) this.archivoComprobante = event.target.files[0];
  }

  procesarPago() {
    if (!this.archivoComprobante) { alert("Sube la captura de tu pago para continuar."); return; }
    
    const finalDni = this.documentoCliente || this.usuarioActual?.dni || '';
    const finalTel = this.telefonoCliente || this.usuarioActual?.telefono || '';

    if (this.tipoComprobante === 'Boleta de Venta' && !finalDni) { alert("La Boleta requiere un número de DNI."); return; }
    if (this.tipoComprobante === 'Factura' && !finalDni) { alert("La Factura requiere un número de RUC."); return; }
    if (this.cartService.getTotalPlantas() >= 4 && !finalTel) { alert("Para pedidos grandes necesitamos un número de celular."); return; }

    this.cargandoPago = true;

    let dniOpcionalFinal = finalDni;
    if (finalTel) {
      if (dniOpcionalFinal) dniOpcionalFinal += " | ";
      dniOpcionalFinal += "Cel/Wsp: " + finalTel;
    }

    const formData = new FormData();
    formData.append('accion', 'crear_reserva');
    formData.append('id_usuario', this.usuarioActual.id_usuario);
    formData.append('tipo_comprobante', this.tipoComprobante === 'Factura' ? 'factura' : 'boleta');
    formData.append('dni_opcional', dniOpcionalFinal);
    
    formData.append('dni_cliente', finalDni); 
    formData.append('telefono_cliente', finalTel); 
    formData.append('actualizar_perfil', 'true');

    formData.append('total_pagado', this.calcularTotalFinal().toString());
    formData.append('codigo_cupon', this.descuentoAplicado > 0 ? this.codigoCupon : '');
    formData.append('comprobante', this.archivoComprobante);
    formData.append('carrito', JSON.stringify(this.cartService.items));

    this.http.post<any>('http://localhost/cactus-api/ordenes_api.php', formData).subscribe({
      next: (res) => {
        if (res.success) {
          this.usuarioActual.dni = this.documentoCliente || this.usuarioActual.dni;
          this.usuarioActual.telefono = this.telefonoCliente || this.usuarioActual.telefono;
          localStorage.setItem('usuario_cactus', JSON.stringify(this.usuarioActual));

          this.ordenGeneradaId = res.id_reserva;
          this.totalPlantasCompradas = this.cartService.getTotalPlantas();
          this.premioLealtad = res.premio_lealtad || null;
          
          this.cartService.limpiarCarrito(); 
          this.modalTienda = 'success';
        } else { alert(res.mensaje); }
        this.cargandoPago = false;
      },
      error: () => { alert("Error de red. Asegúrate de que XAMPP esté encendido."); this.cargandoPago = false; }
    });
  }

  cerrarExito() {
    this.modalTienda = null;
    this.descuentoAplicado = 0;
    this.codigoCupon = '';
  }
}