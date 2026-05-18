import { Component, HostListener, ElementRef, inject, ChangeDetectorRef } from '@angular/core';
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
export class AppComponent {
  elementRef = inject(ElementRef);
  router = inject(Router);
  cartService = inject(CartService);
  mokaService = inject(Moka);
  cdr = inject(ChangeDetectorRef);

  mostrarRuleta: boolean = false; 

  lanzarRuleta() {
    this.mostrarRuleta = true;
    this.cdr.detectChanges();
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
    
    const respuesta = this.mokaService.interactuar();
    
    this.mensajeMoka = respuesta.texto;
    this.imagenMoka = '/assets/images/barista/' + respuesta.imagen;
    
    if (respuesta.castigo) {
        this.colorBurbujaMoka = '#ff6b6b'; 
    } else {
        this.colorBurbujaMoka = '#ffb6c1'; 
    }

    this.cdr.detectChanges(); 

    const tiempoEspera = respuesta.castigo ? 6000 : 4000;

    setTimeout(() => {
        if (!this.mokaOcultaPorFooter) {
            this.mensajeMoka = null;
            this.colorBurbujaMoka = '#ffb6c1';
            
            if (!this.mokaSilenciada) {
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