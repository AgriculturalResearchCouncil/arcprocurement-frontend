import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { ProcurementService, Procurement, UpdateStatusResponse } from '../../../services/procurement';
import { AuthService } from '../../../services/auth';
import { CampusService } from '../../../services/campus';
import { Campus } from '../../../models/campus.model';
import { UserService } from '../../../services/user';
import { User } from '../../../models/user.model'; 

interface DateField {
  value: string;
  label: string;
}

@Component({
  selector: 'app-procurement-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './procurement-detail.page.html',
  styleUrls: ['./procurement-detail.page.scss']
})
export class ProcurementDetailPage implements OnInit {
  procurement: Procurement | null = null;
  campuses: Campus[] = [];
  isLoading: boolean = true;
  isEditing: boolean = false;
  isUpdating: boolean = false;
  activeTab: string = 'details';
  
  selectedDateField: string = '';
  selectedDateValue: string = '';
  statusComment: string = '';
  
  // Responsible user assignment
  selectedResponsibleUserId: number | null = null;
  responsibleUsers: User[] = [];
  userSearchTerm: string = '';
  isSearchingUsers: boolean = false;
  showUserSearch: boolean = false;
  isLoadingUsers: boolean = false;
  
  dateFields: DateField[] = [
    { value: 'bid_specification', label: 'Bid Specification Date' },
    { value: 'advert', label: 'Advert Date' },
    { value: 'bid_closing', label: 'Bid Closing Date' },
    { value: 'bid_evaluation', label: 'Bid Evaluation Date' },
    { value: 'bid_award', label: 'Bid Award Date' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private procurementService: ProcurementService,
    public authService: AuthService,
    private campusService: CampusService,
    private userService: UserService,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  ngOnInit(): void {
    this.loadCampuses();
    this.loadProcurement();
    this.checkAuthStatus();
  }

  checkAuthStatus(): void {
    const token = this.authService.getToken();
    const user = this.authService.getCurrentUser();
    
    console.log('=== AUTH STATUS DEBUG ===');
    console.log('Token exists:', !!token);
    if (token) {
      console.log('Token preview:', token.substring(0, 30) + '...');
    }
    console.log('User exists:', !!user);
    console.log('User role:', user?.role);
    console.log('Can edit:', this.canEdit());
    console.log('========================');
  }

  loadCampuses(): void {
    this.campusService.getAll().subscribe({
      next: (data: Campus[]) => {
        this.campuses = data;
        console.log('Campuses loaded for detail page:', this.campuses.length);
      },
      error: (error: Error) => {
        console.error('Error loading campuses:', error);
        this.campuses = [];
      }
    });
  }

  loadProcurement(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
        this.router.navigate(['/procurements']);
        return;
    }
    
    const id = parseInt(idParam, 10);
    this.isLoading = true;
    
    this.procurementService.getById(id).subscribe({
        next: (procurement: Procurement) => {
            // Load users first to map IDs to names
            this.userService.getAll().subscribe({
                next: (users: User[]) => {
                    // Create a user map
                    const userMap = new Map<number, string>();
                    users.forEach(user => {
                        userMap.set(user.id, user.name);
                    });
                    
                    // Transform audit logs to show names instead of IDs
                    if (procurement.logs) {
                        procurement.logs = procurement.logs.map(log => {
                            if (log.field_changed === 'responsible_user_id') {
                                // Try to convert old_value and new_value from ID to name
                                const oldId = parseInt(log.old_value);
                                const newId = parseInt(log.new_value);
                                
                                if (!isNaN(oldId) && userMap.has(oldId)) {
                                    log.old_value = userMap.get(oldId) || log.old_value;
                                }
                                if (!isNaN(newId) && userMap.has(newId)) {
                                    log.new_value = userMap.get(newId) || log.new_value;
                                }
                            }
                            return log;
                        });
                    }
                    
                    this.procurement = procurement;
                    this.isLoading = false;
                    console.log('Procurement loaded with resolved user names:', procurement);
                    this.loadResponsibleUsers();
                },
                error: (error: Error) => {
                    console.error('Error loading users for mapping:', error);
                    this.procurement = procurement;
                    this.isLoading = false;
                    this.loadResponsibleUsers();
                }
            });
        },
        error: (error: Error & { status?: number }) => {
            console.error('Error loading procurement:', error);
            
            if (error.status === 401 || error.status === 403) {
                this.showToast('Session expired. Please login again.', 'danger');
                this.authService.logout();
            } else {
                this.showToast('Failed to load procurement details', 'danger');
                this.router.navigate(['/procurements']);
            }
        }
    });
}

  // loadProcurement(): void {
  //   const idParam = this.route.snapshot.paramMap.get('id');
  //   if (!idParam) {
  //     this.router.navigate(['/procurements']);
  //     return;
  //   }
    
  //   const id = parseInt(idParam, 10);
  //   this.isLoading = true;
    
  //   this.procurementService.getById(id).subscribe({
  //     next: (procurement: Procurement) => {
  //       this.procurement = procurement;
  //       this.isLoading = false;
  //       console.log('Procurement loaded:', procurement);
  //       this.loadResponsibleUsers();
  //     },
  //     error: (error: Error & { status?: number }) => {
  //       console.error('Error loading procurement:', error);
        
  //       if (error.status === 401 || error.status === 403) {
  //         this.showToast('Session expired. Please login again.', 'danger');
  //         this.authService.logout();
  //       } else {
  //         this.showToast('Failed to load procurement details', 'danger');
  //         this.router.navigate(['/procurements']);
  //       }
  //     }
  //   });
  // }

  /**
   * Load responsible users from database
   */

loadResponsibleUsers(): void {
    this.isLoadingUsers = true;
    
    // Use getUsersByRole which is already working
    this.userService.getUsersByRole('responsible_user').subscribe({
        next: (users: User[]) => {
            console.log('Responsible users loaded:', users);
            
            // Filter by campus if needed
            let filteredUsers = users;
            if (this.procurement?.campus_id) {
                filteredUsers = users.filter(user => 
                    !user.campus_id || user.campus_id === this.procurement?.campus_id
                );
                console.log(`Filtered to ${filteredUsers.length} users for campus ${this.procurement.campus_id}`);
            }
            
            this.responsibleUsers = filteredUsers;
            this.isLoadingUsers = false;
            
            if (this.procurement?.responsible_user_id) {
                this.selectedResponsibleUserId = this.procurement.responsible_user_id;
            }
        },
        error: (error: Error) => {
            console.error('Error loading responsible users:', error);
            this.responsibleUsers = [];
            this.isLoadingUsers = false;
            this.showToast('Failed to load users', 'danger');
        }
    });
}

  // loadResponsibleUsers(): void {
  //   this.isLoadingUsers = true;
    
  //   // Use getAvailableUsers method
  //   this.userService.getAvailableUsers({ 
  //     role: 'responsible_user',
  //     campus_id: this.procurement?.campus_id 
  //   }).subscribe({
  //     next: (users: User[]) => {
  //       this.responsibleUsers = users;
  //       this.isLoadingUsers = false;
  //       console.log('Responsible users loaded:', users.length);
        
  //       if (this.procurement?.responsible_user_id) {
  //         this.selectedResponsibleUserId = this.procurement.responsible_user_id;
  //       }
  //     },
  //     error: (error: Error) => {
  //       console.error('Error loading responsible users:', error);
  //       this.responsibleUsers = [];
  //       this.isLoadingUsers = false;
  //       // Fallback to getUsersByRole if getAvailableUsers fails
  //       this.userService.getUsersByRole('responsible_user').subscribe({
  //         next: (users: User[]) => {
  //           this.responsibleUsers = users;
  //           console.log('Responsible users loaded via fallback:', users.length);
  //         },
  //         error: (fallbackError: Error) => {
  //           console.error('Fallback also failed:', fallbackError);
  //         }
  //       });
  //     }
  //   });
  // }

  /**
   * Search users from Active Directory in real-time
   */
  searchADUsers(): void {
    if (!this.userSearchTerm || this.userSearchTerm.length < 2) {
      this.showToast('Please enter at least 2 characters to search', 'warning');
      return;
    }
    
    this.isSearchingUsers = true;
    
    this.userService.searchADUsers(this.userSearchTerm).subscribe({
      next: (users: User[]) => {
        console.log('AD search results:', users);
        
        const existingIds = new Set(this.responsibleUsers.map(u => u.id.toString()));
        const newUsers = users.filter(u => !existingIds.has(u.id.toString()));
        
        this.responsibleUsers = [...this.responsibleUsers, ...newUsers];
        this.isSearchingUsers = false;
        
        if (users.length === 0) {
          this.showToast('No users found in Active Directory', 'warning');
        } else {
          this.showToast(`Found ${users.length} user(s) from Active Directory. Select from dropdown.`, 'success');
        }
        
        this.userSearchTerm = '';
        this.showUserSearch = false;
      },
      error: (error: Error) => {
        console.error('Error searching AD users:', error);
        this.isSearchingUsers = false;
        this.showToast('Failed to search Active Directory', 'danger');
      }
    });
  }

  /**
   * Sync users from Active Directory to database
   */
  async syncADUsers(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Sync Active Directory',
      message: 'This will import all responsible users from Active Directory to the local database. Continue?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { 
          text: 'Sync', 
          handler: () => {
            this.isLoadingUsers = true;
            this.userService.syncADUsers().subscribe({
              next: (response: { synced: number; updated: number; message: string }) => {
                console.log('Sync response:', response);
                this.showToast(`Synced ${response.synced} new users, updated ${response.updated} existing users`, 'success');
                this.loadResponsibleUsers();
                this.isLoadingUsers = false;
              },
              error: (error: Error) => {
                console.error('Error syncing AD users:', error);
                this.showToast('Failed to sync Active Directory users', 'danger');
                this.isLoadingUsers = false;
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  /**
   * Assign responsible user
   */
  assignResponsibleUser(): void {
    if (!this.procurement || !this.selectedResponsibleUserId) {
      this.showToast('Please select a user to assign', 'warning');
      return;
    }
    
    this.isUpdating = true;
    
    console.log('Assigning user:', {
      procurementId: this.procurement.id,
      userId: this.selectedResponsibleUserId
    });
    
    this.procurementService.assignUser(this.procurement.id, this.selectedResponsibleUserId).subscribe({
      next: () => {
        this.showToast('Responsible user assigned successfully', 'success');
        this.isUpdating = false;
        this.isEditing = false;
        this.showUserSearch = false;
        this.userSearchTerm = '';
        this.loadProcurement();
      },
      error: (error: Error & { status?: number; error?: { error?: string } }) => {
        console.error('Error assigning user:', error);
        
        if (error.status === 401 || error.status === 403) {
          this.showToast('Session expired. Please login again.', 'danger');
          this.authService.logout();
        } else {
          const errorMessage = error.error?.error || 'Failed to assign user';
          this.showToast(errorMessage, 'danger');
        }
        this.isUpdating = false;
      }
    });
  }

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
    if (this.isEditing) {
      this.loadResponsibleUsers();
    }
  }

  saveChanges(): void {
    if (!this.procurement) return;
    
    this.isUpdating = true;
    this.procurementService.update(this.procurement.id, this.procurement).subscribe({
      next: () => {
        this.showToast('Procurement updated successfully', 'success');
        this.isEditing = false;
        this.isUpdating = false;
        this.loadProcurement();
      },
      error: (error: Error & { status?: number }) => {
        console.error('Error updating procurement:', error);
        
        if (error.status === 401 || error.status === 403) {
          this.showToast('Session expired. Please login again.', 'danger');
          this.authService.logout();
        } else {
          this.showToast('Failed to update procurement', 'danger');
        }
        this.isUpdating = false;
      }
    });
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.loadProcurement();
  }

  updateStatus(): void {
  if (!this.procurement || !this.selectedDateField) {
    console.warn('No procurement or date field selected');
    this.showToast('Please select a date field to update', 'warning');
    return;
  }
  
  this.isUpdating = true;
  
  // Prepare the update data
  const updateData: any = {
    [this.selectedDateField]: this.selectedDateValue || null,
    comment: this.statusComment || null
  };
  
  console.log('Updating status with data:', updateData);
  console.log('Procurement ID:', this.procurement.id);
  console.log('Selected field:', this.selectedDateField);
  console.log('Selected value:', this.selectedDateValue);
  
  this.procurementService.updateStatus(
    this.procurement.id,
    this.selectedDateField,
    this.selectedDateValue || null,
    this.statusComment
  ).subscribe({
    next: (response: UpdateStatusResponse) => {
      console.log('Status update response:', response);
      this.showToast(`Status updated successfully. New status: ${response.overall_status}`, 'success');
      this.isUpdating = false;
      this.selectedDateField = '';
      this.selectedDateValue = '';
      this.statusComment = '';
      this.loadProcurement(); // Reload to get fresh data
    },
    error: (error: any) => {
      console.error('Error updating status - Full error:', error);
      
      // Check for specific error types
      if (error.status === 401) {
        this.showToast('Session expired. Please login again.', 'danger');
        this.authService.logout();
        this.router.navigate(['/login']);
      } else if (error.status === 403) {
        this.showToast('You do not have permission to update this procurement', 'danger');
      } else if (error.status === 400) {
        // Bad request - show the error message from server
        const errorMessage = error.error?.error || error.error?.message || 'Invalid data provided';
        this.showToast(errorMessage, 'warning');
      } else if (error.status === 404) {
        this.showToast('Procurement not found', 'danger');
        this.router.navigate(['/procurements']);
      } else {
        const errorMessage = error.error?.error || error.error?.message || 'Failed to update status';
        this.showToast(errorMessage, 'danger');
      }
      this.isUpdating = false;
    }
  });
}

  // updateStatus(): void {
  //   if (!this.procurement || !this.selectedDateField) {
  //     console.warn('No procurement or date field selected');
  //     return;
  //   }
    
  //   this.isUpdating = true;
    
  //   this.procurementService.updateStatus(
  //     this.procurement.id,
  //     this.selectedDateField,
  //     this.selectedDateValue || null,
  //     this.statusComment
  //   ).subscribe({
  //     next: (response: UpdateStatusResponse) => {
  //       this.showToast(`Status updated successfully. New status: ${response.overall_status}`, 'success');
  //       this.isUpdating = false;
  //       this.selectedDateField = '';
  //       this.selectedDateValue = '';
  //       this.statusComment = '';
  //       this.loadProcurement();
  //     },
  //     error: (error: Error & { status?: number; error?: { error?: string } }) => {
  //       console.error('Error updating status:', error);
        
  //       if (error.status === 401 || error.status === 403) {
  //         this.showToast('Session expired. Please login again.', 'danger');
  //         this.authService.logout();
  //       } else {
  //         const errorMessage = error.error?.error || 'Failed to update status';
  //         this.showToast(errorMessage, 'danger');
  //       }
  //       this.isUpdating = false;
  //     }
  //   });
  // }

  async deleteProcurement(): Promise<void> {
    if (!this.procurement) return;
    
    const alert = await this.alertController.create({
      header: 'Confirm Delete',
      message: `Are you sure you want to delete procurement ${this.procurement.proc_number}? This action cannot be undone.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { 
          text: 'Delete', 
          role: 'destructive',
          handler: () => {
            if (!this.procurement) return;
            this.procurementService.delete(this.procurement.id).subscribe({
              next: () => {
                this.showToast('Procurement deleted successfully', 'success');
                this.router.navigate(['/procurements']);
              },
              error: (error: Error & { status?: number }) => {
                console.error('Error deleting procurement:', error);
                
                if (error.status === 401 || error.status === 403) {
                  this.showToast('Session expired. Please login again.', 'danger');
                  this.authService.logout();
                } else {
                  this.showToast('Failed to delete procurement', 'danger');
                }
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  exportProcurement(): void {
    if (!this.procurement) return;
    
    const exportData = [{
      'No': this.procurement.proc_number,
      'Project Description': this.procurement.project_description,
      'Programme': this.procurement.programme || '',
      'Name of Institute': this.procurement.name_of_institute || '',
      'Estimated Value': this.procurement.estimated_value || 0,
      'Method of Procurement': this.procurement.method_of_procurement || '',
      'Bid Specification': this.formatDate(this.procurement.bid_specification),
      'Advert': this.formatDate(this.procurement.advert),
      'Bid Closing': this.formatDate(this.procurement.bid_closing),
      'Bid Evaluation': this.formatDate(this.procurement.bid_evaluation),
      'Bid Award': this.formatDate(this.procurement.bid_award)
    }];
    
    const headers = Object.keys(exportData[0]);
    const csv = [
      headers.join(','),
      ...exportData.map(row => headers.map(h => JSON.stringify(row[h as keyof typeof row])).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.procurement.proc_number}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    this.showToast('Export started', 'success');
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'pending': 'status-pending',
      'in_progress': 'status-progress',
      'completed': 'status-completed',
      'overdue': 'status-overdue'
    };
    return classes[status] || '';
  }

  formatDate(date: string | null): string {
    if (!date) return '';
    return new Date(date).toISOString().split('T')[0];
  }

  formatCurrency(value: number): string {
    if (!value) return '-';
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(value);
  }

  formatDateTime(date: string | null): string {
    if (!date) return '-';
    return new Date(date).toLocaleString('en-ZA');
  }

  canEdit(): boolean {
    const user = this.authService.getCurrentUser();
    if (!user) return false;
    return user.role === 'admin' || user.role === 'campus_manager' || user.role === 'responsible_user';
  }

  canDelete(): boolean {
    return this.authService.hasRole(['admin']);
  }

  async showToast(message: string, color: string = 'primary'): Promise<void> {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      color: color,
      position: 'bottom'
    });
    toast.present();
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  getCampusDisplayName(): string {
    if (!this.procurement) return '';
    if (this.procurement.campus_name) {
      return this.procurement.campus_name;
    }
    const campus = this.campuses.find(c => c.id === this.procurement?.campus_id);
    return campus ? (campus.campus_name || campus.name) : 'Unknown Campus';
  }
}