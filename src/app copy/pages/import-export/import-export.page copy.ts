import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { ImportExportService } from '../../services/import-export';
import { ProcurementService } from '../../services/procurement';
import { AuthService } from '../../services/auth';
import { Campus, ARC_CAMPUSES } from '../../models/campus.model';

export interface TenderRow {
  id: number;
  proc_number: string;
  project_description: string;
  programme: string;
  name_of_institute: string;
  estimated_value: number | undefined;
  method_of_procurement: string;
  bid_specification: string;
  advert: string;
  bid_closing: string;
  bid_evaluation: string;
  bid_award: string;
  campus_id: number | null;
  business_unit: string;
  isValid: boolean;
}

@Component({
  selector: 'app-import-export',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './import-export.page.html',
  styleUrls: ['./import-export.page.scss']
})
export class ImportExportPage implements OnInit {
  // Import properties
  selectedFile: File | null = null;
  isUploading: boolean = false;
  importResult: any = null;
  
  // Export properties
  exportFilters = {
    campus_id: undefined as number | undefined,
    date_from: '',
    date_to: '',
    status: ''
  };
  campuses: Campus[] = ARC_CAMPUSES;
  isExporting: boolean = false;
  
  // Manual Entry - Multiple Rows
  tenderRows: TenderRow[] = [];
  nextId: number = 1;
  isSubmitting: boolean = false;
  
  // Method of procurement options
  procurementMethods = [
    'Open Tender',
    'Closed Tender',
    'Request for Proposal (RFP)',
    'Request for Quotation (RFQ)',
    'Single Source',
    'Emergency Procurement',
    'Framework Agreement'
  ];
  
  // Import history
  importHistory: any[] = [];
  historyPage: number = 1;
  historyTotal: number = 0;
  historyTotalPages: number = 0;
  isLoadingHistory: boolean = false;
  
  statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'overdue', label: 'Overdue' }
  ];

  constructor(
    private importExportService: ImportExportService,
    private procurementService: ProcurementService,
    private authService: AuthService,
    private toastController: ToastController,
    private alertController: AlertController
  ) {
    // Initialize with one empty row
    this.addNewRow();
  }

  ngOnInit(): void {
    this.loadImportHistory();
  }

  // ==================== MANUAL ENTRY METHODS ====================
  
  /**
   * Add a new empty row to the table
   */
  addNewRow(): void {
    const newRow: TenderRow = {
      id: this.nextId++,
      proc_number: '',
      project_description: '',
      programme: '',
      name_of_institute: '',
      estimated_value: undefined,
      method_of_procurement: '',
      bid_specification: '',
      advert: '',
      bid_closing: '',
      bid_evaluation: '',
      bid_award: '',
      campus_id: null,
      business_unit: '',
      isValid: false
    };
    this.tenderRows.push(newRow);
  }

  /**
   * Remove a row from the table
   * @param index - Index of row to remove
   */
  removeRow(index: number): void {
    if (this.tenderRows.length > 1) {
      this.tenderRows.splice(index, 1);
    } else {
      this.showToast('Cannot remove the last row. Add at least one row.', 'warning');
    }
  }

  /**
   * Duplicate a row (copy all values to a new row)
   * @param index - Index of the row to duplicate
   */
  duplicateRow(index: number): void {
    const originalRow = this.tenderRows[index];
    const newRow: TenderRow = {
      id: this.nextId++,
      proc_number: originalRow.proc_number,
      project_description: originalRow.project_description,
      programme: originalRow.programme,
      name_of_institute: originalRow.name_of_institute,
      estimated_value: originalRow.estimated_value,
      method_of_procurement: originalRow.method_of_procurement,
      bid_specification: originalRow.bid_specification,
      advert: originalRow.advert,
      bid_closing: originalRow.bid_closing,
      bid_evaluation: originalRow.bid_evaluation,
      bid_award: originalRow.bid_award,
      campus_id: originalRow.campus_id,
      business_unit: originalRow.business_unit,
      isValid: originalRow.isValid
    };
    
    // Insert after the original row
    this.tenderRows.splice(index + 1, 0, newRow);
    
    this.showToast('Row duplicated successfully', 'success');
  }

  /**
   * Validate a single row
   * @param row - The row to validate
   * @returns Whether the row is valid
   */
  validateRow(row: TenderRow): boolean {
    row.isValid = !!(
      row.proc_number &&
      row.project_description &&
      row.campus_id &&
      row.method_of_procurement
    );
    return row.isValid;
  }

  /**
   * Check if a row has partial data (some fields filled but not all required)
   * @param row - The tender row to check
   * @returns Whether the row has partial data
   */
  hasPartialData(row: TenderRow): boolean {
    // Check if any field has a value (not empty)
    const hasAnyValue = !!(
      row.proc_number ||
      row.project_description ||
      row.programme ||
      row.name_of_institute ||
      row.estimated_value ||
      row.method_of_procurement ||
      row.bid_specification ||
      row.advert ||
      row.bid_closing ||
      row.bid_evaluation ||
      row.bid_award ||
      row.campus_id ||
      row.business_unit
    );
    
    // If it has any value but is not valid, it's partial
    return hasAnyValue && !row.isValid;
  }

  /**
   * Check if any row is valid for submission
   */
  hasValidRows(): boolean {
    return this.tenderRows.some(row => this.validateRow(row));
  }

  /**
   * Get count of valid rows
   */
  getValidRowCount(): number {
    return this.tenderRows.filter(row => this.validateRow(row)).length;
  }

  /**
   * Reset all rows
   */
  resetAllRows(): void {
    this.tenderRows = [];
    this.nextId = 1;
    this.addNewRow();
    this.showToast('All rows have been reset', 'info');
  }

  /**
   * Convert date string to Date object
   * @param dateStr - Date string from input (YYYY-MM-DD)
   * @returns Date object or undefined
   */
  private parseDate(dateStr: string): Date | undefined {
    if (!dateStr) return undefined;
    const date = new Date(dateStr);
    // Check if date is valid
    if (isNaN(date.getTime())) return undefined;
    // Return date at midnight UTC to avoid timezone issues
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  }

  /**
   * Submit all valid rows to the server
   */
  async submitAllEntries(): Promise<void> {
    const validCount = this.getValidRowCount();
    
    if (validCount === 0) {
      this.showToast('Please fill in at least one complete row before submitting.', 'warning');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Confirm Submission',
      message: `You are about to submit ${validCount} procurement entr${validCount === 1 ? 'y' : 'ies'}. Do you want to continue?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Submit All', handler: () => this.submitAllValidRows() }
      ]
    });
    await alert.present();
  }

  /**
   * Submit all valid rows
   */
  private submitAllValidRows(): void {
    this.isSubmitting = true;
    
    const validRows = this.tenderRows.filter(row => this.validateRow(row));
    let completed = 0;
    let failed = 0;
    const errors: any[] = [];

    // Submit each row sequentially
    const submitRow = (index: number) => {
      if (index >= validRows.length) {
        // All done
        this.isSubmitting = false;
        
        if (failed === 0) {
          this.showToast(`Successfully added ${completed} procurement${completed !== 1 ? 's' : ''}!`, 'success');
          this.resetAllRows();
        } else {
          this.showToast(`Added ${completed} successfully, ${failed} failed. Check console for details.`, 'warning');
        }
        return;
      }

      const row = validRows[index];
      const data = {
        proc_number: row.proc_number,
        project_description: row.project_description,
        programme: row.programme || undefined,
        name_of_institute: row.name_of_institute || undefined,
        estimated_value: row.estimated_value,
        method_of_procurement: row.method_of_procurement,
        bid_specification: this.parseDate(row.bid_specification),
        advert: this.parseDate(row.advert),
        bid_closing: this.parseDate(row.bid_closing),
        bid_evaluation: this.parseDate(row.bid_evaluation),
        bid_award: this.parseDate(row.bid_award),
        campus_id: row.campus_id!,
        business_unit: row.business_unit || undefined
      };

      this.procurementService.create(data).subscribe({
        next: () => {
          completed++;
          submitRow(index + 1);
        },
        error: (error) => {
          console.error('Error adding procurement:', error);
          failed++;
          errors.push({ row: row.proc_number, error: error.error?.error || 'Unknown error' });
          submitRow(index + 1);
        }
      });
    };

    submitRow(0);
  }

  // ==================== IMPORT METHODS ====================
  
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const validExtensions = ['.xlsx', '.xls'];
      const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      
      if (validExtensions.includes(fileExt)) {
        this.selectedFile = file;
        this.importResult = null;
      } else {
        this.showToast('Please select a valid Excel file (.xlsx or .xls)', 'danger');
        this.selectedFile = null;
      }
    }
  }

  async uploadFile(): Promise<void> {
    if (!this.selectedFile) {
      this.showToast('Please select a file first', 'warning');
      return;
    }
    
    const alert = await this.alertController.create({
      header: 'Confirm Import',
      message: `Are you sure you want to import ${this.selectedFile.name}? This will add new procurements to the system.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Import', handler: () => this.performImport() }
      ]
    });
    await alert.present();
  }

  performImport(): void {
    this.isUploading = true;
    this.importResult = null;
    
    this.importExportService.uploadExcel(this.selectedFile!).subscribe({
      next: (result) => {
        this.importResult = result;
        this.isUploading = false;
        this.selectedFile = null;
        
        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        
        this.showToast(`Import completed: ${result.successful} successful, ${result.failed} failed`, 
          result.failed > 0 ? 'warning' : 'success');
        this.loadImportHistory();
      },
      error: (error) => {
        console.error('Import error:', error);
        this.isUploading = false;
        this.showToast(error.error?.error || 'Import failed. Make sure backend server is running.', 'danger');
      }
    });
  }

  downloadTemplate(): void {
    this.importExportService.downloadTemplate().subscribe({
      next: (blob) => {
        this.importExportService.downloadFile(blob, 'procurement_template.xlsx');
        this.showToast('Template downloaded successfully', 'success');
      },
      error: (error) => {
        console.error('Template download error:', error);
        this.showToast('Failed to download template', 'danger');
      }
    });
  }

  // ==================== EXPORT METHODS ====================
  
  exportData(): void {
    this.isExporting = true;
    
    this.importExportService.exportExcel(this.exportFilters).subscribe({
      next: (blob) => {
        const filename = `procurements_export_${new Date().toISOString().split('T')[0]}.xlsx`;
        this.importExportService.downloadFile(blob, filename);
        this.showToast('Export completed successfully', 'success');
        this.isExporting = false;
      },
      error: (error) => {
        console.error('Export error:', error);
        this.showToast('Export failed. Make sure backend server is running.', 'danger');
        this.isExporting = false;
      }
    });
  }

  resetExportFilters(): void {
    this.exportFilters = {
      campus_id: undefined,
      date_from: '',
      date_to: '',
      status: ''
    };
  }

  // ==================== HISTORY METHODS ====================
  
  loadImportHistory(): void {
    this.isLoadingHistory = true;
    this.importExportService.getImportHistory(this.historyPage).subscribe({
      next: (response) => {
        this.importHistory = response.data;
        this.historyTotal = response.pagination.total;
        this.historyTotalPages = response.pagination.totalPages;
        this.isLoadingHistory = false;
      },
      error: (error) => {
        console.error('Error loading import history:', error);
        this.isLoadingHistory = false;
      }
    });
  }

  changeHistoryPage(page: number): void {
    if (page < 1 || page > this.historyTotalPages) return;
    this.historyPage = page;
    this.loadImportHistory();
  }

  // ==================== UTILITY METHODS ====================
  
  formatDate(date: string): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-ZA');
  }

  formatDateTime(date: string): string {
    if (!date) return '-';
    return new Date(date).toLocaleString('en-ZA');
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

  clearImportResult(): void {
    this.importResult = null;
  }

  getPageNumbers(): (number | string)[] {
    const pages: (number | string)[] = [];
    const currentPage = this.historyPage;
    const total = this.historyTotalPages;
    
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

  getCampusName(campusId: number): string {
    const campus = this.campuses.find(c => c.id === campusId);
    return campus ? campus.name : 'Unknown';
  }

  trackByIndex(index: number, item: TenderRow): number {
    return item.id;
  }


  
}