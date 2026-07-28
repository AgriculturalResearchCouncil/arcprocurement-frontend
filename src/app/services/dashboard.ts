import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { 
  DashboardSummary, 
  CampusProcurement, 
  StatusDistribution, 
  TrendData 
} from '../models/dashboard.model';

/**
 * Dashboard Service
 * Provides data for dashboard visualizations and statistics
 */
@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl = `${environment.apiUrl}/dashboard`;

  constructor(private http: HttpClient) {}

  /**
   * Get dashboard summary statistics
   * Includes total counts by status and recent procurements
   * @returns Observable with dashboard summary data
   */
  getSummary(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(`${this.apiUrl}/summary`);
  }

  /**
   * Get overdue procurements list
   * @returns Observable with array of overdue procurements
   */
  getOverdue(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/overdue`);
  }

  /**
   * Get procurement counts by campus
   * @returns Observable with campus-wise distribution
   */
  getByCampus(): Observable<CampusProcurement[]> {
    return this.http.get<CampusProcurement[]>(`${this.apiUrl}/by-campus`);
  }

  /**
   * Get status distribution for charts
   * @returns Observable with status labels and counts
   */
  getStatusDistribution(): Observable<StatusDistribution> {
    return this.http.get<StatusDistribution>(`${this.apiUrl}/status-distribution`);
  }

  /**
   * Get monthly trend data
   * @param months - Number of months to include (default 6)
   * @returns Observable with monthly procurement counts
   */
  getTrends(months: number = 6): Observable<TrendData[]> {
    return this.http.get<TrendData[]>(`${this.apiUrl}/trends?months=${months}`);
  }
}