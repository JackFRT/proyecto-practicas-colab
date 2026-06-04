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

  ngOnInit() {
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
            this.colorBurbujaMoka = '#ffb6c1';
            this.cdr.detectChanges();
          }
        }, 4000);
      }
    });
  }

  lanzarRuleta() {
    this.mostrarRuleta = true;
    this.cdr.detectChanges();
  }

  scrollTo(target: string) {
    const element = document.getElementById(target) || document.querySelector('.' + target);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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

  mokaSilenciada: boolean = false;
  imagenMoka: string = '/assets/images/barista/barista_saludando.png';
  mensajeMoka: string | null = '¡Hola! Soy Moka. ¡Haz clic en mí!';
  colorBurbujaMoka: string = '#ffb6c1';

  mokaOcultaPorFooter: boolean = false;
  mokaDespidiendose: boolean = false;
  
  mensajeCactus: string | null = null;
  menuPerfilAbierto: boolean = false;

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
    
    if (respuesta.castigo) {
        this.colorBurbujaMoka = '#ff6b6b'; 
    } else {
        this.colorBurbujaMoka = this.router.url === '/login' ? '#ffffff' : '#ffb6c1'; 
    }

    this.cdr.detectChanges(); 

    const tiempoEspera = respuesta.castigo ? 6000 : 4000;

    setTimeout(() => {
        if (!this.mokaOcultaPorFooter) {
            this.mensajeMoka = null;
            this.colorBurbujaMoka = '#ffb6c1';
            
            if (!this.mokaSilenciada && !this.mokaService.passwordVisible) {
                this.imagenMoka = '/assets/images/barista/barista_saludando.png';
            }
        }
        this.cdr.detectChanges(); 
    }, tiempoEspera);
  }

  toggleVozMoka(event: any) {
    this.mokaSilenciada = !event.target.checked;
    
    if (this.mokaSilenciada) {
      this.imagenMoka = '/assets/images/barista/barista_sad.png';
      this.mensajeMoka = '...';
      this.colorBurbujaMoka = '#f2f2f2';
      this.cdr.detectChanges();

      setTimeout(() => {
          this.mensajeMoka = null;
          this.cdr.detectChanges();
      }, 2000);
    } else {
      this.imagenMoka = '/assets/images/barista/barista_saludando.png';
      this.mensajeMoka = '¡Qué bueno escucharte de nuevo!';
      this.colorBurbujaMoka = '#ffb6c1';
      this.cdr.detectChanges();

      setTimeout(() => {
          this.mensajeMoka = null;
          this.cdr.detectChanges();
      }, 3000);
    }
  }

  interactuarCactus() {
    this.mensajeCactus = '¡No toques mis espinas!';
    this.cdr.detectChanges();

    setTimeout(() => {
        this.mensajeCactus = null;
        this.cdr.detectChanges();
    }, 3000);
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

  @HostListener('window:scroll')
  vigilarFooterParaMoka() {
    const footer = document.getElementById('main-footer');
    
    if (footer) {
      const rect = footer.getBoundingClientRect();
      
      if (rect.top < window.innerHeight - 100) {
        if (!this.mokaOcultaPorFooter && !this.mokaDespidiendose) {
          this.mokaDespidiendose = true;
          this.imagenMoka = '/assets/images/barista/barista_sad3.png'; 
          
          if (!this.mokaSilenciada) {
            this.colorBurbujaMoka = '#ffb6c1';
            this.mensajeMoka = '¡Uy! No debería alejarme tanto de la caja... ¡Vuelvo arriba!';
          }
          this.cdr.detectChanges();

          setTimeout(() => {
            if (this.mokaDespidiendose) {
              this.mokaOcultaPorFooter = true;
              this.mensajeMoka = null;
              this.cdr.detectChanges();
            }
          }, 2500);
        }
      } else {
        if (this.mokaOcultaPorFooter || this.mokaDespidiendose) {
          this.mokaOcultaPorFooter = false;
          this.mokaDespidiendose = false;
          this.mensajeMoka = null;
          
          this.imagenMoka = this.mokaSilenciada ? '/assets/images/barista/barista_sad.png' : '/assets/images/barista/barista_saludando.png';
          this.cdr.detectChanges();
        }
      }
    }
  }
}