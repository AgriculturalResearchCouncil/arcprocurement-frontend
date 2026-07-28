import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth-guard';
import { RoleGuard } from './guards/role-guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.page').then(m => m.DashboardPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'procurements',
    loadComponent: () => import('./pages/procurement/procurement.page').then(m => m.ProcurementPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'procurements/:id',
    loadComponent: () => import('./pages/procurement/procurement-detail/procurement-detail.page').then(m => m.ProcurementDetailPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'import-export',
    loadComponent: () => import('./pages/import-export/import-export.page').then(m => m.ImportExportPage),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['admin', 'campus_manager'] }
  },
  {
    path: 'reports',
    loadComponent: () => import('./pages/reports/reports.page').then(m => m.ReportsPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'users',
    loadComponent: () => import('./pages/user-management/user-management.page').then(m => m.UserManagementPage),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['admin'] }
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];