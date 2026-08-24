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

  // 1. Configuramos los premios visuales de la ruleta estáticamente
  premios: any[] = [
    { titulo: '10% DTO', probabilidad: '20', color_seccion: '#A3B18A', anguloInicioRad: 0, anguloFinRad: 0 },
    { titulo: '15% DTO', probabilidad: '20', color_seccion: '#588157', anguloInicioRad: 0, anguloFinRad: 0 },
    { titulo: '20% DTO', probabilidad: '20', color_seccion: '#3A5A40', anguloInicioRad: 0, anguloFinRad: 0 },
    { titulo: '25% DTO', probabilidad: '20', color_seccion: '#D65A31', anguloInicioRad: 0, anguloFinRad: 0 },
    { titulo: '50% DTO', probabilidad: '10', color_seccion: '#FFE066', anguloInicioRad: 0, anguloFinRad: 0 },
    { titulo: 'INTENTA OTRA VEZ', probabilidad: '10', color_seccion: '#333333', anguloInicioRad: 0, anguloFinRad: 0 }
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
    if (!userGuardado) { this.router.navigate(['/login']); return; }
    this.usuarioActual = JSON.parse(userGuardado);
    this.cargarRuleta();
  }

  cargarRuleta() {
    // 2. Evaluamos si tiene giros disponibles basados en la respuesta de Spring Boot
    this.haGirado = this.usuarioActual.girosExtra <= 0;

    if (this.userRole === 'admin' || this.userRole === 'empleado') {
      this.setMoka('Modo Visualización: Comprueba que los premios se vean bien. ¡No intentes jugar!', 'barista_saludando.png', 'rgba(255, 224, 102, 0.15)');
      this.resultadoTexto = 'MODO EMPLEADO';
      this.resultadoColor = '#FFE066';
    } else if (this.haGirado) {
      this.setMoka('Ya giraste. ¡Registra una visita presencial para obtener más giros!', 'barista_incomoda.png', 'rgba(255, 107, 107, 0.15)');
      this.resultadoTexto = 'SIN GIROS';
      this.resultadoColor = 'gray';
    } else {
      const nombre = this.usuarioActual.nombre ? this.usuarioActual.nombre.split(' ')[0] : 'Cliente';
      this.setMoka(`¡Hola, ${nombre}! ¿Listo para probar tu suerte?`, 'barista_saludando.png', 'rgba(163, 177, 138, 0.15)');
      this.resultadoTexto = '¡A GIRAR!';
      this.resultadoColor = '#FFE066';
    }
    
    this.cdr.detectChanges();
    setTimeout(() => { this.dibujarRuleta(); }, 100);
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
    if (this.userRole === 'admin' || this.userRole === 'empleado') {
      this.setMoka('¡Oye! Tú trabajas aquí, no puedes jugar con la ruleta de los clientes.', 'barista_en_alerta.png', 'rgba(255, 107, 107, 0.2)');
      this.cdr.detectChanges();
      return;
    }

    if (this.isGirando) return;
    if (this.haGirado) {
      this.setMoka('Las reglas son claras. ¡Necesitas registrar una visita presencial!', 'barista_incomoda.png', 'rgba(255, 107, 107, 0.2)');
      this.cdr.detectChanges();
      return;
    }

    this.isGirando = true;
    this.setMoka('¡Validando con los dioses del cactus...!', 'barista_asustada.png', 'rgba(214, 90, 49, 0.2)');
    this.resultadoTexto = '¡ESPERA...!';
    this.resultadoColor = '#D65A31';
    this.cdr.detectChanges();

    // 3. Conectamos al endpoint de Spring Boot
    this.http.post<any>(`http://localhost:8080/api/ruleta/girar/${this.usuarioActual.idUsuario}`, {}).subscribe({
      next: (data) => {
        // Obtenemos el texto equivalente en nuestro array de premios
        const tituloObjetivo = data.descuento > 0 ? `${data.descuento}% DTO` : 'INTENTA OTRA VEZ';
        const premioObjetivo = this.premios.find(p => p.titulo === tituloObjetivo);
        
        if (premioObjetivo) {
          this.setMoka('¡Ahí va! ¡Qué nervios!', 'barista_asustada.png', 'rgba(214, 90, 49, 0.2)');
          this.resultadoTexto = '¡GIRANDO...!';
          
          const anguloMedio = (premioObjetivo.anguloInicioRad + premioObjetivo.anguloFinRad) / 2;
          const giroBase = 180 - (anguloMedio * (180 / Math.PI)); 
          this.rotacionActual = giroBase + (5 * 360);
          
          this.cdr.detectChanges();
          setTimeout(() => this.mostrarResultadoFinal(data, tituloObjetivo), 4500); 

          // Actualizamos la sesión para restar el giro
          this.usuarioActual.girosExtra = data.girosRestantes;
          localStorage.setItem('usuario_cactus', JSON.stringify(this.usuarioActual));
        }
      },
      error: (err) => {
        this.isGirando = false;
        const msg = err.error && typeof err.error === 'string' ? err.error : 'Error de conexión. Intenta de nuevo.';
        this.setMoka(msg, 'barista_sad.png', 'rgba(255, 107, 107, 0.2)');
        this.cdr.detectChanges();
      }
    });
  }

  mostrarResultadoFinal(data: any, tituloStr: string) {
    this.haGirado = data.girosRestantes <= 0;
    this.isGirando = false;
    this.resultadoTexto = tituloStr;

    if (data.descuento === 0) {
      this.resultadoColor = 'gray';
      this.setMoka('¡Oh no! No hubo suerte esta vez. Necesitas otra visita presencial.', 'barista_sad.png', 'rgba(255, 255, 255, 0.1)');
    } else {
      this.resultadoColor = '#A3B18A';
      if (data.descuento >= 25) {
        this.resultadoColor = '#FFE066';
        this.setMoka(`¡INCREÍBLE! ¡Te llevaste el premio grande! Tu código es ${data.codigoCupon}`, 'barista_emocionada.png', 'rgba(255, 224, 102, 0.2)');
      } else {
        this.setMoka(`¡Felicidades! Ganaste un ${data.descuento}% de descuento. Tu código es ${data.codigoCupon}`, 'barista_feliz.png', 'rgba(163, 177, 138, 0.2)');
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