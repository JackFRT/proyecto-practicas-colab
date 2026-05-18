import { Component } from '@angular/core';

@Component({
  selector: 'app-hero',
  standalone: true,
  templateUrl: './hero.html',
  styleUrl: './hero.css'
})
export class Hero {
  mapaActivo: boolean = false;

  toggleMapa() {
    this.mapaActivo = !this.mapaActivo;
  }
  irAlCatalogo(event: Event) {
    event.preventDefault(); 
    
    const catalogo = document.getElementById('catalogo-section');
    
    if (catalogo) {
      catalogo.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}