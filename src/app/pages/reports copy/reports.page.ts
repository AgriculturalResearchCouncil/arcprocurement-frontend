import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Chart, registerables } from 'chart.js';
import { DashboardService } from '../../services/dashboard';
import { AuthService } from '../../services/auth';
import { Campus, CampusProcurement } from '../../models/campus.model';
import { addIcons } from 'ionicons';
import { 
  optionsOutline, 
  refreshOutline, 
  downloadOutline, 
  trendingUpOutline, 
  trendingDownOutline 
} from 'ionicons/icons';

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
  campusData: CampusProcurement[] = [];
  trendData: any[] = [];
  isLoading: boolean = true;
  errorMessage: string = '';
  
  // Filters
  reportFilters = {
    date_from: '',
    date_to: '',
    campus_id: undefined as number | undefined,
    report_type: 'status'
  };
  campuses: Campus[] = []; // Will be populated from campusData
  
  // Charts
  private statusChart: Chart | null = null;
  private campusChart: Chart | null = null;
  private trendChart: Chart | null = null;
  
  // Summary stats (calculated from real data)
  summaryStats = {
    totalValue: 0,
    avgValue: 0,
    completionRate: 0,
    onTimeRate: 0
  };

  constructor(
    private dashboardService: DashboardService,
    public authService: AuthService
  ) {
    // Register all icons used in the template
    addIcons({
      optionsOutline,
      refreshOutline,
      downloadOutline,
      trendingUpOutline,
      trendingDownOutline
    });
  }

  ngOnInit(): void {
    this.loadReports();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.createCharts(), 500);
  }

  /**
   * Load all report data
   */
  loadReports(): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    // Load status distribution
    this.dashboardService.getStatusDistribution().subscribe({
      next: (data: any) => {
        this.statusDistribution = data;
        this.createCharts();
      },
      error: (error: any) => {
        this.statusDistribution = null;
        this.errorMessage = 'Failed to load status distribution data';
        this.isLoading = false;
      }
    });
    
    // Load campus distribution (this gives us both campus data and available campuses)
    this.dashboardService.getByCampus().subscribe({
      next: (data: CampusProcurement[]) => {
        this.campusData = data;
        // Populate campuses array from the unique campus data
        this.campuses = data.map(item => ({
          id: item.campus_id,
          name: item.campus_name,
          campus_name: item.campus_name
        }));
        this.createCharts();
      },
      error: (error: any) => {
        this.campusData = [];
        this.errorMessage = 'Failed to load campus distribution data';
        this.isLoading = false;
      }
    });
    
    // Load trends
    this.dashboardService.getTrends().subscribe({
      next: (data: any[]) => {
        this.trendData = data;
        this.createCharts();
        this.calculateSummaryStats();
        this.isLoading = false;
      },
      error: (error: any) => {
        this.trendData = [];
        this.errorMessage = 'Failed to load trend data';
        this.isLoading = false;
      }
    });
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
    return this.campusData.reduce((sum: number, c: CampusProcurement) => sum + c.count, 0);
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
   * Calculate summary statistics from real data
   */
  calculateSummaryStats(): void {
    // Calculate completion rate from status distribution
    if (this.statusDistribution && this.statusDistribution.data) {
      const total = this.getStatusTotal();
      const completed = this.statusDistribution.data[2] || 0;
      this.summaryStats.completionRate = total > 0 ? (completed / total) * 100 : 0;
    }
    
    // Fetch actual procurement data to calculate value statistics
    this.dashboardService.getSummary().subscribe({
      next: (summary: any) => {
        if (summary && summary.total_value) {
          this.summaryStats.totalValue = summary.total_value;
          this.summaryStats.avgValue = summary.average_value || 0;
        }
        
        // Calculate on-time rate based on actual data
        if (summary.total_procurements > 0) {
          this.summaryStats.onTimeRate = this.summaryStats.completionRate;
        }
      },
      error: (error) => {
        // Silent fail - keep default values
      }
    });
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
    if (!ctx || !this.statusDistribution) return;
    
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
   * Create campus distribution chart
   */
  createCampusChart(): void {
    const ctx = document.getElementById('campusChart') as HTMLCanvasElement;
    if (!ctx || !this.campusData.length) return;
    
    this.campusChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.campusData.map((d: CampusProcurement) => d.campus_name.substring(0, 20)),
        datasets: [{
          label: 'Number of Procurements',
          data: this.campusData.map((d: CampusProcurement) => d.count),
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
    if (!ctx || !this.trendData.length) return;
    
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
    return this.campusData.map((item: CampusProcurement) => ({
      'Campus': item.campus_name,
      'Procurement Count': item.count
    }));
  }

  /**
   * Prepare trend data for export
   */
  prepareTrendExport(): any[] {
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
      currency: 'ZAR'
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
}