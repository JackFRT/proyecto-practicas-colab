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

  cerrarModales() { this.cerrar.emit(); }
  cerrarModalCategorias() { this.cerrarCat.emit(); } // Función específica

  submitForm(event: Event, accion: string) { this.guardar.emit({ accion, event }); }
  ejecutarAccion(accion: string, data: any) { this.accionEspecial.emit({ accion, data }); }
  
  getRutaImagen(nombreArchivo: string, carpeta: string = 'cactus'): string {
    if (!nombreArchivo) return ''; 
    return `http://localhost:8080/images/${carpeta}/${nombreArchivo}`;
  }
}