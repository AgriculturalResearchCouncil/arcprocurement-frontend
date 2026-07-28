import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { Chart, registerables } from 'chart.js';
import { DashboardService } from '../../services/dashboard';
import { AuthService } from '../../services/auth';
import { CampusService } from '../../services/campus';
import { Campus } from '../../models/campus.model';

Chart.register(...registerables);

/**
 * Reports Page Component
 * Displays various reports and analytics for procurement data
 */
@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './reports.page.html',
  styleUrls: ['./reports.page.scss']
})
export class ReportsPage implements OnInit, AfterViewInit {
  // Report data
  statusDistribution: any = null;
  campusData: any[] = [];
  trendData: any[] = [];
  isLoading: boolean = true;
  hasError: boolean = false;
  errorMessage: string = '';
  
  // Filters
  reportFilters = {
    date_from: '',
    date_to: '',
    campus_id: undefined as number | undefined,
    report_type: 'status'
  };
  campuses: Campus[] = [];
  
  // Charts
  private statusChart: Chart | null = null;
  private campusChart: Chart | null = null;
  private trendChart: Chart | null = null;
  
  // Summary stats
  summaryStats = {
    totalValue: 0,
    avgValue: 0,
    completionRate: 0,
    onTimeRate: 0,
    totalProcurements: 0
  };
  
  // Store raw procurement data for calculations
  private allProcurements: any[] = [];

  constructor(
    private dashboardService: DashboardService,
    private campusService: CampusService,
    private authService: AuthService,
    private toastController: ToastController,
  ) {}

