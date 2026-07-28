import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, AlertController, ModalController } from '@ionic/angular';
import { UserService } from '../../services/user';
import { AuthService } from '../../services/auth';
import { CampusService } from '../../services/campus';
import { User } from '../../models/user.model';
import { Campus } from '../../models/campus.model';

/**
 * User Management Page Component
 * Handles user CRUD operations and role management
 */
@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './user-management.page.html',
  styleUrls: ['./user-management.page.scss']
})
export class UserManagementPage implements OnInit {
  users: User[] = [];
  campuses: Campus[] = [];
  isLoading: boolean = true;
  isEditing: boolean = false;
  isCreating: boolean = false;
  
  // Form data
  currentUser: User | null = null;
  formData: any = {
    name: '',
    email: '',
    password: '',
    role: '',
    campus_id: null,
    business_unit: ''
  };
  
  // Role options
  roleOptions = [
    { value: 'admin', label: 'Administrator' },
    { value: 'approver', label: 'Approver' },
    { value: 'campus_manager', label: 'Campus Manager' },
    { value: 'responsible_user', label: 'Responsible User' },
    { value: 'viewer', label: 'Viewer' }
  ];
  
  // Search
  searchTerm: string = '';
  roleFilter: string = '';

  constructor(
    private userService: UserService,
    public authService: AuthService,
    private campusService: CampusService,
    private toastController: ToastController,
    private alertController: AlertController,
    private modalController: ModalController
  ) {}

  ngOnInit(): void {
    this.loadCampuses();
    this.loadUsers();
  }

  /**
   * Load campuses from API
   */
  loadCampuses(): void {
    this.campusService.getAll().subscribe({
      next: (data: Campus[]) => {
        this.campuses = data;
        console.log('Campuses loaded for user management:', this.campuses);
      },
      error: (error: any) => {
        console.error('Error loading campuses:', error);
        this.showToast('Failed to load campuses', 'warning');
      }
    });
  }

  /**
   * Load all users
   */
  loadUsers(): void {
    this.isLoading = true;
    
    // Use getAll with filters if available, otherwise just get all
    if (this.searchTerm || this.roleFilter) {
      this.userService.getAvailableUsers({ 
        search: this.searchTerm,
        role: this.roleFilter 
      }).subscribe({
        next: (users: User[]) => {
          this.users = users;
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('Error loading filtered users:', error);
          this.loadAllUsers();
        }
      });
    } else {
      this.loadAllUsers();
    }
  }

  /**
   * Load all users without filters
   */
  loadAllUsers(): void {
    this.userService.getAll().subscribe({
      next: (users: User[]) => {
        this.users = users;
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading users:', error);
        this.showToast('Failed to load users', 'danger');
        this.isLoading = false;
        this.users = [];
      }
    });
  }

  /**
   * Apply filters
   */
  applyFilters(): void {
    this.loadUsers();
  }

  /**
   * Reset filters
   */
  resetFilters(): void {
    this.searchTerm = '';
    this.roleFilter = '';
    this.loadUsers();
  }

  /**
   * Open create user modal
   */
  openCreateModal(): void {
    this.isCreating = true;
    this.isEditing = false;
    this.formData = {
      name: '',
      email: '',
      password: '',
      role: '',
      campus_id: null,
      business_unit: ''
    };
  }

  /**
   * Open edit user modal
   * @param user - User to edit
   */
  openEditModal(user: User): void {
    this.currentUser = user;
    this.isEditing = true;
    this.isCreating = false;
    this.formData = {
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      campus_id: user.campus_id,
      business_unit: user.business_unit || ''
    };
  }

  /**
   * Close modal
   */
  closeModal(): void {
    this.isCreating = false;
    this.isEditing = false;
    this.currentUser = null;
    this.formData = {
      name: '',
      email: '',
      password: '',
      role: '',
      campus_id: null,
      business_unit: ''
    };
  }

  /**
   * Save user (create or update)
   */
  async saveUser(): Promise<void> {
    // Validate form
    if (!this.formData.name || !this.formData.email || !this.formData.role) {
      this.showToast('Please fill in all required fields', 'warning');
      return;
    }
    
    if (this.isCreating && !this.formData.password) {
      this.showToast('Password is required for new users', 'warning');
      return;
    }
    
    if (this.isCreating) {
      // Create new user
      this.userService.create(this.formData).subscribe({
        next: () => {
          this.showToast('User created successfully', 'success');
          this.closeModal();
          this.loadUsers();
        },
        error: (error: any) => {
          console.error('Error creating user:', error);
          this.showToast(error.error?.error || 'Failed to create user', 'danger');
        }
      });
    } else if (this.currentUser) {
      // Update existing user
      const updateData: any = {
        name: this.formData.name,
        email: this.formData.email,
        role: this.formData.role,
        campus_id: this.formData.campus_id,
        business_unit: this.formData.business_unit
      };
      
      if (this.formData.password) {
        updateData.password = this.formData.password;
      }
      
      this.userService.update(this.currentUser.id, updateData).subscribe({
        next: () => {
          this.showToast('User updated successfully', 'success');
          this.closeModal();
          this.loadUsers();
        },
        error: (error: any) => {
          console.error('Error updating user:', error);
          this.showToast(error.error?.error || 'Failed to update user', 'danger');
        }
      });
    }
  }

  /**
   * Delete user after confirmation
   * @param user - User to delete
   */
  async deleteUser(user: User): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Confirm Delete',
      message: `Are you sure you want to delete user ${user.name}? This action cannot be undone.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { 
          text: 'Delete', 
          role: 'destructive',
          handler: () => {
            this.userService.delete(user.id).subscribe({
              next: () => {
                this.showToast('User deleted successfully', 'success');
                this.loadUsers();
              },
              error: (error: any) => {
                console.error('Error deleting user:', error);
                this.showToast('Failed to delete user', 'danger');
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  /**
   * Get role badge class
   * @param role - User role
   * @returns CSS class name
   */
  getRoleClass(role: string): string {
    const classes: { [key: string]: string } = {
      'admin': 'role-admin',
      'approver': 'role-approver',
      'campus_manager': 'role-manager',
      'responsible_user': 'role-user',
      'viewer': 'role-viewer'
    };
    return classes[role] || '';
  }

  /**
   * Get role display name
   * @param role - User role
   * @returns Display name
   */
  getRoleDisplay(role: string): string {
    const display: { [key: string]: string } = {
      'admin': 'Administrator',
      'approver': 'Approver',
      'campus_manager': 'Campus Manager',
      'responsible_user': 'Responsible User',
      'viewer': 'Viewer'
    };
    return display[role] || role;
  }

  /**
   * Show toast message
   */
  async showToast(message: string, color: string = 'primary'): Promise<void> {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      color: color,
      position: 'bottom'
    });
    toast.present();
  }

  /**
   * Check if current user can edit/delete
   */
  canModifyUser(user: User): boolean {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return false;
    
    // Admin can modify all users
    if (currentUser.role === 'admin') return true;
    
    // Campus managers can only modify users in their campus
    if (currentUser.role === 'campus_manager') {
      return user.campus_id === currentUser.campus_id;
    }
    
    return false;
  }

  /**
   * Get campus name by ID - handles undefined/null values
   * @param campusId - Campus ID (can be number, null, or undefined)
   * @returns Campus name or fallback text
   */
  getCampusName(campusId: number | null | undefined): string {
    if (!campusId) return 'Not Assigned';
    const campus = this.campuses.find(c => c.id === campusId);
    return campus ? (campus.campus_name || campus.name) : 'Unknown Campus';
  }
}