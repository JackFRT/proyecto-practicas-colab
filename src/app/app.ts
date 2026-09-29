import { Component, HostListener, ElementRef, inject, ChangeDetectorRef, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Ruleta } from './components/ruleta/ruleta';
import { CartService } from './services/cart';
import { Moka } from './services/moka';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule, Ruleta],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent implements OnInit {
  elementRef = inject(ElementRef);
  router = inject(Router);
  cartService = inject(CartService);
  mokaService = inject(Moka);
  cdr = inject(ChangeDetectorRef);

  mostrarRuleta: boolean = false; 
  heroScrolled: boolean = false;
  menuPerfilAbierto: boolean = false;

  mokaSilenciada: boolean = false;
  imagenMoka: string = '/assets/images/barista/barista_saludando.png';
  mensajeMoka: string | null = '¡BIENVENIDO/A!';
  colorBurbujaMoka: string = '#ffffff';

  ngOnInit() {
    this.evaluarScroll();
    
    this.mokaService.eventoMoka$.subscribe(evento => {
      if (this.mokaSilenciada) return;
      
      this.mensajeMoka = evento.texto;
      this.imagenMoka = '/assets/images/barista/' + evento.imagen;
      this.colorBurbujaMoka = '#ffffff'; 
      this.cdr.detectChanges();

      if (!evento.mantener) {
        setTimeout(() => {
          if (this.mensajeMoka === evento.texto) {
            this.mensajeMoka = null;
            this.imagenMoka = '/assets/images/barista/barista_saludando.png';
            this.cdr.detectChanges();
          }
        }, 4000);
      }
    });
  }

  @HostListener('window:scroll')
  onWindowScroll() {
    this.evaluarScroll();
  }

  evaluarScroll() {
    if (typeof window !== 'undefined') {
        
        this.heroScrolled = window.scrollY > window.innerHeight * 0.5;
    }
  }

  
  get mostrarHUDCompleto(): boolean {
    if (this.router.url !== '/') return true; 
    return this.heroScrolled; 
  }

  get isLoggedIn(): boolean {
    return typeof localStorage !== 'undefined' && localStorage.getItem('usuario_cactus') !== null;
  }

  get userRole(): string {
    if (typeof localStorage === 'undefined') return 'cliente';
    const user = localStorage.getItem('usuario_cactus');
    return user ? JSON.parse(user).rol : 'cliente';
  }

  get userName(): string {
    if (typeof localStorage === 'undefined') return '';
    const user = localStorage.getItem('usuario_cactus');
    return user ? JSON.parse(user).nombre : '';
  }

  public mostrarInterfazFlotante(): boolean {
    return this.router.url === '/';
  }

  public mostrarMokaGlobal(): boolean {
    return this.router.url === '/' || this.router.url === '/login';
  }

  lanzarRuleta(event?: Event) {
    if (event) event.preventDefault();
    this.mostrarRuleta = true;
    this.menuPerfilAbierto = false; 
    this.cdr.detectChanges();
  }

  interactuarMoka() {
    if (this.mokaSilenciada) return;
    
    let respuesta;
    if (this.router.url === '/login') {
        respuesta = this.mokaService.interactuarAuth();
    } else {
        respuesta = this.mokaService.interactuar();
        if (this.mokaService.passwordVisible) {
            respuesta.imagen = 'barista_cara_cubierta.png';
            respuesta.texto = "¡Sigo sin mirar! Promesa de barista.";
        }
    }
    
    this.mensajeMoka = respuesta.texto;
    this.imagenMoka = '/assets/images/barista/' + respuesta.imagen;
    this.cdr.detectChanges(); 

    const tiempoEspera = respuesta.castigo ? 6000 : 4000;

    setTimeout(() => {
        this.mensajeMoka = null;
        if (!this.mokaSilenciada && !this.mokaService.passwordVisible) {
            this.imagenMoka = '/assets/images/barista/barista_saludando.png';
        }
        this.cdr.detectChanges(); 
    }, tiempoEspera);
  }

  toggleVozMoka(event: any) {
    this.mokaSilenciada = !event.target.checked;
    
    if (this.mokaSilenciada) {
      this.imagenMoka = '/assets/images/barista/barista_sad.png';
      this.mensajeMoka = 'ASISTENCIA SILENCIADA';
    } else {
      this.imagenMoka = '/assets/images/barista/barista_saludando.png';
      this.mensajeMoka = 'AUDIO ACTIVADO';
    }
    this.cdr.detectChanges();

    setTimeout(() => {
        this.mensajeMoka = null;
        this.cdr.detectChanges();
    }, 2000);
  }

  toggleProfileMenu(event: Event) {
    event.stopPropagation();
    this.menuPerfilAbierto = !this.menuPerfilAbierto;
    this.cdr.detectChanges();
  }

  abrirCarritoGlobal(event: Event) {
    event.preventDefault(); 
    this.cartService.abrirModal(); 
    this.menuPerfilAbierto = false; 
    this.cdr.detectChanges();
  }

  cerrarSesion(event: Event) {
    event.preventDefault(); 
    localStorage.removeItem('usuario_cactus'); 
    this.menuPerfilAbierto = false; 
    this.router.navigate(['/']); 
    this.cdr.detectChanges();
  }

  @HostListener('document:click', ['$event'])
  cerrarMenuAlHacerClicAfuera(event: Event) {
    const clickDentroDelMenu = this.elementRef.nativeElement.querySelector('#ui-profile')?.contains(event.target);
    if (!clickDentroDelMenu && this.menuPerfilAbierto) {
      this.menuPerfilAbierto = false;
      this.cdr.detectChanges();
    }
  }
}