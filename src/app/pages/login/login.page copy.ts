import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { 
  IonContent, IonButton, IonItem, IonLabel, 
  IonText, IonIcon, IonSpinner
} from '@ionic/angular/standalone';
import { AuthService } from '../../services/auth';

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

  onSubmit() {
    if (!this.username || !this.password) {
      this.errorMessage = 'Please enter username and password';
      return;
    }
    
    this.isLoading = true;
    this.errorMessage = '';
    
    this.authService.login(this.username, this.password).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        // Check for token instead of success flag
        if (response && response.token) {
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMessage = response?.error || response?.message || 'Login failed';
        }
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMessage = err.error?.error || err.error?.message || err.message || 'Login failed. Please try again.';
        this.password = '';
      }
    });
  }
}