  ngOnInit(): void {
    this.loadCampuses();
    this.loadReports();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.createCharts(), 500);
  }

  /**
   * Load campuses from API
   */
  loadCampuses(): void {
    this.campusService.getAll().subscribe({
      next: (data: Campus[]) => {
        this.campuses = data;
        console.log('Campuses loaded for reports:', this.campuses);
      },
      error: (error: any) => {
        console.error('Error loading campuses:', error);
      }
    });
  }

  /**
   * Load all report data
   */
  loadReports(): void {
    this.isLoading = true;
    this.hasError = false;
    this.errorMessage = '';
    
    // Load status distribution
    this.dashboardService.getStatusDistribution().subscribe({
      next: (data: any) => {
        this.statusDistribution = data;
        this.createCharts();
        this.calculateSummaryStats();
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading status distribution:', error);
        this.hasError = true;
        this.errorMessage = 'Failed to load status distribution data.';
        this.isLoading = false;
      }
    });
    
    // Load campus distribution
    this.dashboardService.getByCampus().subscribe({
      next: (data: any[]) => {
        this.campusData = data;
        this.createCharts();
      },
      error: (error: any) => {
        console.error('Error loading campus data:', error);
      }
    });
    
    // Load trends
    this.dashboardService.getTrends().subscribe({
      next: (data: any[]) => {
        this.trendData = data;
        this.createCharts();
      },
      error: (error: any) => {
        console.error('Error loading trends:', error);
      }
    });
    
    // Load all procurements for value calculations
    this.loadAllProcurementsForStats();
  }
  
  /**
   * Load all procurements to calculate financial stats
   */
  loadAllProcurementsForStats(): void {
    // Get all procurements without pagination limit
    this.dashboardService.getSummary().subscribe({
      next: (summary: any) => {
        // If summary has total value, use it
        if (summary.total_value !== undefined) {
          this.summaryStats.totalValue = summary.total_value;
          this.summaryStats.avgValue = summary.total_procurements > 0 
            ? summary.total_value / summary.total_procurements 
            : 0;
          this.summaryStats.totalProcurements = summary.total_procurements;
        }
      },
      error: (error: any) => {
        console.error('Error loading summary for stats:', error);
        // Fallback: try to get from procurements endpoint
        this.loadProcurementsForStats();
      }
    });
  }
  
  /**
   * Fallback method to load procurements directly
   */
  loadProcurementsForStats(): void {
    // This would require a service method to get all procurements
    // For now, we'll use the status distribution to estimate
    if (this.statusDistribution && this.statusDistribution.data) {
      this.summaryStats.totalProcurements = this.getStatusTotal();
    }
  }

  /**
   * Calculate total from status distribution data
   */
  getStatusTotal(): number {
    if (!this.statusDistribution || !this.statusDistribution.data) return 0;
    return this.statusDistribution.data.reduce((a: number, b: number) => a + b, 0);
  }

  /**
   * Calculate percentage for status
   */
  getStatusPercentage(value: number): number {
    const total = this.getStatusTotal();
    if (total === 0) return 0;
    return (value / total) * 100;
  }

  /**
   * Calculate campus total
   */
  getCampusTotal(): number {
    if (!this.campusData || this.campusData.length === 0) return 0;
    return this.campusData.reduce((sum: number, c: any) => sum + c.count, 0);
  }

  /**
   * Calculate campus percentage
   */
  getCampusPercentage(count: number): number {
    const total = this.getCampusTotal();
    if (total === 0) return 0;
    return (count / total) * 100;
  }

  /**
   * Apply filters and reload data
   */
  applyFilters(): void {
    this.loadReports();
  }

  /**
   * Reset filters
   */
  resetFilters(): void {
    this.reportFilters = {
      date_from: '',
      date_to: '',
      campus_id: undefined,
      report_type: 'status'
    };
    this.applyFilters();
  }

  /**
   * Calculate summary statistics
   */
  calculateSummaryStats(): void {
    // Calculate completion rate from status distribution
    if (this.statusDistribution && this.statusDistribution.data) {
      const total = this.getStatusTotal();
      // Find completed status index (usually 'completed' is at index 2)
      const completedIndex = this.statusDistribution.labels.findIndex((l: string) => 
        l.toLowerCase() === 'completed' || l.toLowerCase() === 'complete'
      );
      const completed = completedIndex !== -1 ? this.statusDistribution.data[completedIndex] : 0;
      this.summaryStats.completionRate = total > 0 ? (completed / total) * 100 : 0;
      this.summaryStats.totalProcurements = total;
    }
    
    // Calculate on-time rate (procurements that are not overdue)
    if (this.statusDistribution && this.statusDistribution.data) {
      const total = this.getStatusTotal();
      const overdueIndex = this.statusDistribution.labels.findIndex((l: string) => 
        l.toLowerCase() === 'overdue'
      );
      const overdue = overdueIndex !== -1 ? this.statusDistribution.data[overdueIndex] : 0;
      const onTime = total - overdue;
      this.summaryStats.onTimeRate = total > 0 ? (onTime / total) * 100 : 0;
    }
    
    // If we don't have real value data, set some sample values for testing
    if (this.summaryStats.totalValue === 0 && this.summaryStats.totalProcurements > 0) {
      // Sample data for testing - replace with actual API data
      this.summaryStats.totalValue = 25000000; // R25,000,000
      this.summaryStats.avgValue = this.summaryStats.totalValue / this.summaryStats.totalProcurements;
    }
  }

  /**
   * Create all charts
   */
  createCharts(): void {
    if (this.statusChart) this.statusChart.destroy();
    if (this.campusChart) this.campusChart.destroy();
    if (this.trendChart) this.trendChart.destroy();
    
    this.createStatusChart();
    this.createCampusChart();
    this.createTrendChart();
  }

  /**
   * Create status distribution chart
   */
  createStatusChart(): void {
    const ctx = document.getElementById('statusChart') as HTMLCanvasElement;
    if (!ctx || !this.statusDistribution || !this.statusDistribution.data) return;
    
    const hasData = this.statusDistribution.data.some((val: number) => val > 0);
    if (!hasData) return;
    
    this.statusChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.statusDistribution.labels.map((l: string) => 
          l.charAt(0).toUpperCase() + l.slice(1).replace('_', ' ')
        ),
        datasets: [{
          data: this.statusDistribution.data,
          backgroundColor: ['#ffc107', '#17a2b8', '#28a745', '#dc3545'],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = this.getStatusTotal();
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }

  /**
   * Create campus distribution chart - uses campus_name from API
   */
  createCampusChart(): void {
    const ctx = document.getElementById('campusChart') as HTMLCanvasElement;
    if (!ctx || !this.campusData || this.campusData.length === 0) return;
    
    const hasData = this.campusData.some((item: any) => item.count > 0);
    if (!hasData) return;
    
    this.campusChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.campusData.map((d: any) => d.campus_name.substring(0, 20)),
        datasets: [{
          label: 'Number of Procurements',
          data: this.campusData.map((d: any) => d.count),
          backgroundColor: '#005D28',
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { position: 'top' }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1 },
            title: { display: true, text: 'Count' }
          },
          x: {
            ticks: { font: { size: 10 } }
          }
        }
      }
    });
  }

  /**
   * Create trend chart
   */
  createTrendChart(): void {
    const ctx = document.getElementById('trendChart') as HTMLCanvasElement;
    if (!ctx || !this.trendData || this.trendData.length === 0) return;
    
    const hasData = this.trendData.some((item: any) => item.count > 0);
    if (!hasData) return;
    
    this.trendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.trendData.map((d: any) => {
          const [year, month] = d.month.split('-');
          return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-ZA', { month: 'short', year: 'numeric' });
        }),
        datasets: [{
          label: 'Procurements Created',
          data: this.trendData.map((d: any) => d.count),
          borderColor: '#005D28',
          backgroundColor: 'rgba(0, 93, 40, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { position: 'top' }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1 },
            title: { display: true, text: 'Count' }
          }
        }
      }
    });
  }

  /**
   * Export report data
   */
  exportReport(): void {
    let exportData: any[] = [];
    
    switch (this.reportFilters.report_type) {
      case 'status':
        exportData = this.prepareStatusExport();
        break;
      case 'campus':
        exportData = this.prepareCampusExport();
        break;
      case 'trend':
        exportData = this.prepareTrendExport();
        break;
    }
    
    if (exportData.length > 0) {
      const headers = Object.keys(exportData[0]);
      const csv = [
        headers.join(','),
        ...exportData.map(row => headers.map(h => JSON.stringify(row[h])).join(','))
      ].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `procurement_report_${this.reportFilters.report_type}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  }

  /**
   * Prepare status distribution for export
   */
  prepareStatusExport(): any[] {
    if (!this.statusDistribution) return [];
    
    const total = this.getStatusTotal();
    return this.statusDistribution.labels.map((label: string, index: number) => ({
      'Status': label.charAt(0).toUpperCase() + label.slice(1),
      'Count': this.statusDistribution.data[index],
      'Percentage': total > 0 ? ((this.statusDistribution.data[index] / total) * 100).toFixed(2) : 0
    }));
  }

  /**
   * Prepare campus distribution for export - uses campus_name
   */
  prepareCampusExport(): any[] {
    if (!this.campusData || this.campusData.length === 0) return [];
    return this.campusData.map((item: any) => ({
      'Campus': item.campus_name,
      'Procurement Count': item.count
    }));
  }

  /**
   * Prepare trend data for export
   */
  prepareTrendExport(): any[] {
    if (!this.trendData || this.trendData.length === 0) return [];
    return this.trendData.map((item: any) => ({
      'Month': item.month,
      'Procurement Count': item.count
    }));
  }

  /**
   * Change report type
   */
  changeReportType(): void {
    this.createCharts();
  }

  /**
   * Format currency
   */
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value || 0);
  }

  /**
   * Get month-over-month change
   */
  getMoMChange(current: number, previous: number): string {
    if (previous === 0) return '+100%';
    const change = ((current - previous) / previous) * 100;
    return `${change > 0 ? '+' : ''}${change.toFixed(1)}%`;
  }

  /**
   * Show error toast message
   */
  async showErrorToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message: message,
      duration: 5000,
      color: 'danger',
      position: 'top'
    });
    toast.present();
  }

  /**
   * Retry loading data
   */
  retry(): void {
    this.loadReports();
  }
}