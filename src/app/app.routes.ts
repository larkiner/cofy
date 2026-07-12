import { Routes } from '@angular/router';
import { adminGuard, supervisorGuard } from './application/guards/admin.guard';
import { clienteGuard } from './application/guards/cliente.guard';
import { personalGuard } from './application/guards/personal.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/menu/menu').then(m => m.Menu),
    title: 'Menú | Cafetería',
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then(m => m.Login),
    title: 'Iniciar sesión | Cafetería',
  },
  {
    path: 'registro',
    loadComponent: () => import('./features/auth/registro/registro').then(m => m.Registro),
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
    loadComponent: () =>
      import('./features/interno/panel-interno/panel-interno').then(m => m.PanelInterno),
    canActivate: [personalGuard],
    title: 'Panel interno | Cafetería',
    children: [
      {
        path: '',
        loadComponent: () => import('./features/interno/tablero/tablero').then(m => m.Tablero),
      },
      {
        path: 'entregar',
        loadComponent: () =>
          import('./features/interno/entregar/entregar').then(m => m.Entregar),
      },
      {
        path: 'mostrador',
        loadComponent: () =>
          import('./features/interno/mostrador/mostrador').then(m => m.Mostrador),
      },
      {
        path: 'inventario',
        loadComponent: () =>
          import('./features/interno/inventario/inventario').then(m => m.Inventario),
        canActivate: [adminGuard],
      },
      {
        path: 'metricas',
        loadComponent: () =>
          import('./features/interno/metricas/metricas').then(m => m.Metricas),
        canActivate: [supervisorGuard],
      },
      {
        path: 'turnos',
        loadComponent: () => import('./features/interno/turnos/turnos').then(m => m.Turnos),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
