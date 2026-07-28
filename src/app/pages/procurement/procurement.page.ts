import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { IonicModule, ModalController, ToastController, AlertController } from '@ionic/angular';
import { ProcurementService } from '../../services/procurement';
import { AuthService } from '../../services/auth';
import { UserService } from '../../services/user';
import { CampusService } from '../../services/campus';
import { Procurement, ProcurementFilters } from '../../models/procurement.model';
import { User } from '../../models/user.model';
import { Campus } from '../../models/campus.model';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

/**
 * Procurement List Page Component
 * Displays and manages procurement records with filtering, sorting, and pagination
 */
@Component({
  selector: 'app-procurement',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, IonicModule],
  templateUrl: './procurement.page.html',
  styleUrls: ['./procurement.page.scss']
})
export class ProcurementPage implements OnInit, OnDestroy {
  // Data properties
  procurements: Procurement[] = [];
  campuses: Campus[] = [];
  users: User[] = [];
  isLoading: boolean = false;
  
  // Filter properties
  filters: ProcurementFilters = {
    page: 1,
    limit: 20,
    search: '',
    campus_id: undefined,
    status: undefined,
    sort_by: 'created_at',
    sort_order: 'desc'
  };
  
  // Pagination
  totalItems: number = 0;
  totalPages: number = 0;
  
