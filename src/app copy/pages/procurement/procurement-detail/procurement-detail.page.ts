import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { ProcurementService } from '../../../services/procurement';
import { AuthService } from '../../../services/auth';
import { CampusService } from '../../../services/campus';
import { Procurement, ProcurementLog } from '../../../models/procurement.model';
import { Campus } from '../../../models/campus.model';

/**
 * Procurement Detail Page Component
 * Displays detailed information about a single procurement with audit trail
 */
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
  
  // Status update fields
  selectedDateField: string = '';
  selectedDateValue: string = '';
  statusComment: string = '';
  
  // Date fields for status update
  dateFields = [
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
    private authService: AuthService,
    private campusService: CampusService,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  ngOnInit(): void {
    this.loadCampuses();
    this.loadProcurement();
  }

  /**
   * Load campuses from API
   */
  loadCampuses(): void {
    this.campusService.getAll().subscribe({
      next: (data: Campus[]) => {
        this.campuses = data;
        console.log('Campuses loaded for detail page:', this.campuses);
      },
      error: (error: any) => {
        console.error('Error loading campuses:', error);
        // Don't show error toast here as it's not critical for viewing
      }
    });
  }

  /**
   * Load procurement details
   */
  loadProcurement(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/procurements']);
      return;
    }
    
    this.isLoading = true;
    this.procurementService.getById(+id).subscribe({
      next: (procurement) => {
        this.procurement = procurement;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading procurement:', error);
        this.showToast('Failed to load procurement details', 'danger');
        this.router.navigate(['/procurements']);
      }
    });
  }

  /**
   * Toggle edit mode
   */
  toggleEdit(): void {
    this.isEditing = !this.isEditing;
  }

  /**
   * Save procurement changes
   */
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
      error: (error) => {
        console.error('Error updating procurement:', error);
        this.showToast('Failed to update procurement', 'danger');
        this.isUpdating = false;
      }
    });
  }

  /**
   * Cancel editing
   */
  cancelEdit(): void {
    this.isEditing = false;
    this.loadProcurement();
  }

  /**
   * Update status field
   */
  updateStatus(): void {
    if (!this.procurement || !this.selectedDateField) return;
    
    this.isUpdating = true;
    this.procurementService.updateStatus(
      this.procurement.id,
      this.selectedDateField,
      this.selectedDateValue || null,
      this.statusComment
    ).subscribe({
      next: (response) => {
        this.showToast(`Status updated successfully. New status: ${response.overall_status}`, 'success');
        this.isUpdating = false;
        this.selectedDateField = '';
        this.selectedDateValue = '';
        this.statusComment = '';
        this.loadProcurement();
      },
      error: (error) => {
        console.error('Error updating status:', error);
        this.showToast('Failed to update status', 'danger');
        this.isUpdating = false;
      }
    });
  }

  /**
   * Delete procurement
   */
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
            this.procurementService.delete(this.procurement!.id).subscribe({
              next: () => {
                this.showToast('Procurement deleted successfully', 'success');
                this.router.navigate(['/procurements']);
              },
              error: (error) => {
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
   * Export single procurement
   */
  exportProcurement(): void {
    if (!this.procurement) return;
    
    // Create export data in legacy format
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
    
    // Create and download CSV
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

  /**
   * Get status badge class
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
   * Format date for display
   */
  formatDate(date: any): string {
    if (!date) return '';
    return new Date(date).toISOString().split('T')[0];
  }

  /**
   * Format currency
   */
  formatCurrency(value: number): string {
    if (!value) return '-';
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(value);
  }

  /**
   * Format datetime for display
   */
  formatDateTime(date: any): string {
    if (!date) return '-';
    return new Date(date).toLocaleString('en-ZA');
  }

  /**
   * Check if user can edit
   */
  canEdit(): boolean {
    if (!this.authService.getCurrentUser()) return false;
    const role = this.authService.getCurrentUser()!.role;
    return role === 'admin' || role === 'campus_manager' || role === 'responsible_user';
  }

  /**
   * Check if user can delete
   */
  canDelete(): boolean {
    return this.authService.hasRole(['admin']);
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
   * Change active tab
   */
  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  /**
   * Get campus name for display
   */
  getCampusDisplayName(): string {
    if (!this.procurement) return '';
    // Use campus_name from procurement if available, otherwise find from campuses list
    if (this.procurement.campus_name) {
      return this.procurement.campus_name;
    }
    const campus = this.campuses.find(c => c.id === this.procurement?.campus_id);
    return campus ? (campus.campus_name || campus.name) : 'Unknown Campus';
  }
}