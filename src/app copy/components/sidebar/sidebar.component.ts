import { Component, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  IonMenu,
  IonContent,
  IonList,
  IonMenuToggle,
  IonItem,
  IonIcon,
  IonLabel,
  IonButtons,
  IonButton,
  IonToolbar,
  IonTitle,
  IonHeader,
  IonAvatar
} from '@ionic/angular/standalone';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IonMenu,
    IonContent,
    IonList,
    IonMenuToggle,
    IonItem,
    IonIcon,
    IonLabel,
    IonButtons,
    IonButton,
    IonToolbar,
    IonTitle,
    IonHeader,
    IonAvatar
  ]
})
export class SidebarComponent {
  @ViewChild(IonMenu) menu!: IonMenu;
  
  private authService = inject(AuthService);
  
  menuItems = [
    { title: 'Dashboard', path: '/dashboard', icon: 'speedometer-outline', roles: ['admin', 'approver', 'campus_manager', 'responsible_user', 'viewer'] },
    { title: 'Procurements', path: '/procurements', icon: 'document-text-outline', roles: ['admin', 'approver', 'campus_manager', 'responsible_user', 'viewer'] },
    { title: 'Input/Export', path: '/import-export', icon: 'swap-horizontal-outline', roles: ['admin', 'campus_manager'] },
    { title: 'Reports', path: '/reports', icon: 'bar-chart-outline', roles: ['admin', 'approver', 'campus_manager', 'viewer'] },
    { title: 'User Management', path: '/users', icon: 'people-outline', roles: ['admin'] }
  ];

  get filteredMenuItems() {
    const user = this.authService.getCurrentUser();
    if (!user) return [];
    return this.menuItems.filter(item => 
      item.roles.includes(user.role)
    );
  }

  getUser() {
    return this.authService.getCurrentUser();
  }

  closeMenu() {
    if (this.menu) {
      this.menu.close();
    }
  }

  logout() {
    this.authService.logout();
    if (this.menu) {
      this.menu.close();
    }
  }
}