  // Status options for filter
  statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'overdue', label: 'Overdue' }
  ];
  
  // Sort options
  sortOptions = [
    { value: 'created_at', label: 'Created Date' },
    { value: 'proc_number', label: 'Procurement Number' },
    { value: 'bid_closing', label: 'Closing Date' },
    { value: 'overall_status', label: 'Status' }
  ];
  
  // Search debouncer
  private searchSubject = new Subject<string>();
  
  // Selected procurement for modals
  selectedProcurement: Procurement | null = null;
  showAssignModal: boolean = false;
  showCommentModal: boolean = false;
  commentText: string = '';

  constructor(
    private procurementService: ProcurementService,
    public authService: AuthService,
    private userService: UserService,
    private campusService: CampusService,
    private modalController: ModalController,
    private toastController: ToastController,
    private alertController: AlertController,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Debugging logs to verify user roles and permissions
    console.log('=== ProcurementPage Debug ===');
    console.log('AuthService available:', !!this.authService);
    console.log('Current user:', this.authService.getCurrentUser());
    console.log('User role:', this.authService.getCurrentUser()?.role);
    console.log('Has admin role:', this.authService.hasRole(['admin']));
    console.log('Has campus_manager role:', this.authService.hasRole(['campus_manager']));
    console.log('Has responsible_user role:', this.authService.hasRole(['responsible_user']));
    
    this.loadCampuses();
    this.loadProcurements();
    this.loadUsers();
    this.setupSearchDebounce();
  }

  ngOnDestroy(): void {
    this.searchSubject.complete();
  }

  /**
   * Load campuses from API
   */
  loadCampuses(): void {
    this.campusService.getAll().subscribe({
      next: (data: Campus[]) => {
        this.campuses = data;
        console.log('Campuses loaded for procurement page:', this.campuses);
      },
      error: (error: any) => {
        console.error('Error loading campuses:', error);
        this.showToast('Failed to load campuses', 'warning');
      }
    });
  }

  /**
   * Setup search input debounce to avoid excessive API calls
   */
  setupSearchDebounce(): void {
    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(searchTerm => {
      this.filters.search = searchTerm;
      this.filters.page = 1;
      this.loadProcurements();
    });
  }

  /**
   * Load procurements with current filters
   */
  loadProcurements(): void {
    this.isLoading = true;
    this.procurementService.getAll(this.filters).subscribe({
      next: (response: any) => {
        console.log('Procurements loaded:', response.data?.length || 0, 'records');
        this.procurements = response.data;
        this.totalItems = response.pagination.total;
        this.totalPages = response.pagination.totalPages;
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading procurements:', error);
        this.showToast('Failed to load procurements', 'danger');
        this.isLoading = false;
      }
    });
  }

  /**
   * Load users for assignment dropdown
   */
  loadUsers(): void {
    this.userService.getUsersByRole('responsible_user').subscribe({
      next: (users: User[]) => {
        console.log('Users loaded:', users.length);
        this.users = users;
      },
      error: (error: any) => {
        console.error('Error loading users:', error);
      }
    });
  }

  /**
   * Handle search input change
   */
  onSearchChange(event: any): void {
    this.searchSubject.next(event.target.value);
  }

  /**
   * Apply filters and reload data
   */
  applyFilters(): void {
    this.filters.page = 1;
    this.loadProcurements();
  }

  /**
   * Reset all filters
   */
  resetFilters(): void {
    this.filters = {
      page: 1,
      limit: 20,
      search: '',
      campus_id: undefined,
      status: undefined,
      sort_by: 'created_at',
      sort_order: 'desc'
    };
    this.loadProcurements();
  }

  /**
   * Change page
   */
  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.filters.page = page;
    this.loadProcurements();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Change sort order
   */
  changeSort(): void {
    this.filters.page = 1;
    this.loadProcurements();
  }

  /**
   * Toggle sort order (asc/desc)
   */
  toggleSortOrder(): void {
    this.filters.sort_order = this.filters.sort_order === 'desc' ? 'asc' : 'desc';
    this.loadProcurements();
  }

  /**
   * Delete procurement after confirmation
   * @param procurement - Procurement to delete
   */
  async deleteProcurement(procurement: Procurement): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Confirm Delete',
      message: `Are you sure you want to delete procurement ${procurement.proc_number}? This action cannot be undone.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { 
          text: 'Delete', 
          role: 'destructive',
          handler: () => {
            this.procurementService.delete(procurement.id).subscribe({
              next: () => {
                this.showToast('Procurement deleted successfully', 'success');
                this.loadProcurements();
              },
              error: (error: any) => {
                console.error('Error deleting procurement:', error);
                this.showToast('Failed to delete procurement', 'danger');
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  /**
   * Open assign user modal
   * @param procurement - Procurement to assign user to
   */
  openAssignModal(procurement: Procurement): void {
    this.selectedProcurement = procurement;
    this.showAssignModal = true;
  }

  /**
   * Assign user to procurement
   * @param userId - User ID to assign
   */
  assignUser(userId: number): void {
    if (!this.selectedProcurement) return;
    
    this.procurementService.assignUser(this.selectedProcurement.id, userId).subscribe({
      next: () => {
        this.showToast('User assigned successfully', 'success');
        this.showAssignModal = false;
        this.loadProcurements();
      },
      error: (error: any) => {
        console.error('Error assigning user:', error);
        this.showToast('Failed to assign user', 'danger');
      }
    });
  }

  /**
   * Open add comment modal
   * @param procurement - Procurement to add comment to
   */
  openCommentModal(procurement: Procurement): void {
    this.selectedProcurement = procurement;
    this.commentText = '';
    this.showCommentModal = true;
  }

  /**
   * Add comment to procurement
   */
  addComment(): void {
    if (!this.selectedProcurement || !this.commentText.trim()) return;
    
    const currentUser = this.authService.getCurrentUser();
    const comment = `[${new Date().toLocaleString()}] ${currentUser?.name}: ${this.commentText}`;
    const currentComments = this.selectedProcurement.comments || '';
    const newComments = currentComments ? currentComments + '\n' + comment : comment;
    
    this.procurementService.update(this.selectedProcurement.id, { comments: newComments }).subscribe({
      next: () => {
        this.showToast('Comment added successfully', 'success');
        this.showCommentModal = false;
        this.loadProcurements();
      },
      error: (error: any) => {
        console.error('Error adding comment:', error);
        this.showToast('Failed to add comment', 'danger');
      }
    });
  }

  /**
   * Get status badge class
   * @param status - Procurement status
   * @returns CSS class name
   */
  getStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      'pending': 'status-pending',
      'in_progress': 'status-progress',
      'completed': 'status-completed',
      'overdue': 'status-overdue'
    };
    return classes[status] || '';
  }

  /**
   * Get campus name by ID
   * @param campusId - Campus ID
   * @returns Campus name
   */
  getCampusName(campusId: number): string {
    if (!campusId) return 'Not specified';
    const campus = this.campuses.find(c => c.id === campusId);
    return campus ? (campus.campus_name || campus.name) : `Campus ${campusId}`;
  }

  /**
   * Format date for display
   * @param date - Date to format
   * @returns Formatted date string
   */
  formatDate(date: any): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-ZA');
  }

  /**
   * Format currency
   * @param value - Amount to format
   * @returns Formatted currency string
   */
  formatCurrency(value: number): string {
    if (!value) return '-';
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(value);
  }

  /**
   * Show toast message
   * @param message - Message to display
   * @param color - Toast color
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
   * Get page numbers for pagination display
   * @returns Array of page numbers
   */
  getPageNumbers(): (number | string)[] {
    const pages: (number | string)[] = [];
    const currentPage = this.filters.page || 1;
    const total = this.totalPages;
    
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(total - 1, currentPage + 1);
      
      if (currentPage <= 3) {
        start = 2;
        end = 4;
      }
      if (currentPage >= total - 2) {
        start = total - 3;
        end = total - 1;
      }
      
      for (let i = start; i <= end; i++) pages.push(i);
      
      if (currentPage < total - 2) pages.push('...');
      pages.push(total);
    }
    
    return pages;
  }

  /**
   * View procurement details
   * @param id - Procurement ID
   */
  viewProcurement(id: number): void {
    this.router.navigate(['/procurements', id]);
  }
}