import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { Auth } from './components/auth/auth';
import { Empleado } from './components/empleado/empleado';
import { Profile } from './components/profile/profile';
import { AdminPanel } from './components/admin/admin';

export const routes: Routes = [
  { path: '', component: Home }, 

  { path: 'login', component: Auth },

  { path: 'empleado/dashboard', component: Empleado },

  { path: 'cliente/perfil', component: Profile},

  { path: 'admin/panel', component: AdminPanel},

  { path: '**', redirectTo: '' },
];