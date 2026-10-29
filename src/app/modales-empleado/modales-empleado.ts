import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-modales-empleado',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modales-empleado.html'
})
export class ModalesEmpleadoComponent {
  // Inputs generales
  @Input() modalAbierto: string | null = null;
  @Input() itemEditando: any = null;
  @Input() vistaInventario: string = 'cactus';
  @Input() cargando: boolean = false;
  
  // Inputs para Variantes
  @Input() variantesDinamicas: any[] = [];
  @Input() tieneEstilos: boolean = false;

  // Inputs para Categorías (NUEVO)
  @Input() categorias: any[] = [];
  @Input() verCategorias: boolean = false;
  @Input() catEditando: any = null;

  // Outputs generales
  @Output() cerrar = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<{accion: string, event: Event}>();
  @Output() accionEspecial = new EventEmitter<{accion: string, data: any}>();
  
  // Outputs para Variantes
  @Output() toggleEstilos = new EventEmitter<any>();
  @Output() agregarVariante = new EventEmitter<void>();
  @Output() eliminarVariante = new EventEmitter<number>();
  
  // Outputs para Categorías (NUEVO)
  @Output() gestionarCategorias = new EventEmitter<void>();
  @Output() cerrarCat = new EventEmitter<void>(); // Evento específico para cerrar categorías
  @Output() seleccionarCatParaEditar = new EventEmitter<any>();

  previewFotoPrincipal: string | null = null;

  getCategoriasFiltradas() {
    if (!this.categorias) return [];
    return this.categorias.filter(cat => 
        cat.tipo === this.vistaInventario || 
        cat.tipoCategoria === this.vistaInventario || 
        cat.tipo_categoria === this.vistaInventario
    );
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

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.previewFotoPrincipal = e.target.result; // Guardamos la imagen en base64 para previsualizarla
      };
      reader.readAsDataURL(file);
    }
  }
  
  cerrarModales() { this.cerrar.emit(); }
  cerrarModalCategorias() { this.cerrarCat.emit(); } // Función específica

  submitForm(event: Event, accion: string) { this.guardar.emit({ accion, event }); }
  ejecutarAccion(accion: string, data: any) { this.accionEspecial.emit({ accion, data }); }
  
  getRutaImagen(rutaBD: any, tipo: string = ''): string {
    if (!rutaBD) return '/assets/images/mascota_cactus/mascota.jpg';
    
    let fileName = typeof rutaBD === 'string' ? rutaBD : String(rutaBD);
    if (fileName.startsWith('http') || fileName.startsWith('assets/')) return fileName;

    // Si la ruta ya incluye 'images/', la usamos directo con el backend
    if (fileName.includes('images/')) {
        return `http://localhost:8080/api/archivos/${fileName}`;
    }

    fileName = fileName.split('\\').pop()?.split('/').pop() || fileName;
    const carpetaTipo = tipo ? tipo : 'cactus'; 
    
    return `http://localhost:8080/api/archivos/images/${carpetaTipo}/${fileName}`;
  }
}