import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, IonicModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  constructor(public authService: AuthService) {}

  toggleSidebar(): void {
    const sidebarElement = document.querySelector('app-sidebar') as any;
    if (sidebarElement && sidebarElement.toggleMobile) {
      sidebarElement.toggleMobile();
    }
  }

  closeMenuOnMobile(): void {
    // Close sidebar on mobile when a link is clicked
    if (window.innerWidth < 768) {
      const sidebarElement = document.querySelector('app-sidebar') as any;
      if (sidebarElement && sidebarElement.closeSidebarOnMobile) {
        sidebarElement.closeSidebarOnMobile();
      }
    }
  }

  getUserName(): string {
    const user = this.authService.getCurrentUser();
    return user?.name || 'User';
  }

  logout(): void {
    this.authService.logout();
  }
}