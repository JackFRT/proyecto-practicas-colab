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
  premios: any[] = [];
  haGirado: boolean = false;
  isGirando: boolean = false;
  rotacionActual: number = 0;

  mokaMensaje: string = 'Cargando ruleta...';
  mokaImagen: string = 'barista_saludando.png';
  mokaColor: string = 'rgba(255, 255, 255, 0.1)';
  resultadoTexto: string = 'ESPERANDO...';
  resultadoColor: string = 'gray';

  ngOnInit() {
    const userGuardado = typeof localStorage !== 'undefined' ? localStorage.getItem('usuario_cactus') : null;
    if (!userGuardado) { this.router.navigate(['/login']); return; }
    this.usuarioActual = JSON.parse(userGuardado);
    this.cargarRuleta();
  }

  cargarRuleta() {
    this.http.post<any>('http://localhost/cactus-api/ruleta_api.php', { accion: 'cargar', id_usuario: this.usuarioActual.id_usuario }).subscribe({
      next: (res) => {
        if (res.success) {
          this.premios = res.premios;
          this.haGirado = res.ha_girado;
          
          if (this.haGirado) {
            this.setMoka('Ya giraste esta semana. ¡Vuelve el próximo lunes!', 'barista_incomoda.png', 'rgba(255, 107, 107, 0.15)');
            this.resultadoTexto = 'ESPERA AL LUNES';
          } else {
            const nombre = this.usuarioActual.nombre.split(' ')[0];
            this.setMoka(`¡Hola, ${nombre}! ¿Listo para probar tu suerte esta semana?`, 'barista_saludando.png', 'rgba(163, 177, 138, 0.15)');
            this.resultadoTexto = '¡A GIRAR!';
            this.resultadoColor = '#FFE066';
          }
          
          this.cdr.detectChanges();
          setTimeout(() => { this.dibujarRuleta(); }, 100);
        }
      }
    });
  }

  dibujarRuleta() {
    if (!this.canvasRef || this.premios.length === 0) return;
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const center = canvas.width / 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let startAngle = 0;

    this.premios.forEach(premio => {
      const prob = parseFloat(premio.probabilidad);
      if (prob <= 0) return;
      
      const sliceAngle = (prob / 100) * 2 * Math.PI;
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, center, startAngle, startAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = premio.color_seccion || '#333';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'; 
      ctx.lineWidth = 2;
      ctx.stroke();

      premio.anguloInicioRad = startAngle;
      premio.anguloFinRad = startAngle + sliceAngle;

      ctx.save();
      ctx.translate(center, center);
      const textAngle = startAngle + sliceAngle / 2;
      ctx.rotate(textAngle);
      
      ctx.font = "bold 14px 'Outfit', sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 5;
      
      let texto = premio.titulo.length > 15 ? premio.titulo.substring(0, 15) + '...' : premio.titulo;
      
      if (textAngle > Math.PI / 2 && textAngle < 3 * Math.PI / 2) {
        ctx.rotate(Math.PI);
        ctx.textAlign = "left";
        ctx.fillText(texto, -center + 25, 5);
      } else {
        ctx.textAlign = "right";
        ctx.fillText(texto, center - 25, 5);
      }
      ctx.restore();
      startAngle += sliceAngle;
    });
  }

  girar() {
    if (this.isGirando) return;
    if (this.haGirado) {
      this.setMoka('Las reglas son claras. ¡Solo un giro por semana!', 'barista_incomoda.png', 'rgba(255, 107, 107, 0.2)');
      this.cdr.detectChanges();
      return;
    }

    this.isGirando = true;
    this.setMoka('¡Validando con los dioses del cactus...!', 'barista_asustada.png', 'rgba(214, 90, 49, 0.2)');
    this.resultadoTexto = '¡ESPERA...!';
    this.resultadoColor = '#D65A31';
    this.cdr.detectChanges();

    this.http.post<any>('http://localhost/cactus-api/ruleta_api.php', { accion: 'girar', id_usuario: this.usuarioActual.id_usuario }).subscribe({
      next: (data) => {
        if (!data.success) {
          this.isGirando = false;
          this.haGirado = true;
          this.setMoka(data.mensaje, 'barista_sad.png', 'rgba(255, 255, 255, 0.1)');
          this.resultadoTexto = 'BLOQUEADO';
          this.resultadoColor = 'gray';
          this.cdr.detectChanges();
          return;
        }

        const premioObjetivo = this.premios.find(p => p.titulo === data.titulo);
        if (premioObjetivo) {
          this.setMoka('¡Ahí va! ¡Qué nervios!', 'barista_asustada.png', 'rgba(214, 90, 49, 0.2)');
          this.resultadoTexto = '¡GIRANDO...!';
          
          const anguloMedio = (premioObjetivo.anguloInicioRad + premioObjetivo.anguloFinRad) / 2;
          const giroBase = 180 - (anguloMedio * (180 / Math.PI)); 
          this.rotacionActual = giroBase + (5 * 360);
          
          this.cdr.detectChanges();
          setTimeout(() => this.mostrarResultadoFinal(data), 4500); 
        }
      },
      error: () => {
        this.isGirando = false;
        this.setMoka('Error de conexión. Intenta de nuevo.', 'barista_sad.png', 'rgba(255, 107, 107, 0.2)');
        this.cdr.detectChanges();
      }
    });
  }

  mostrarResultadoFinal(data: any) {
    this.haGirado = true;
    this.isGirando = false;
    this.resultadoTexto = data.titulo.toUpperCase();

    if (data.descuento == 0) {
      this.resultadoColor = 'gray';
      this.setMoka('¡Oh no! No hubo suerte esta vez. El próximo lunes tendrás otra oportunidad.', 'barista_sad.png', 'rgba(255, 255, 255, 0.1)');
    } else {
      this.resultadoColor = '#A3B18A';
      if (data.descuento >= 15) {
        this.resultadoColor = '#FFE066';
        this.setMoka('¡INCREÍBLE! ¡Te llevaste el premio grande! Ve a tu perfil para revisar tu cupón.', 'barista_emocionada.png', 'rgba(255, 224, 102, 0.2)');
      } else {
        this.setMoka(`¡Felicidades! Ganaste un ${data.descuento}% de descuento. ¡Se guardó en tu perfil!`, 'barista_feliz.png', 'rgba(163, 177, 138, 0.2)');
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