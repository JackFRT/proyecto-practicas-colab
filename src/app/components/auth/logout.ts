import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-logout',
  standalone: true,
  template: '<p>Cerrando sesión...</p>'
})
export class Logout implements OnInit {
  router = inject(Router);

  ngOnInit() {
    localStorage.removeItem('usuario_cactus');

    console.log("Sesión cerrada. ¡Vuelve pronto al museo!");

    this.router.navigate(['/']);
    
    // setTimeout(() => window.location.reload(), 100); 
  }
}