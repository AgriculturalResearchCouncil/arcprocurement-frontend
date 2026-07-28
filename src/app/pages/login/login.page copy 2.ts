// frontend/src/app/pages/login/login.page.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { 
  IonContent, IonButton, IonItem, IonLabel, 
  IonText, IonIcon, IonSpinner
} from '@ionic/angular/standalone';
import { AuthService, AuthError } from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
    IonContent, IonButton, IonItem, IonLabel,
    IonText, IonIcon, IonSpinner
  ],
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss']
})
export class LoginPage {
  private authService = inject(AuthService);
  private router = inject(Router);
  
  username = '';
  password = '';
  isLoading = false;
  errorMessage = '';
  errorCode = '';
  errorRequiresAction = '';
  remainingAttempts = 5; // Track login attempts

  onSubmit() {
    if (!this.username || !this.password) {
      this.errorMessage = 'Please enter both username and password';
      this.errorCode = 'MISSING_CREDENTIALS';
      return;
    }
    
    this.isLoading = true;
    this.errorMessage = '';
    this.errorCode = '';
    
    this.authService.login(this.username, this.password).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        if (response && response.token) {
          // Reset attempts on successful login
          this.remainingAttempts = 5;
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMessage = response?.message || 'Login failed';
        }
      },
      error: (err: AuthError) => {
        this.isLoading = false;
        this.errorCode = err.code;
        this.errorMessage = err.userMessage;
        this.errorRequiresAction = err.requiresAction || '';
        
        // Track failed attempts for account locking
        this.remainingAttempts--;
        
        // Clear password field for security
        this.password = '';
        
        // Auto-focus username field
        setTimeout(() => {
          const usernameInput = document.querySelector('input[name="username"]') as HTMLInputElement;
          if (usernameInput) usernameInput.focus();
        }, 100);
      }
    });
  }

  getErrorIcon(): string {
    const icons: Record<string, string> = {
      'INVALID_CREDENTIALS': 'alert-circle-outline',
      'PASSWORD_EXPIRED': 'time-outline',
      'ACCOUNT_DISABLED': 'ban-outline',
      'ACCOUNT_EXPIRED': 'calendar-outline',
      'ACCOUNT_LOCKED': 'lock-closed-outline',
      'SERVICE_UNAVAILABLE': 'server-outline',
      'TIMEOUT': 'hourglass-outline',
      'NETWORK_ERROR': 'wifi-outline',
      'MISSING_CREDENTIALS': 'warning-outline'
    };
    return icons[this.errorCode] || 'alert-circle-outline';
  }

  getErrorClass(): string {
    const classes: Record<string, string> = {
      'PASSWORD_EXPIRED': 'error-warning',
      'ACCOUNT_LOCKED': 'error-warning',
      'SERVICE_UNAVAILABLE': 'error-info',
      'TIMEOUT': 'error-info'
    };
    return classes[this.errorCode] || 'error-danger';
  }

  contactSupport(): void {
    window.location.href = 'mailto:itsupport@arc.agric.za?subject=Procurement%20System%20Login%20Issue&body=Please%20assist%20with%20login%20issue%20for%20username:%20' + this.username;
  }

  clearError(): void {
    this.errorMessage = '';
    this.errorCode = '';
    this.errorRequiresAction = '';
  }
}