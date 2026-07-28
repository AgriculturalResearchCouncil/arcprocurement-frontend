import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { ImportExportService } from '../../services/import-export';
import { ProcurementService } from '../../services/procurement';
import { AuthService } from '../../services/auth';
import { CampusService } from '../../services/campus';
import { Campus } from '../../models/campus.model';

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
export class ImportExportPage implements OnInit, OnDestroy, AfterViewInit {
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
  campuses: Campus[] = [];
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

  // Tooltip properties
  private tooltipTimeout: any = null;
  private currentTooltip: HTMLElement | null = null;

  constructor(
    private importExportService: ImportExportService,
    private procurementService: ProcurementService,
    private authService: AuthService,
    private campusService: CampusService,
    private toastController: ToastController,
    private alertController: AlertController
  ) {
    // Initialize with one empty row
    this.addNewRow();
  }

  ngOnInit(): void {
    this.loadCampuses();
    this.loadImportHistory();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.setupTooltips(), 500);
  }

  ngOnDestroy(): void {
    this.hideTooltipImmediately();
    this.removeAllTooltipListeners();
  }

  // ==================== CAMPUS METHODS ====================
  
  loadCampuses(): void {
    console.log('Loading campuses...');
    
    this.campusService.getAll().subscribe({
      next: (data: Campus[]) => {
        console.log('Campuses loaded:', data);
        this.campuses = data;
        if (this.campuses.length === 0) {
          this.showToast('No campuses found. Please check API configuration.', 'warning');
        }
      },
      error: (error: any) => {
        console.error('Error loading campuses:', error);
        this.showToast('Failed to load campuses. Some features may be limited.', 'warning');
        this.campuses = [];
      }
    });
  }

  getCampusName(campusId: number): string {
    if (!campusId) return 'Not specified';
    const campus = this.campuses.find(c => c.id === campusId);
    return campus ? (campus.campus_name || campus.name) : `Campus ${campusId}`;
  }

  // ==================== TOOLTIP METHODS ====================
  
  setupTooltips(): void {
    const tooltipElements = document.querySelectorAll('[tooltip]');
    
    tooltipElements.forEach(element => {
      element.removeEventListener('mouseenter', this.handleMouseEnter as EventListener);
      element.removeEventListener('mouseleave', this.handleMouseLeave as EventListener);
      element.addEventListener('mouseenter', this.handleMouseEnter as EventListener);
      element.addEventListener('mouseleave', this.handleMouseLeave as EventListener);
    });
  }

  private handleMouseEnter = (event: Event): void => {
    const target = event.currentTarget as HTMLElement;
    const tooltipText = target.getAttribute('tooltip');
    const position = target.getAttribute('tooltip-position') || 'top';
    
    if (!tooltipText) return;
    
    if (this.tooltipTimeout) {
      clearTimeout(this.tooltipTimeout);
      this.tooltipTimeout = null;
    }
    
    this.hideTooltipImmediately();
    
    this.tooltipTimeout = setTimeout(() => {
      this.createTooltip(target, tooltipText, position);
      this.tooltipTimeout = null;
    }, 150);
  };

  private handleMouseLeave = (event: Event): void => {
    if (this.tooltipTimeout) {
      clearTimeout(this.tooltipTimeout);
    }
    
    this.tooltipTimeout = setTimeout(() => {
      this.hideTooltipImmediately();
    }, 100);
  };

  private createTooltip(target: HTMLElement, text: string, position: string): void {
    const tooltip = document.createElement('div');
    tooltip.className = 'dynamic-tooltip';
    tooltip.textContent = text;
    tooltip.style.cssText = `
      position: fixed;
      background: #2c3e50;
      color: white;
      font-size: 12px;
      font-weight: 500;
      padding: 6px 12px;
      border-radius: 6px;
      white-space: nowrap;
      z-index: 100000;
      pointer-events: none;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      font-family: inherit;
    `;
    
    document.body.appendChild(tooltip);
    this.currentTooltip = tooltip;
    
    const rect = target.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    
    switch (position) {
      case 'left':
        tooltip.style.left = `${rect.left - tooltipRect.width - 10}px`;
        tooltip.style.top = `${rect.top + (rect.height / 2) - (tooltipRect.height / 2)}px`;
        break;
      case 'right':
        tooltip.style.left = `${rect.right + 10}px`;
        tooltip.style.top = `${rect.top + (rect.height / 2) - (tooltipRect.height / 2)}px`;
        break;
      case 'bottom':
        tooltip.style.left = `${rect.left + (rect.width / 2) - (tooltipRect.width / 2)}px`;
        tooltip.style.top = `${rect.bottom + 10}px`;
        break;
      default:
        tooltip.style.left = `${rect.left + (rect.width / 2) - (tooltipRect.width / 2)}px`;
        tooltip.style.top = `${rect.top - tooltipRect.height - 10}px`;
        break;
    }
  }

  private hideTooltipImmediately(): void {
    if (this.currentTooltip) {
      this.currentTooltip.remove();
      this.currentTooltip = null;
    }
    if (this.tooltipTimeout) {
      clearTimeout(this.tooltipTimeout);
      this.tooltipTimeout = null;
    }
  }

  private removeAllTooltipListeners(): void {
    const tooltipElements = document.querySelectorAll('[tooltip]');
    tooltipElements.forEach(element => {
      element.removeEventListener('mouseenter', this.handleMouseEnter as EventListener);
      element.removeEventListener('mouseleave', this.handleMouseLeave as EventListener);
    });
  }

  // ==================== MANUAL ENTRY METHODS ====================
  
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
    setTimeout(() => this.setupTooltips(), 100);
  }

  removeRow(index: number): void {
    if (this.tenderRows.length > 1) {
      this.tenderRows.splice(index, 1);
      setTimeout(() => this.setupTooltips(), 100);
    } else {
      this.showToast('Cannot remove the last row. Add at least one row.', 'warning');
    }
  }

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
    
    this.tenderRows.splice(index + 1, 0, newRow);
    this.showToast('Row duplicated successfully', 'success');
    setTimeout(() => this.setupTooltips(), 100);
  }

  validateRow(row: TenderRow): boolean {
    row.isValid = !!(
      row.proc_number &&
      row.proc_number.trim() !== '' &&
      row.project_description &&
      row.project_description.trim() !== '' &&
      row.campus_id &&
      row.method_of_procurement &&
      row.method_of_procurement.trim() !== ''
    );
    return row.isValid;
  }

  hasPartialData(row: TenderRow): boolean {
    const hasAnyValue = !!(
      (row.proc_number && row.proc_number.trim() !== '') ||
      (row.project_description && row.project_description.trim() !== '') ||
      (row.programme && row.programme.trim() !== '') ||
      (row.name_of_institute && row.name_of_institute.trim() !== '') ||
      row.estimated_value ||
      (row.method_of_procurement && row.method_of_procurement.trim() !== '') ||
      (row.bid_specification && row.bid_specification.trim() !== '') ||
      (row.advert && row.advert.trim() !== '') ||
      (row.bid_closing && row.bid_closing.trim() !== '') ||
      (row.bid_evaluation && row.bid_evaluation.trim() !== '') ||
      (row.bid_award && row.bid_award.trim() !== '') ||
      row.campus_id ||
      (row.business_unit && row.business_unit.trim() !== '')
    );
    
    return hasAnyValue && !row.isValid;
  }

  hasValidRows(): boolean {
    const validCount = this.getValidRowCount();
    console.log('Valid rows count:', validCount);
    return validCount > 0;
  }

  getValidRowCount(): number {
    return this.tenderRows.filter(row => this.validateRow(row)).length;
  }

  resetAllRows(): void {
    this.tenderRows = [];
    this.nextId = 1;
    this.addNewRow();
    this.showToast('All rows have been reset', 'info');
    setTimeout(() => this.setupTooltips(), 100);
  }

  /**
   * Format date for MySQL DATE format (YYYY-MM-DD)
   * Returns undefined instead of null to match CreateProcurementRequest type
   */
  private formatDateForMySQL(dateStr: string): string | undefined {
    if (!dateStr || dateStr.trim() === '') return undefined;
    
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return undefined;
    
    // Format as YYYY-MM-DD (MySQL DATE format)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }

  /**
   * Convert empty string to undefined for optional fields
   */
  private toUndefined(value: string | undefined): string | undefined {
    if (!value || value.trim() === '') return undefined;
    return value.trim();
  }

  async submitAllEntries(): Promise<void> {
    const validCount = this.getValidRowCount();
    console.log('Submit clicked. Valid rows:', validCount);
    
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

  private submitAllValidRows(): void {
    console.log('Starting submission...');
    this.isSubmitting = true;
    
    const validRows = this.tenderRows.filter(row => this.validateRow(row));
    console.log('Valid rows to submit:', validRows.length);
    
    let completed = 0;
    let failed = 0;
    const errors: any[] = [];

    const submitRow = (index: number) => {
      if (index >= validRows.length) {
        this.isSubmitting = false;
        
        console.log('Submission complete. Completed:', completed, 'Failed:', failed);
        
        if (failed === 0) {
          this.showToast(`Successfully added ${completed} procurement${completed !== 1 ? 's' : ''}!`, 'success');
          this.resetAllRows();
        } else {
          this.showToast(`Added ${completed} successfully, ${failed} failed. Check console for details.`, 'warning');
        }
        return;
      }

      const row = validRows[index];
      console.log(`Submitting row ${index + 1}:`, row);
      
      // Prepare data with undefined instead of null to match CreateProcurementRequest type
      const data = {
        proc_number: row.proc_number.trim(),
        project_description: row.project_description.trim(),
        programme: this.toUndefined(row.programme),
        name_of_institute: this.toUndefined(row.name_of_institute),
        estimated_value: row.estimated_value,
        method_of_procurement: row.method_of_procurement,
        bid_specification: this.formatDateForMySQL(row.bid_specification),
        advert: this.formatDateForMySQL(row.advert),
        bid_closing: this.formatDateForMySQL(row.bid_closing),
        bid_evaluation: this.formatDateForMySQL(row.bid_evaluation),
        bid_award: this.formatDateForMySQL(row.bid_award),
        campus_id: row.campus_id!,
        business_unit: this.toUndefined(row.business_unit)
      };

      console.log('Sending data to API:', JSON.stringify(data, null, 2));

      this.procurementService.create(data).subscribe({
        next: (response) => {
          console.log(`Row ${index + 1} submitted successfully:`, response);
          completed++;
          submitRow(index + 1);
        },
        error: (error) => {
          console.error(`Error submitting row ${index + 1}:`, error);
          console.error('Error status:', error.status);
          console.error('Error message:', error.message);
          console.error('Error details:', error.error);
          
          const errorMessage = error.error?.error || error.error?.message || error.message || 'Unknown error';
          this.showToast(`Row ${index + 1} failed: ${errorMessage}`, 'danger');
          
          failed++;
          errors.push({ 
            row: row.proc_number, 
            error: errorMessage
          });
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

  trackByIndex(index: number, item: TenderRow): number {
    return item.id;
  }
}