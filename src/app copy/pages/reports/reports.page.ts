import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { Chart, registerables } from 'chart.js';
import { DashboardService } from '../../services/dashboard';
import { ProcurementService } from '../../services/procurement';
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
  
  // Store all procurements for filtering
  private allProcurements: any[] = [];

  constructor(
    private dashboardService: DashboardService,
    private procurementService: ProcurementService,
    private campusService: CampusService,
    private authService: AuthService,
    private toastController: ToastController,
  ) {}

  ngOnInit(): void {
    this.loadCampuses();
    this.loadAllProcurements();
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
   * Load all procurements once and apply filters
   */
  loadAllProcurements(): void {
    this.isLoading = true;
    this.hasError = false;
    this.errorMessage = '';
    
    this.procurementService.getAll({ limit: 1000 }).subscribe({
      next: (response: any) => {
        this.allProcurements = response.data || [];
        console.log('All procurements loaded:', this.allProcurements.length);
        
        // Apply filters and update all reports
        this.applyFiltersAndUpdate();
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading procurements:', error);
        this.hasError = true;
        this.errorMessage = 'Failed to load procurement data. Please check your connection.';
        this.isLoading = false;
        this.showErrorToast(this.errorMessage);
      }
    });
  }

  /**
   * Apply filters to procurements and update all report data
   */
  applyFiltersAndUpdate(): void {
    if (!this.allProcurements.length) return;
    
    // Filter procurements based on current filters
    let filteredProcurements = [...this.allProcurements];
    
    // Filter by campus
    if (this.reportFilters.campus_id) {
      filteredProcurements = filteredProcurements.filter(p => p.campus_id === this.reportFilters.campus_id);
      console.log('Filtered by campus:', this.reportFilters.campus_id, '->', filteredProcurements.length);
    }
    
    // Filter by date range (using bid_closing)
    if (this.reportFilters.date_from) {
      const fromDate = new Date(this.reportFilters.date_from);
      fromDate.setHours(0, 0, 0, 0);
      filteredProcurements = filteredProcurements.filter(p => {
        if (!p.bid_closing) return true; // Keep if no date
        const procDate = new Date(p.bid_closing);
        return procDate >= fromDate;
      });
      console.log('Filtered by date_from:', this.reportFilters.date_from, '->', filteredProcurements.length);
    }
    
    if (this.reportFilters.date_to) {
      const toDate = new Date(this.reportFilters.date_to);
      toDate.setHours(23, 59, 59, 999);
      filteredProcurements = filteredProcurements.filter(p => {
        if (!p.bid_closing) return true; // Keep if no date
        const procDate = new Date(p.bid_closing);
        return procDate <= toDate;
      });
      console.log('Filtered by date_to:', this.reportFilters.date_to, '->', filteredProcurements.length);
    }
    
    console.log('Total filtered procurements:', filteredProcurements.length);
    
    // Calculate statistics from filtered data
    this.calculateStatisticsFromData(filteredProcurements);
    
    // Update status distribution from filtered data
    this.updateStatusDistribution(filteredProcurements);
    
    // Update campus distribution from filtered data
    this.updateCampusDistribution(filteredProcurements);
    
    // Update trend data from filtered data
    this.updateTrendData(filteredProcurements);
    
    // Recreate charts with new data
    this.createCharts();
  }
  
  /**
   * Calculate all statistics from filtered procurement data
   */
  calculateStatisticsFromData(procurements: any[]): void {
    const totalProcurements = procurements.length;
    
    // Calculate value statistics
    let totalValue = 0;
    let procurementsWithValue = 0;
    let completed = 0;
    let overdue = 0;
    
    procurements.forEach(proc => {
      // Value calculation
      if (proc.estimated_value && proc.estimated_value > 0) {
        totalValue += proc.estimated_value;
        procurementsWithValue++;
      }
      
      // Status counting
      switch (proc.overall_status) {
        case 'completed':
          completed++;
          break;
        case 'overdue':
          overdue++;
          break;
      }
    });
    
    // Set summary statistics
    this.summaryStats.totalProcurements = totalProcurements;
    this.summaryStats.totalValue = totalValue;
    this.summaryStats.avgValue = procurementsWithValue > 0 
      ? totalValue / procurementsWithValue 
      : 0;
    
    // Calculate rates
    if (totalProcurements > 0) {
      this.summaryStats.completionRate = (completed / totalProcurements) * 100;
      this.summaryStats.onTimeRate = ((totalProcurements - overdue) / totalProcurements) * 100;
    } else {
      this.summaryStats.completionRate = 0;
      this.summaryStats.onTimeRate = 0;
    }
    
    console.log('Calculated stats from filtered data:', this.summaryStats);
  }
  
  /**
   * Update status distribution from filtered procurements
   */
  updateStatusDistribution(procurements: any[]): void {
    let pending = 0;
    let inProgress = 0;
    let completed = 0;
    let overdue = 0;
    
    procurements.forEach(proc => {
      switch (proc.overall_status) {
        case 'pending':
          pending++;
          break;
        case 'in_progress':
          inProgress++;
          break;
        case 'completed':
          completed++;
          break;
        case 'overdue':
          overdue++;
          break;
        default:
          pending++;
          break;
      }
    });
    
    this.statusDistribution = {
      labels: ['pending', 'in_progress', 'completed', 'overdue'],
      data: [pending, inProgress, completed, overdue]
    };
    
    console.log('Status distribution updated:', this.statusDistribution);
  }
  
  /**
   * Update campus distribution from filtered procurements
   * This replaces the dashboard API call with filtered data
   */
  updateCampusDistribution(procurements: any[]): void {
    // Group procurements by campus
    const campusMap = new Map<number, { campus_id: number; campus_name: string; count: number }>();
    
    procurements.forEach(proc => {
      const campusId = proc.campus_id;
      const campusName = proc.campus_name || `Campus ${campusId}`;
      
      if (campusMap.has(campusId)) {
        campusMap.get(campusId)!.count++;
      } else {
        campusMap.set(campusId, {
          campus_id: campusId,
          campus_name: campusName,
          count: 1
        });
      }
    });
    
    // Convert to array and sort by count descending
    this.campusData = Array.from(campusMap.values())
      .sort((a, b) => b.count - a.count);
    
    console.log('Campus distribution updated:', this.campusData);
  }
  
  /**
   * Update trend data from filtered procurements
   */
  updateTrendData(procurements: any[]): void {
    // Group procurements by month (using created_at)
    const monthlyData = new Map<string, number>();
    
    procurements.forEach(proc => {
      const date = proc.created_at ? new Date(proc.created_at) : new Date();
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData.set(monthKey, (monthlyData.get(monthKey) || 0) + 1);
    });
    
    // Convert to array and sort by month
    this.trendData = Array.from(monthlyData.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12); // Last 12 months
    
    console.log('Trend data updated:', this.trendData);
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
    console.log('Applying filters:', this.reportFilters);
    this.applyFiltersAndUpdate();
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
    this.applyFiltersAndUpdate();
  }

  /**
   * Create all charts
   */
  createCharts(): void {
    setTimeout(() => {
      if (this.statusChart) this.statusChart.destroy();
      if (this.campusChart) this.campusChart.destroy();
      if (this.trendChart) this.trendChart.destroy();
      
      this.createStatusChart();
      this.createCampusChart();
      this.createTrendChart();
    }, 100);
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
   * Create campus distribution chart - uses filtered campus data
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
   * Prepare campus distribution for export
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
    if (!value || value === 0) {
      return 'R 0.00';
    }
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
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
    this.loadAllProcurements();
  }
}