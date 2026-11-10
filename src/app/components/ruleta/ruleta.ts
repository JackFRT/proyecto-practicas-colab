import { Component, OnInit, ViewChild, ElementRef, inject, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ruleta',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ruleta.html',
  styleUrl: './ruleta.css'
})
export class Ruleta implements OnInit {
  router = inject(Router);
  http = inject(HttpClient);
  cdr = inject(ChangeDetectorRef);

  @Output() cerrar = new EventEmitter<void>();
  @ViewChild('wheelCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  usuarioActual: any = null;
  haGirado: boolean = false;
  isGirando: boolean = false;
  rotacionActual: number = 0;

  premios: any[] = [
    { id_premio: 1, titulo: '5% Dscto', descuento_porcentaje: 5, probabilidad: 40, color_seccion: '#3498db', anguloInicioRad: 0, anguloFinRad: 0 },
    { id_premio: 2, titulo: '10% Dscto', descuento_porcentaje: 10, probabilidad: 30, color_seccion: '#2ecc71', anguloInicioRad: 0, anguloFinRad: 0 },
    { id_premio: 3, titulo: '15% Dscto', descuento_porcentaje: 15, probabilidad: 15, color_seccion: '#f1c40f', anguloInicioRad: 0, anguloFinRad: 0 },
    { id_premio: 4, titulo: '20% Dscto', descuento_porcentaje: 20, probabilidad: 10, color_seccion: '#e67e22', anguloInicioRad: 0, anguloFinRad: 0 },
    { id_premio: 5, titulo: '¡Sigue Intentando!', descuento_porcentaje: 0, probabilidad: 5, color_seccion: '#95a5a6', anguloInicioRad: 0, anguloFinRad: 0 }
  ];

  mokaMensaje: string = 'Cargando ruleta...';
  mokaImagen: string = 'barista_saludando.png';
  mokaColor: string = 'rgba(255, 255, 255, 0.1)';
  resultadoTexto: string = 'ESPERANDO...';
  resultadoColor: string = 'gray';

  get userRole(): string {
    if (typeof localStorage === 'undefined') return 'cliente';
    const user = localStorage.getItem('usuario_cactus');
    return user ? JSON.parse(user).rol : 'cliente';
  }

  ngOnInit() {
    const userGuardado = typeof localStorage !== 'undefined' ? localStorage.getItem('usuario_cactus') : null;
    if (!userGuardado) {
      this.cerrarModal();
      this.router.navigate(['/login']);
      return;
    }
    this.usuarioActual = JSON.parse(userGuardado);
    this.cargarRuleta();
  }

  cargarRuleta() {
    const idUsuario = this.usuarioActual.idUsuario || this.usuarioActual.id_usuario;

    this.http.get<any>(`http://localhost:8080/api/ruleta/cargar/${idUsuario}`).subscribe({
      next: (res) => {
        if (res.premios && res.premios.length > 0) {
          this.premios = res.premios.map((p: any) => ({
            ...p,
            titulo: p.titulo || p.titulo_premio || 'Premio',
            probabilidad: parseFloat(p.probabilidad) || 20,
            color_seccion: p.color_seccion || p.colorSeccion || '#2ecc71',
            descuento_porcentaje: p.descuento_porcentaje ?? p.descuentoPorcentaje ?? 0,
            anguloInicioRad: 0,
            anguloFinRad: 0
          }));
        }

        this.haGirado = !res.puede_girar;
        this.usuarioActual.girosExtra = res.giros_extra ?? 0;
        localStorage.setItem('usuario_cactus', JSON.stringify(this.usuarioActual));

        this.actualizarEstadoInicialUI(res.dias_restantes || 0);
        this.cdr.detectChanges();
        setTimeout(() => this.dibujarRuleta(), 80);
      },
      error: () => {
        const girosExtra = this.usuarioActual.girosExtra ?? this.usuarioActual.giros_extra ?? 0;
        this.haGirado = girosExtra <= 0 && !!this.usuarioActual.fecha_ultimo_giro;
        this.actualizarEstadoInicialUI(7);
        this.cdr.detectChanges();
        setTimeout(() => this.dibujarRuleta(), 80);
      }
    });
  }

  actualizarEstadoInicialUI(diasRestantes: number) {
    if (this.userRole === 'admin' || this.userRole === 'empleado') {
      this.setMoka('Modo Visualización: Comprueba que los premios y colores de la ruleta se vean bien.', 'barista_saludando.png', 'rgba(255, 224, 102, 0.15)');
      this.resultadoTexto = 'MODO VISTA';
      this.resultadoColor = '#FFE066';
    } else if (this.haGirado) {
      const extraMsg = diasRestantes > 0 ? ` Vuelve en ${diasRestantes} día(s) o registra una visita en tienda.` : ' ¡Registra una visita presencial para ganar giros extra!';
      this.setMoka('Ya usaste tu giro disponible.' + extraMsg, 'barista_incomoda.png', 'rgba(255, 107, 107, 0.15)');
      this.resultadoTexto = 'SIN GIROS';
      this.resultadoColor = 'gray';
    } else {
      const nombre = this.usuarioActual.nombre ? this.usuarioActual.nombre.split(' ')[0] : 'Cliente';
      this.setMoka(`¡Hola, ${nombre}! Haz clic en la rueda para probar tu suerte.`, 'barista_saludando.png', 'rgba(163, 177, 138, 0.15)');
      this.resultadoTexto = '¡A GIRAR!';
      this.resultadoColor = '#FFE066';
    }
  }

  dibujarRuleta() {
    if (!this.canvasRef || this.premios.length === 0) return;
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const center = canvas.width / 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let startAngle = 0;

    const totalPeso = this.premios.reduce((acc, p) => acc + (parseFloat(p.probabilidad) > 0 ? parseFloat(p.probabilidad) : 10), 0);

    this.premios.forEach(premio => {
      const prob = parseFloat(premio.probabilidad) > 0 ? parseFloat(premio.probabilidad) : 10;
      const sliceAngle = (prob / totalPeso) * 2 * Math.PI;

      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, center, startAngle, startAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = premio.color_seccion || premio.colorSeccion || '#333';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 2;
      ctx.stroke();

      premio.anguloInicioRad = startAngle;
      premio.anguloFinRad = startAngle + sliceAngle;

      ctx.save();
      ctx.translate(center, center);
      const textAngle = startAngle + sliceAngle / 2;
      ctx.rotate(textAngle);

      ctx.font = "bold 13px 'Outfit', sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 5;

      const tituloStr = premio.titulo || 'Premio';
      const texto = tituloStr.length > 16 ? tituloStr.substring(0, 16) + '...' : tituloStr;

      if (textAngle > Math.PI / 2 && textAngle < 3 * Math.PI / 2) {
        ctx.rotate(Math.PI);
        ctx.textAlign = "left";
        ctx.fillText(texto, -center + 22, 5);
      } else {
        ctx.textAlign = "right";
        ctx.fillText(texto, center - 22, 5);
      }
      ctx.restore();
      startAngle += sliceAngle;
    });
  }

  girar() {
    if (this.userRole === 'admin' || this.userRole === 'empleado') {
      this.setMoka('¡Oye! Tú trabajas aquí, la ruleta es exclusiva para los clientes.', 'barista_en_alerta.png', 'rgba(255, 107, 107, 0.2)');
      this.cdr.detectChanges();
      return;
    }

    if (this.isGirando) return;
    if (this.haGirado) {
      this.setMoka('Ya giraste esta semana. ¡Visítanos en la cafetería para ganar giros extra!', 'barista_incomoda.png', 'rgba(255, 107, 107, 0.2)');
      this.cdr.detectChanges();
      return;
    }

    this.isGirando = true;
    this.setMoka('¡Validando con los dioses del café y el cactus...!', 'barista_asustada.png', 'rgba(214, 90, 49, 0.2)');
    this.resultadoTexto = '¡GIRANDO...!';
    this.resultadoColor = '#D65A31';
    this.cdr.detectChanges();

    const idUsuario = this.usuarioActual.idUsuario || this.usuarioActual.id_usuario;

    this.http.post<any>(`http://localhost:8080/api/ruleta/girar/${idUsuario}`, {}).subscribe({
      next: (data) => {
        const premioBackend = data.premio;
        let premioObjetivo = this.premios.find(p =>
          (premioBackend?.id_premio && p.id_premio === premioBackend.id_premio) ||
          (premioBackend?.titulo && p.titulo === premioBackend.titulo) ||
          (p.descuento_porcentaje === data.descuento)
        );
        if (!premioObjetivo) {
          premioObjetivo = this.premios[0];
        }

        const anguloMedio = (premioObjetivo.anguloInicioRad + premioObjetivo.anguloFinRad) / 2;
        const giroBase = 180 - (anguloMedio * (180 / Math.PI));
        this.rotacionActual = giroBase + (5 * 360);

        this.cdr.detectChanges();
        setTimeout(() => this.mostrarResultadoFinal(data, premioObjetivo.titulo), 4500);

        this.usuarioActual.girosExtra = data.giros_extra ?? 0;
        localStorage.setItem('usuario_cactus', JSON.stringify(this.usuarioActual));
      },
      error: (err) => {
        this.isGirando = false;
        const msg = err.error?.mensaje || (typeof err.error === 'string' ? err.error : 'No se pudo realizar el giro.');
        this.setMoka(msg, 'barista_sad.png', 'rgba(255, 107, 107, 0.2)');
        this.resultadoTexto = 'DETENIDO';
        this.cdr.detectChanges();
      }
    });
  }

  mostrarResultadoFinal(data: any, tituloStr: string) {
    const girosRestantes = data.giros_extra ?? 0;
    this.haGirado = girosRestantes <= 0;
    this.isGirando = false;
    this.resultadoTexto = tituloStr.toUpperCase();

    const codigoCupon = data.codigo_cupon || data.codigoCupon;
    const descuento = data.descuento ?? 0;

    if (descuento <= 0) {
      this.resultadoColor = 'gray';
      this.setMoka('¡Casi! No hubo premio esta vez, pero en tu próxima visita tendrás otra oportunidad.', 'barista_sad.png', 'rgba(255, 255, 255, 0.1)');
    } else {
      this.resultadoColor = '#A3B18A';
      if (descuento >= 20) {
        this.resultadoColor = '#FFE066';
        this.setMoka(`¡INCREÍBLE! Ganaste ${descuento}% de descuento. Tu cupón es: ${codigoCupon} (guardado en tu Perfil).`, 'barista_emocionada.png', 'rgba(255, 224, 102, 0.2)');
      } else {
        this.setMoka(`¡Felicidades! Ganaste un ${descuento}% de descuento. Tu cupón es: ${codigoCupon} (guardado en tu Perfil).`, 'barista_feliz.png', 'rgba(163, 177, 138, 0.2)');
      }
    }
    this.cdr.detectChanges();
  }

  setMoka(msj: string, img: string, color: string) {
    this.mokaMensaje = msj;
    this.mokaImagen = img;
    this.mokaColor = color;
  }

  cerrarModal() {
    this.cerrar.emit();
  }
}
