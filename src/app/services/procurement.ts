import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Procurement {
  id: number;
  proc_number: string;
  project_description: string;
  programme: string;
  name_of_institute: string;
  estimated_value: number;
  method_of_procurement: string;
  bid_specification: string | null;
  advert: string | null;
  bid_closing: string | null;
  bid_evaluation: string | null;
  bid_award: string | null;
  business_unit: string;
  campus_id: number;
  campus_name?: string;
  status_advertised: boolean;
  status_evaluated: boolean;
  status_awarded: boolean;
  overall_status: string;
  responsible_user_id: number | null;
  responsible_user_name?: string;
  comments: string;
  source: string;
  created_at: string;
  updated_at: string;
  logs?: ProcurementLog[];
}

export interface ProcurementLog {
  id: number;
  user_name: string;
  field_changed: string;
  old_value: string;
  new_value: string;
  comment: string;
  created_at: string;
}

export interface ProcurementListResponse {
  data: Procurement[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ProcurementFilters {
  page?: number;
  limit?: number;
  status?: string;
  campus_id?: number;
  search?: string;
}

export interface CreateProcurementRequest {
  proc_number: string;
  project_description: string;
  programme?: string;
  name_of_institute?: string;
  estimated_value?: number;
  method_of_procurement?: string;
  bid_specification?: string;
  advert?: string;
  bid_closing?: string;
  bid_evaluation?: string;
  bid_award?: string;
  business_unit?: string;
  campus_id: number;
}

export interface UpdateStatusResponse {
  message: string;
  overall_status: string;
}

export interface AssignUserResponse {
  message: string;
}

export interface DeleteResponse {
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProcurementService {
  private apiUrl = `${environment.apiUrl}/procurements`;

  constructor(private http: HttpClient) {}

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

  getById(id: number): Observable<Procurement> {
    return this.http.get<Procurement>(`${this.apiUrl}/${id}`);
  }

  create(data: CreateProcurementRequest): Observable<{ id: number; message: string }> {
    return this.http.post<{ id: number; message: string }>(this.apiUrl, data);
  }

  update(id: number, data: Partial<Procurement>): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/${id}`, data);
  }

  /**
   * Update procurement status by setting a specific date field
   * @param id - Procurement ID
   * @param statusField - Field name (advert, bid_evaluation, bid_award, bid_closing, bid_specification)
   * @param value - Date value (YYYY-MM-DD)
   * @param comment - Optional comment
   */
  updateStatus(
    id: number, 
    statusField: string, 
    value: string | null, 
    comment?: string
  ): Observable<UpdateStatusResponse> {
    // Create payload matching backend expectations
    const payload: {
      status_field: string;
      value: string | null;
      comment?: string;
    } = {
      status_field: statusField,  // Backend expects 'status_field'
      value: value                 // Backend expects 'value'
    };
    
    if (comment) {
      payload.comment = comment;
    }
    
    console.log('📤 ProcurementService.updateStatus - Sending payload:', payload);
    
    return this.http.patch<UpdateStatusResponse>(
      `${this.apiUrl}/${id}/status`,
      payload
    );
  }

  assignUser(id: number, userId: number): Observable<AssignUserResponse> {
    console.log('ProcurementService.assignUser - Request:', { id, userId });
    
    return this.http.patch<AssignUserResponse>(
      `${this.apiUrl}/${id}/assign`,
      { user_id: userId }
    );
  }

  delete(id: number): Observable<DeleteResponse> {
    return this.http.delete<DeleteResponse>(`${this.apiUrl}/${id}`);
  }

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