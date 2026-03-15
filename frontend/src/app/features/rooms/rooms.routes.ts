import { Routes } from '@angular/router';

export const ROOMS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./rooms-list').then((m) => m.RoomsListComponent),
  },
  {
    path: 'new',
    loadComponent: () => import('./room-form.component').then((m) => m.RoomFormComponent),
  },
  {
    path: ':id',
    loadComponent: () => import('./room-detail.component').then((m) => m.RoomDetailComponent),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./room-form.component').then((m) => m.RoomFormComponent),
  },
];
