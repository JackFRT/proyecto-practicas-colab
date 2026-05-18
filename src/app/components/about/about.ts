import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-about',
  standalone: true,
  templateUrl: './about.html',
  styleUrl: './about.css'
})
export class About implements OnInit, OnDestroy {
  http = inject(HttpClient);
  cdr = inject(ChangeDetectorRef);
  
  noticias: any[] = [];
  noticiaActualIndex: number = 0;

  finalDuration: number = 30000;
  
  currentProgress = signal<number>(0);

  intervaloPase: any; 
  intervaloProgreso: any; 

  getRutaImagen(nombreArchivo: string, carpeta: string = 'news'): string {
    if (!nombreArchivo) return ''; 
    return `http://localhost/cactus-api/images/${carpeta}/${nombreArchivo}`;
  }

  ngOnInit() {
    const urlAPI = 'http://localhost/cactus-api/obtener_inicio.php';

    this.http.get<any>(urlAPI).subscribe({
      next: (data) => {
        this.noticias = (data.noticias || []).sort((a: any, b: any) => a.prioridad - b.prioridad);
        
        this.iniciarCarruselConProgreso();
        this.cdr.detectChanges();
      },
      error: (err) => console.error("Error en noticias:", err)
    });
  }

  moverNoticia(direccion: number) {
    if (this.noticias.length <= 1) return;
    
    this.noticiaActualIndex += direccion;

    if (this.noticiaActualIndex >= this.noticias.length) {
      this.noticiaActualIndex = 0;
    } else if (this.noticiaActualIndex < 0) {
      this.noticiaActualIndex = this.noticias.length - 1;
    }
    
    this.iniciarCarruselConProgreso();
  }

  cambiarNoticia(index: number) {
    this.noticiaActualIndex = index;
    this.iniciarCarruselConProgreso();
  }

  iniciarCarruselConProgreso() {
    clearInterval(this.intervaloPase);
    clearInterval(this.intervaloProgreso);
    this.currentProgress.set(0);

    if (this.noticias.length > 1) {
      this.intervaloPase = setInterval(() => {
        this.moverNoticia(1);
      }, this.finalDuration);

      const step = 100 / (this.finalDuration / 50); 
      
      this.intervaloProgreso = setInterval(() => {
        this.currentProgress.update(prev => prev + step);
      }, 50);
    }
  }

  ngOnDestroy() {
    clearInterval(this.intervaloPase);
    clearInterval(this.intervaloProgreso);
  }
}