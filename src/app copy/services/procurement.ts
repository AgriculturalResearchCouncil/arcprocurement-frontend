import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { 
  Procurement, 
  ProcurementListResponse, 
  ProcurementFilters,
  CreateProcurementRequest,
  UpdateStatusRequest
} from '../models/procurement.model';

/**
 * Procurement Service
 * Handles all procurement-related API operations
 */
@Injectable({
  providedIn: 'root'
})
export class ProcurementService {
  private apiUrl = `${environment.apiUrl}/procurements`;

  constructor(private http: HttpClient) {}

  /**
   * Get all procurements with filtering and pagination
   * @param filters - Filter and pagination parameters
   * @returns Observable with paginated procurement list
   */
  getAll(filters?: ProcurementFilters): Observable<ProcurementListResponse> {
    let httpParams = new HttpParams();
    
    if (filters) {
      Object.keys(filters).forEach(key => {
        const value = filters[key as keyof ProcurementFilters];
        if (value !== null && value !== undefined && value !== '') {
          httpParams = httpParams.set(key, value.toString());
        }
      });
    }
    
    return this.http.get<ProcurementListResponse>(this.apiUrl, { params: httpParams });
  }

  /**
   * Get single procurement by ID
   * @param id - Procurement ID
   * @returns Observable with procurement details including audit logs
   */
  getById(id: number): Observable<Procurement> {
    return this.http.get<Procurement>(`${this.apiUrl}/${id}`);
  }

  /**
   * Create new procurement
   * @param data - Procurement data
   * @returns Observable with created procurement ID
   */
  create(data: CreateProcurementRequest): Observable<{ id: number; message: string }> {
    return this.http.post<{ id: number; message: string }>(this.apiUrl, data);
  }

  /**
   * Update existing procurement
   * @param id - Procurement ID
   * @param data - Updated procurement data
   * @returns Observable with success message
   */
  update(id: number, data: Partial<Procurement>): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/${id}`, data);
  }

  /**
   * Update procurement status field
   * @param id - Procurement ID
   * @param statusField - Field to update (advert, bid_evaluation, etc.)
   * @param value - New date value
   * @param comment - Optional comment for the update
   * @returns Observable with new overall status
   */
  updateStatus(
    id: number, 
    statusField: string, 
    value: any, 
    comment?: string
  ): Observable<{ message: string; overall_status: string }> {
    return this.http.patch<{ message: string; overall_status: string }>(
      `${this.apiUrl}/${id}/status`,
      { status_field: statusField, value, comment }
    );
  }

  /**
   * Assign responsible user to procurement
   * @param id - Procurement ID
   * @param userId - User ID to assign
   * @returns Observable with success message
   */
  assignUser(id: number, userId: number): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.apiUrl}/${id}/assign`, { user_id: userId });
  }

  /**
   * Delete procurement
   * @param id - Procurement ID
   * @returns Observable with success message
   */
  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  /**
   * Export procurements to Excel
   * @param filters - Export filters
   * @returns Observable with Excel file blob
   */
  export(filters?: { campus_id?: number; date_from?: string; date_to?: string; status?: string }): Observable<Blob> {
    let params = new HttpParams();
    
    if (filters) {
      Object.keys(filters).forEach(key => {
        const value = filters[key as keyof typeof filters];
        if (value) {
          params = params.set(key, value.toString());
        }
      });
    }
    
    return this.http.get(`${environment.apiUrl}/export`, {
      params: params,
      responseType: 'blob'
    });
  }
}