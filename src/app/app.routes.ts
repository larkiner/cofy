import { Routes } from '@angular/router';
import { personalGuard } from './core/personal.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/menu/menu').then(m => m.Menu),
    title: 'Menú | Cafetería',
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login').then(m => m.Login),
    title: 'Iniciar sesión | Cafetería',
  },
  {
    path: 'registro',
    loadComponent: () => import('./features/auth/registro').then(m => m.Registro),
    title: 'Crear cuenta | Cafetería',
  },
  {
    path: 'interno',
    loadComponent: () => import('./features/interno/panel-interno').then(m => m.PanelInterno),
    canActivate: [personalGuard],
    title: 'Panel interno | Cafetería',
  },
  { path: '**', redirectTo: '' },
];
