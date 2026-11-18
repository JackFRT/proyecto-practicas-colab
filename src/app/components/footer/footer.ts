import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../services/theme';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './footer.html',
  styleUrl: './footer.css'
})
export class Footer {
  themeService = inject(ThemeService);

  promoDesarrolladoresAbierta: boolean = false;
  modalLegalActivo: 'terminos' | 'privacidad' | null = null;

  togglePromoDesarrolladores() {
    this.promoDesarrolladoresAbierta = !this.promoDesarrolladoresAbierta;
  }

  abrirModalLegal(tipo: 'terminos' | 'privacidad', event: Event) {
    event.preventDefault();
    this.modalLegalActivo = tipo;
  }

  cerrarModalLegal() {
    this.modalLegalActivo = null;
  }
}
