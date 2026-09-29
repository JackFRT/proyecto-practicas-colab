import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { About } from '../about/about';
import { Catalog } from '../catalog/catalog';
import { Footer } from '../footer/footer';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

@Component({
  selector: 'app-hero',
  standalone: true,
  templateUrl: './hero.html',
  styleUrl: './hero.css',
  imports: [CommonModule, About, Catalog, Footer]
})
export class Hero implements AfterViewInit {
  mapaActivo: boolean = false;

  ngAfterViewInit() {
  gsap.registerPlugin(ScrollTrigger);

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: ".scroll-trigger-zone",
      start: "top top",
      end: "bottom bottom",
      scrub: 1,
    },
  });

  
  tl.to("#mask-container, #logo-blanco-overlay", {
    "--mask-size": "4000vmax",
    duration: 1.5,
    ease: "power2.in"
  }, 0)

  
  .to("#logo-blanco-overlay", {
    opacity: 0,
    duration: 0.1,
    ease: "power1.out"
  }, 0)

  
  .to("#hero-ui", {
    opacity: 1,
    pointerEvents: "auto",
    duration: 0.5
  }, "-=0.3");
}

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