import { Routes } from '@angular/router';
import { authGuard } from './auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then(m => m.Login),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/groups/groups').then(m => m.Groups),
  },
  {
    path: 'groups/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/group/group').then(m => m.Group),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/profile/profile').then(m => m.Profile),
  },
  { path: '**', redirectTo: '' },
];
