import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  {
    path: 'auth',
    canActivate: [guestGuard],
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'rooms',
    canActivate: [authGuard],
    loadChildren: () => import('./features/rooms/rooms.routes').then((m) => m.ROOMS_ROUTES),
  },
  { path: '', redirectTo: 'rooms', pathMatch: 'full' },
  {
    path: '**',
    loadComponent: () => import('./shared/components/not-found').then((m) => m.NotFoundComponent),
  },
];
