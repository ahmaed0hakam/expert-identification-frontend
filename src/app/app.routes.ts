import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { AdminGuard } from './core/guards/admin.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/components/login/login.component').then(m => m.LoginComponent),
    canActivate: [guestGuard]
  },
  {
    path: 'offline-search',
    loadComponent: () => import('./features/auth/components/offline-search/offline-search.component').then(m => m.OfflineSearchComponent)
  },
  {
    path: 'search',
    loadComponent: () => import('./shared/layouts/user-layout/user-layout.component').then(m => m.UserLayoutComponent),
    canActivate: [AuthGuard],
    loadChildren: () => import('./features/user/user.routes').then(m => m.userRoutes)
  },
  {
    path: 'admin',
    loadComponent: () => import('./shared/layouts/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    canActivate: [AuthGuard, AdminGuard],
    loadChildren: () => import('./features/admin/admin.routes').then(m => m.adminRoutes)
  },
  {
    path: '**',
    redirectTo: '/login'
  }
];
