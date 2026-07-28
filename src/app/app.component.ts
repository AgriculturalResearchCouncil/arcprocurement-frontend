import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonMenuButton } from '@ionic/angular/standalone';
import { Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { addIcons } from 'ionicons';
import * as allIcons from 'ionicons/icons';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { FooterComponent } from './components/footer/footer.component';
import { AuthService } from './services/auth';
import { MenuController } from '@ionic/angular';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IonApp,
    IonRouterOutlet,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonMenuButton,
    SidebarComponent,
    FooterComponent
  ]
})
export class AppComponent implements OnInit {
  pageTitle = 'ARC Procurement System';
  isAuthenticated = false;
  version: string = environment.version;


  private titleMap: { [key: string]: string } = {
    '/login': 'Sign In',
    '/dashboard': 'Dashboard',
    '/procurements': 'Procurement Management',
    '/import-export': 'Procurement Entry',
    '/reports': 'Reports & Analytics',
    '/users': 'User Management'
  };

  constructor(
    private router: Router,
    private authService: AuthService,
    private menuCtrl: MenuController
  ) {
    // Register ALL Ionicons - FIXES THE MISSING ICONS ERROR
    addIcons(allIcons);
    
    this.isAuthenticated = this.authService.isLoggedIn();
    
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        let path = event.urlAfterRedirects;
        path = path.split('?')[0];
        
        // Find matching title
        let found = false;
        for (const routePath in this.titleMap) {
          if (path.startsWith(routePath)) {
            this.pageTitle = this.titleMap[routePath];
            found = true;
            break;
          }
        }
        if (!found) {
          this.pageTitle = 'ARC Procurement System';
        }
        
        // Enable the menu for authenticated users
        if (this.isAuthenticated) {
          this.menuCtrl.enable(true, 'main-menu');
        } else {
          this.menuCtrl.enable(false, 'main-menu');
        }
      }
    });
  }

  getUserName(): string {
    const user = this.authService.getCurrentUser();
    return user?.name || 'User';
  }

  logout() {
    this.authService.logout();
  }

  async ngOnInit() {
    // Initial menu state
    if (this.isAuthenticated) {
      await this.menuCtrl.enable(true, 'main-menu');
    } else {
      await this.menuCtrl.enable(false, 'main-menu');
    }
    
    // Listen for auth changes
    setInterval(async () => {
      const newAuthState = this.authService.isLoggedIn();
      if (this.isAuthenticated !== newAuthState) {
        this.isAuthenticated = newAuthState;
        if (this.isAuthenticated) {
          await this.menuCtrl.enable(true, 'main-menu');
        } else {
          await this.menuCtrl.enable(false, 'main-menu');
        }
      }
    }, 1000);
  }
}