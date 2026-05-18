import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root' 
})
export class CartService {
  
  private loadCart(): any[] {
    if (typeof localStorage !== 'undefined') {
      const guardado = localStorage.getItem('cactus_carrito');
      if (guardado) return JSON.parse(guardado);
    }
    return [];
  }

  private carritoSource = new BehaviorSubject<any[]>(this.loadCart());
  carrito$ = this.carritoSource.asObservable();

  private mostrarCarritoSource = new BehaviorSubject<boolean>(false);
  mostrarCarrito$ = this.mostrarCarritoSource.asObservable();

  get items() { return this.carritoSource.getValue(); }

  private saveCart(items: any[]) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('cactus_carrito', JSON.stringify(items));
    }
    this.carritoSource.next(items);
  }

  agregarItem(item: any) {
    const actual = this.items;
    const existe = actual.find(i => i.id_cactus === item.id_cactus && i.estilo === item.estilo);
    
    if (existe) { existe.cantidad += item.cantidad; } 
    else { actual.push(item); }
    
    this.saveCart(actual);
  }

  eliminarItem(index: number) {
    const actual = this.items;
    actual.splice(index, 1);
    this.saveCart(actual);
  }

  limpiarCarrito() {
    this.saveCart([]);
  }

  getTotalPlantas() { return this.items.reduce((total, item) => total + item.cantidad, 0); }
  getSubtotal() { return this.items.reduce((total, item) => total + (item.precio * item.cantidad), 0); }

  abrirModal() { this.mostrarCarritoSource.next(true); }
  cerrarModal() { this.mostrarCarritoSource.next(false); }
}