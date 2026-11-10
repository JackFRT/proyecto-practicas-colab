import { Component, AfterViewInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { About } from '../about/about';
import { Catalog } from '../catalog/catalog';
import { Footer } from '../footer/footer';
import { CartService } from '../../services/cart';
import { ThemeService } from '../../services/theme';
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
  cartService = inject(CartService);
  themeService = inject(ThemeService);
  router = inject(Router);
  cdr = inject(ChangeDetectorRef);

  mapaActivo: boolean = false;
  menuMovilAbierto: boolean = false;
  barraNavAbierta: boolean = true;
  maskCompletado: boolean = false;

  isLoggedIn: boolean = typeof localStorage !== 'undefined' && localStorage.getItem('usuario_cactus') !== null;

  ngAfterViewInit() {
    gsap.registerPlugin(ScrollTrigger);

    this.isLoggedIn = typeof localStorage !== 'undefined' && localStorage.getItem('usuario_cactus') !== null;

    if (this.isLoggedIn) {
      this.maskCompletado = true;
      gsap.set('#logo-blanco-overlay', { opacity: 0 });
      gsap.set('#hero-ui, #main-nav', {
        opacity: 1,
        pointerEvents: 'auto'
      });
      this.cdr.detectChanges();
    } else {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: '.scroll-trigger-zone',
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1,
          onUpdate: (self) => {
            const completado = self.progress > 0.35;
            if (this.maskCompletado !== completado) {
              this.maskCompletado = completado;
              this.cdr.detectChanges();
            }
          }
        },
      });

      tl.to('#mask-container, #logo-blanco-overlay', {
        '--mask-size': '350vmax',
        duration: 1,
        ease: 'power2.in'
      }, 0)
      .to('#logo-blanco-overlay', {
        opacity: 0,
        duration: 0.1,
        ease: 'power1.out'
      }, 0)
      .to('#hero-ui, #main-nav', {
        opacity: 1,
        pointerEvents: 'auto',
        duration: 0.5
      }, '0.2')
      .to({}, { duration: 2 });
    }
  }

  toggleBarraNav() {
    this.barraNavAbierta = !this.barraNavAbierta;
  }

  toggleMapa() {
    this.mapaActivo = !this.mapaActivo;
    this.menuMovilAbierto = false;
  }

  scrollToSection(event: Event, sectionId: string) {
    event.preventDefault();
    this.menuMovilAbierto = false;
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  irAlCatalogo(event: Event) {
    this.scrollToSection(event, 'catalogo-section');
  }

  abrirCarrito(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.menuMovilAbierto = false;
    this.cartService.abrirModal();
  }

  irAMiClub(event: Event) {
    event.preventDefault();
    this.menuMovilAbierto = false;
    if (typeof localStorage !== 'undefined' && localStorage.getItem('usuario_cactus')) {
      this.router.navigate(['/cliente/perfil']);
    } else {
      this.router.navigate(['/login']);
    }
  }
}
