import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * Import/Export Service
 * Handles Excel file upload and download operations
 */
@Injectable({
  providedIn: 'root'
})
export class ImportExportService {
  private apiUrl = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  /**
   * Upload and import Excel file
   * @param file - Excel file to upload (.xlsx or .xls)
   * @returns Observable with import results (success/failure counts)
   */
  uploadExcel(file: File): Observable<{ 
    message: string; 
    total: number; 
    successful: number; 
    failed: number; 
    errors: any[] 
  }> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.http.post<{ 
      message: string; 
      total: number; 
      successful: number; 
      failed: number; 
      errors: any[] 
    }>(`${this.apiUrl}/import/upload`, formData);
  }

  /**
   * Export procurements to Excel
   * @param filters - Optional filters for export
   * @returns Observable with Excel file blob
   */
  exportExcel(filters?: { 
    campus_id?: number; 
    date_from?: string; 
    date_to?: string; 
    status?: string 
  }): Observable<Blob> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.campus_id) params = params.set('campus_id', filters.campus_id.toString());
      if (filters.date_from) params = params.set('date_from', filters.date_from);
      if (filters.date_to) params = params.set('date_to', filters.date_to);
      if (filters.status) params = params.set('status', filters.status);
    }
    
    return this.http.get(`${this.apiUrl}/export`, {
      params: params,
      responseType: 'blob'
    });
  }

  /**
   * Download import template Excel file
   * @returns Observable with template file blob
   */
  downloadTemplate(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/import/template`, {
      responseType: 'blob'
    });
  }

  /**
   * Get import history
   * @param page - Page number
   * @param limit - Items per page
   * @returns Observable with paginated import history
   */
  getImportHistory(page: number = 1, limit: number = 20): Observable<{
    data: any[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    return this.http.get<{
      data: any[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`${this.apiUrl}/import/history?page=${page}&limit=${limit}`);
  }

  /**
   * Trigger file download from blob
   * @param blob - File blob
   * @param filename - Name for downloaded file
   */
  downloadFile(blob: Blob, filename: string): void {
    const link = document.createElement('a');
    const url = window.URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}