import { Routes } from '@angular/router';

export const ROOMS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./rooms-list').then((m) => m.RoomsListComponent),
  },
];
