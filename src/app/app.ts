import { Component, HostListener, ElementRef, inject, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Ruleta } from './components/ruleta/ruleta';
import { CartService } from './services/cart';
import { Moka } from './services/moka';
import { ThemeService } from './services/theme';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule, Ruleta],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent implements OnInit, OnDestroy {
  elementRef = inject(ElementRef);
  router = inject(Router);
  http = inject(HttpClient);
  cartService = inject(CartService);
  mokaService = inject(Moka);
  themeService = inject(ThemeService);
  cdr = inject(ChangeDetectorRef);

  mostrarRuleta: boolean = false;
  heroScrolled: boolean = false;
  menuPerfilAbierto: boolean = false;
  panelAccesosAbierto: boolean = true;

  notificacionesPedidos: any[] = [];
  alertaPedidoFlotante: any | null = null;

  mokaSilenciada: boolean = false;
  imagenMoka: string = '/assets/images/barista/barista_saludando.png';
  mensajeMoka: string | null = '¡Hola! Soy Moka, haz clic en mí para conversar o conocer datos curiosos.';
  colorBurbujaMoka: string = '#ffffff';

  private mokaTimeout: any = null;
  private mokaPeriodicInterval: any = null;
  private notificacionesInterval: any = null;
  private alertaPedidoTimeout: any = null;

  ngOnInit() {
    this.evaluarScroll();

    // Ocultar saludo inicial luego de 6 segundos
    this.programarOcultarMensaje(6000);

    // Suscripción a eventos de Moka (Login, Catálogo, etc.)
    this.mokaService.eventoMoka$.subscribe(evento => {
      if (this.mokaSilenciada) return;

      this.mensajeMoka = evento.texto;
      this.imagenMoka = '/assets/images/barista/' + evento.imagen;
      this.colorBurbujaMoka = '#ffffff';
      this.cdr.detectChanges();

      if (!evento.mantener) {
        this.programarOcultarMensaje(5000);
      }
    });

    // Habla periódica de Moka cada 25 segundos (solo si la pestaña está activa para ahorrar recursos)
    if (typeof window !== 'undefined') {
      this.mokaPeriodicInterval = setInterval(() => {
        if (typeof document !== 'undefined' && document.hidden) return;
        if (this.mokaSilenciada || !this.mostrarMokaGlobal() || this.mensajeMoka || this.mokaService.passwordVisible) {
          return;
        }
        const charla = this.router.url === '/login'
          ? this.mokaService.interactuarAuth()
          : this.mokaService.obtenerCharlaPeriodica();

        this.mensajeMoka = charla.texto;
        this.imagenMoka = '/assets/images/barista/' + charla.imagen;
        this.cdr.detectChanges();
        this.programarOcultarMensaje(5500);
      }, 25000);

      // Verificación periódica ligera de notificaciones de estado de pedido para el cliente
      this.verificarNotificacionesPedidos();
      this.notificacionesInterval = setInterval(() => {
        if (typeof document !== 'undefined' && document.hidden) return;
        this.verificarNotificacionesPedidos();
      }, 18000);
    }
  }

  ngOnDestroy() {
    if (this.mokaTimeout) clearTimeout(this.mokaTimeout);
    if (this.mokaPeriodicInterval) clearInterval(this.mokaPeriodicInterval);
    if (this.notificacionesInterval) clearInterval(this.notificacionesInterval);
    if (this.alertaPedidoTimeout) clearTimeout(this.alertaPedidoTimeout);
  }

  verificarNotificacionesPedidos() {
    if (typeof localStorage === 'undefined') return;
    const rawUser = localStorage.getItem('usuario_cactus');
    if (!rawUser) {
      this.notificacionesPedidos = [];
      return;
    }

    try {
      const user = JSON.parse(rawUser);
      const idUsuario = user?.idUsuario || user?.id_usuario || user?.id;
      if (!idUsuario) return;

      this.http.get<any>(`http://localhost:8080/api/pedidos/notificaciones/${idUsuario}`).subscribe({
        next: (res) => {
          if (res && res.success && Array.isArray(res.notificaciones)) {
            this.notificacionesPedidos = res.notificaciones;

            const vistosRaw = localStorage.getItem(`notif_pedidos_vistos_${idUsuario}`);
            const vistos: Record<string, string> = vistosRaw ? JSON.parse(vistosRaw) : {};
            let huboCambio = false;

            for (const notif of this.notificacionesPedidos) {
              const key = String(notif.id_reserva || notif.id_pedido);
              const estadoActual = String(notif.estado);
              if (vistos[key] !== estadoActual) {
                vistos[key] = estadoActual;
                huboCambio = true;
                this.mostrarAlertaPedido(notif);
              }
            }

            if (huboCambio) {
              localStorage.setItem(`notif_pedidos_vistos_${idUsuario}`, JSON.stringify(vistos));
            }
            this.cdr.detectChanges();
          }
        },
        error: () => {}
      });
    } catch {
      // Ignorar errores de parseo
    }
  }

  mostrarAlertaPedido(notif: any) {
    this.alertaPedidoFlotante = notif;
    if (!this.mokaSilenciada) {
      this.mensajeMoka = `${notif.titulo}: ${notif.mensaje}`;
      this.imagenMoka = '/assets/images/barista/barista_feliz.png';
      this.programarOcultarMensaje(7000);
    }
    if (this.alertaPedidoTimeout) clearTimeout(this.alertaPedidoTimeout);
    this.alertaPedidoTimeout = setTimeout(() => {
      this.alertaPedidoFlotante = null;
      this.cdr.detectChanges();
    }, 9000);
    this.cdr.detectChanges();
  }

  cerrarAlertaPedido(event?: Event) {
    if (event) event.stopPropagation();
    this.alertaPedidoFlotante = null;
    this.cdr.detectChanges();
  }

  private programarOcultarMensaje(ms: number) {
    if (this.mokaTimeout) clearTimeout(this.mokaTimeout);
    this.mokaTimeout = setTimeout(() => {
      this.mensajeMoka = null;
      if (!this.mokaSilenciada && !this.mokaService.passwordVisible) {
        this.imagenMoka = '/assets/images/barista/barista_saludando.png';
      }
      this.cdr.detectChanges();
    }, ms);
  }

  @HostListener('window:scroll')
  onWindowScroll() {
    this.evaluarScroll();
  }

  evaluarScroll() {
    if (typeof window !== 'undefined') {
      this.heroScrolled = window.scrollY > window.innerHeight * 0.35;
    }
  }

  public enAnimacionInicial(): boolean {
    const enHome = this.router.url === '/' || this.router.url.startsWith('/#');
    return enHome && !this.isLoggedIn && !this.heroScrolled;
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
    if (this.cartService.modalAbierto || this.mostrarRuleta) return false;
    return this.router.url === '/' || this.router.url.startsWith('/#');
  }

  public mostrarMokaGlobal(): boolean {
    if (this.cartService.modalAbierto || this.mostrarRuleta) return false;
    if (this.enAnimacionInicial()) return false;
    return this.router.url === '/' || this.router.url.startsWith('/#') || this.router.url === '/login';
  }

  @HostListener('window:abrir-ruleta-semanal')
  onAbrirRuletaSemanal() {
    this.lanzarRuleta();
  }

  lanzarRuleta(event?: Event) {
    if (event) event.preventDefault();
    this.mostrarRuleta = true;
    this.menuPerfilAbierto = false;
    this.cdr.detectChanges();
  }

  interactuarMoka() {
    if (this.mokaSilenciada) {
      this.mensajeMoka = 'Tengo la voz silenciada en tu menú de perfil.';
      this.imagenMoka = '/assets/images/barista/barista_sad.png';
      this.cdr.detectChanges();
      this.programarOcultarMensaje(3000);
      return;
    }

    let respuesta;
    if (this.router.url === '/login') {
      respuesta = this.mokaService.interactuarAuth();
    } else {
      respuesta = this.mokaService.interactuar();
      if (this.mokaService.passwordVisible) {
        respuesta.imagen = 'barista_cara_cubierta.png';
        respuesta.texto = '¡Sigo sin mirar! Promesa de barista.';
      }
    }

    this.mensajeMoka = respuesta.texto;
    this.imagenMoka = '/assets/images/barista/' + respuesta.imagen;
    this.cdr.detectChanges();

    const tiempoEspera = respuesta.castigo ? 6500 : 4800;
    this.programarOcultarMensaje(tiempoEspera);
  }

  cerrarBurbujaMoka(event: Event) {
    event.stopPropagation();
    this.mensajeMoka = null;
    this.cdr.detectChanges();
  }

  toggleVozMoka(event: any) {
    this.mokaSilenciada = !event.target.checked;

    if (this.mokaSilenciada) {
      if (this.mokaTimeout) clearTimeout(this.mokaTimeout);
      this.mensajeMoka = null;
    } else {
      this.imagenMoka = '/assets/images/barista/barista_saludando.png';
      this.mensajeMoka = '¡Genial! Volveré a contarte datos curiosos.';
      this.programarOcultarMensaje(3500);
    }
    this.cdr.detectChanges();
  }

  toggleProfileMenu(event: Event) {
    event.stopPropagation();
    this.menuPerfilAbierto = !this.menuPerfilAbierto;
    if (this.menuPerfilAbierto) {
      this.verificarNotificacionesPedidos();
    }
    this.cdr.detectChanges();
  }

  cerrarSesion(event: Event) {
    event.preventDefault();
    localStorage.removeItem('usuario_cactus');
    localStorage.removeItem('token_cactus');
    this.cartService.desconectarSesion();
    this.notificacionesPedidos = [];
    this.alertaPedidoFlotante = null;
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
