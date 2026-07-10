import { Routes } from '@angular/router';
import { adminGuard, supervisorGuard } from './core/admin.guard';
import { clienteGuard } from './core/cliente.guard';
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
    path: 'carrito',
    loadComponent: () => import('./features/carrito/carrito').then(m => m.Carrito),
    title: 'Carrito | Cafetería',
  },
  {
    path: 'mis-pedidos',
    loadComponent: () => import('./features/pedidos/mis-pedidos').then(m => m.MisPedidos),
    canActivate: [clienteGuard],
    title: 'Mis pedidos | Cafetería',
  },
  {
    path: 'interno',
    loadComponent: () => import('./features/interno/panel-interno').then(m => m.PanelInterno),
    canActivate: [personalGuard],
    title: 'Panel interno | Cafetería',
    children: [
      {
        path: '',
        loadComponent: () => import('./features/interno/tablero').then(m => m.Tablero),
      },
      {
        path: 'entregar',
        loadComponent: () => import('./features/interno/entregar').then(m => m.Entregar),
      },
      {
        path: 'mostrador',
        loadComponent: () => import('./features/interno/mostrador').then(m => m.Mostrador),
      },
      {
        path: 'inventario',
        loadComponent: () => import('./features/interno/inventario').then(m => m.Inventario),
        canActivate: [adminGuard],
      },
      {
        path: 'metricas',
        loadComponent: () => import('./features/interno/metricas').then(m => m.Metricas),
        canActivate: [supervisorGuard],
      },
      {
        path: 'turnos',
        loadComponent: () => import('./features/interno/turnos').then(m => m.Turnos),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
