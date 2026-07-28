import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule, ToastController } from '@ionic/angular';
import { AuthService } from '../../services/auth';
import { environment } from '../../../environments/environment';

/**
 * Login Page Component
 * Handles user authentication with Active Directory simulation
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss']
})
export class LoginPage {
  username: string = '';
  password: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';
  showDemo: boolean = !environment.production;

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController
  ) {}

  /**
   * Handle form submission for login
   */
  async onSubmit(): Promise<void> {
    // Validate input
    if (!this.username || !this.password) {
      this.errorMessage = 'Please enter username and password';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    
    this.authService.login(this.username, this.password).subscribe({
      next: () => {
        // Navigate to dashboard on success
        this.router.navigate(['/dashboard']);
      },
      error: async (error: any) => {
        this.isLoading = false;
        this.errorMessage = error.error?.error || 'Login failed. Please check your credentials.';
        
        // Show error toast
        const toast = await this.toastController.create({
          message: this.errorMessage,
          duration: 3000,
          color: 'danger',
          position: 'top'
        });
        toast.present();
      }
    });
  }

  /**
   * Fill demo credentials for quick testing
   * @param role - Demo role to fill
   */
fillDemoCredentials(role: string): void {
  switch(role) {
    case 'admin':
      this.username = 'ncubez@arc.agric.za';
      this.password = 'Admin123';
      break;
    case 'manager':
      this.username = 'arc.agricloud@gmail.com';
      this.password = 'Manager123';
      break;
    case 'user':
      this.username = 'ncubez@arc.agric.za';
      this.password = 'User123';
      break;
  }
}
}