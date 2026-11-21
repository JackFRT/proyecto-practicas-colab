import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CartService {

  private getActiveUserId(): string | null {
    if (typeof localStorage === 'undefined') return null;
    const rawUser = localStorage.getItem('usuario_cactus');
    if (!rawUser) return null;
    try {
      const user = JSON.parse(rawUser);
      const id = user?.idUsuario ?? user?.id_usuario ?? user?.id;
      return id ? String(id) : null;
    } catch {
      return null;
    }
  }

  private getStorageKey(): string | null {
    const userId = this.getActiveUserId();
    return userId ? `cactus_carrito_user_${userId}` : null;
  }

  private loadCart(): any[] {
    if (typeof localStorage !== 'undefined') {
      // Eliminar la clave global antigua para que nunca se mezclen sesiones
      localStorage.removeItem('cactus_carrito');
      const key = this.getStorageKey();
      if (!key) return [];
      const guardado = localStorage.getItem(key);
      if (guardado) {
        try {
          return JSON.parse(guardado);
        } catch {
          return [];
        }
      }
    }
    return [];
  }

  private carritoSource = new BehaviorSubject<any[]>(this.loadCart());
  carrito$ = this.carritoSource.asObservable();

  private mostrarCarritoSource = new BehaviorSubject<boolean>(false);
  mostrarCarrito$ = this.mostrarCarritoSource.asObservable();

  get items(): any[] {
    if (!this.getActiveUserId()) {
      if (this.carritoSource.getValue().length > 0) {
        this.carritoSource.next([]);
      }
      return [];
    }
    return this.carritoSource.getValue();
  }

  get modalAbierto(): boolean {
    return this.mostrarCarritoSource.getValue();
  }

  sincronizarConSesion() {
    this.carritoSource.next(this.loadCart());
  }

  private saveCart(items: any[]) {
    if (typeof localStorage !== 'undefined') {
      const key = this.getStorageKey();
      if (key) {
        localStorage.setItem(key, JSON.stringify(items));
        this.carritoSource.next(items);
      } else {
        this.carritoSource.next([]);
      }
    }
  }

  agregarItem(item: any): boolean {
    if (!this.getActiveUserId()) {
      this.carritoSource.next([]);
      return false;
    }
    const actual = [...this.items];
    const existe = actual.find(i => i.id_producto === item.id_producto && i.estilo === item.estilo);

    if (existe) {
      existe.cantidad += item.cantidad;
    } else {
      actual.push(item);
    }

    this.saveCart(actual);
    return true;
  }

  eliminarItem(index: number) {
    if (!this.getActiveUserId()) return;
    const actual = [...this.items];
    actual.splice(index, 1);
    this.saveCart(actual);
  }

  limpiarCarrito() {
    if (typeof localStorage !== 'undefined') {
      const key = this.getStorageKey();
      if (key) {
        localStorage.removeItem(key);
      }
    }
    this.carritoSource.next([]);
  }

  desconectarSesion() {
    this.carritoSource.next([]);
    this.cerrarModal();
  }

  getTotalPlantas(): number {
    return this.items.reduce((total, item) => total + item.cantidad, 0);
  }

  getSubtotal(): number {
    return this.items.reduce((total, item) => total + (item.precio * item.cantidad), 0);
  }

  abrirModal() {
    this.mostrarCarritoSource.next(true);
  }

  cerrarModal() {
    this.mostrarCarritoSource.next(false);
  }
}
