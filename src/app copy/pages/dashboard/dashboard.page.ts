import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Chart, registerables } from 'chart.js';
import { DashboardService } from '../../services/dashboard';
import { AuthService } from '../../services/auth';
import { DashboardSummary, CampusProcurement } from '../../models/dashboard.model';

// Register Chart.js components
Chart.register(...registerables);

/**
 * Dashboard Page Component
 * Displays key metrics and visualizations for procurement tracking
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, IonicModule],
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss']
})
export class DashboardPage implements OnInit, AfterViewInit {
  summary: DashboardSummary | null = null;
  overdueProcurements: any[] = [];
  campusData: CampusProcurement[] = [];
  isLoading: boolean = true;
  private statusChart: Chart | null = null;
  private campusChart: Chart | null = null;

  constructor(
    private dashboardService: DashboardService,
    public authService: AuthService
  ) { }

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngAfterViewInit(): void {
    // Charts will be created after data loads
    setTimeout(() => this.createCharts(), 500);
  }

  /**
   * Load all dashboard data from API
   */
  loadDashboardData(): void {
    // Load summary statistics
    this.dashboardService.getSummary().subscribe({
      next: (data: DashboardSummary) => {
        this.summary = data;
        this.isLoading = false;
        this.createCharts();
      },
      error: (error: any) => {
        console.error('Error loading dashboard summary:', error);
        this.isLoading = false;
      }
    });

    // Load overdue procurements
    this.dashboardService.getOverdue().subscribe({
      next: (data: any[]) => {
        this.overdueProcurements = data;
      },
      error: (error: any) => {
        console.error('Error loading overdue procurements:', error);
      }
    });

    // Load campus distribution
    this.dashboardService.getByCampus().subscribe({
      next: (data: CampusProcurement[]) => {
        this.campusData = data;
        this.createCharts();
      },
      error: (error: any) => {
        console.error('Error loading campus data:', error);
      }
    });
  }

  /**
   * Create Chart.js visualizations
   */
  createCharts(): void {
    if (!this.summary) return;

    // Destroy existing charts if they exist
    if (this.statusChart) this.statusChart.destroy();
    if (this.campusChart) this.campusChart.destroy();

    // Status Distribution Doughnut Chart
    const statusCtx = document.getElementById('statusChart') as HTMLCanvasElement;
    if (statusCtx && this.summary) {
      this.statusChart = new Chart(statusCtx, {
        type: 'doughnut',
        data: {
          labels: ['Pending', 'In Progress', 'Completed', 'Overdue'],
          datasets: [{
            data: [
              this.summary.pending_count,
              this.summary.in_progress_count,
              this.summary.completed_count,
              this.summary.overdue_count
            ],
            backgroundColor: ['#ffc107', '#17a2b8', '#28a745', '#dc3545'],
            borderWidth: 2,
            borderColor: '#fff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { padding: 20 }
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const label = context.label || '';
                  const value = context.parsed || 0;
                  const total = this.summary!.total_procurements;
                  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                  return `${label}: ${value} (${percentage}%)`;
                }
              }
            }
          }
        }
      });
    }

    // Campus Distribution Bar Chart
    const campusCtx = document.getElementById('campusChart') as HTMLCanvasElement;
    if (campusCtx && this.campusData.length > 0) {
      this.campusChart = new Chart(campusCtx, {
        type: 'bar',
        data: {
          labels: this.campusData.map((d: CampusProcurement) => d.campus_name.substring(0, 25)),
          datasets: [{
            label: 'Number of Procurements',
            data: this.campusData.map((d: CampusProcurement) => d.count),
            backgroundColor: '#667eea',
            borderRadius: 4,
            barPercentage: 0.8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { position: 'top' },
            tooltip: { callbacks: { label: (ctx) => `${ctx.raw} procurements` } }
          },
          scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1 }, title: { display: true, text: 'Count' } },
            x: { ticks: { font: { size: 10 } } }
          }
        }
      });
    }
  }

  /**
   * Get CSS class for status badge
   * @param status - Procurement status string
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
   * Format date for display
   * @param date - Date string or Date object
   * @returns Formatted date string
   */
  formatDate(date: any): string {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString('en-ZA');
  }

  /**
   * Refresh dashboard data
   */
  refresh(): void {
    this.isLoading = true;
    this.loadDashboardData();
  }

  /**
 * Calculate days overdue
 * @param closingDate - Bid closing date
 * @returns Number of days overdue
 */
  getDaysOverdue(closingDate: string): number {
    if (!closingDate) return 0;
    const closing = new Date(closingDate);
    const today = new Date();
    const diffTime = today.getTime() - closing.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }

}