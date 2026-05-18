import { Component, HostListener, ElementRef, inject } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  templateUrl: './footer.html',
  styleUrl: './footer.css'
})
export class Footer {
  sunTranslateY: number = 250; 
  elementRef = inject(ElementRef); 

  @HostListener('window:scroll')
  onScroll() {
    const footer = this.elementRef.nativeElement.querySelector('#main-footer');

    if (footer) {
      const rect = footer.getBoundingClientRect();
      
      if (rect.top < window.innerHeight) {
        let visible = window.innerHeight - rect.top;
        
        let nuevoTranslateY = 170 - (visible * 1.0); 
        
        if (nuevoTranslateY < -100) nuevoTranslateY = -100; 
        
        this.sunTranslateY = nuevoTranslateY;
      } else {
        this.sunTranslateY = 250; 
      }
    }
  }
}