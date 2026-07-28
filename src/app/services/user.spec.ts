import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface User {
  id: number | string;
  username: string;
  name: string;
  email: string;
  role: string;
  campus_id?: number;
  business_unit?: string;
  is_active?: boolean;
  is_from_ad?: boolean;
  department?: string;
  title?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  /**
   * Get available users for assignment (from database)
   */
  getAvailableUsers(params?: { campus_id?: number; role?: string; search?: string }): Observable<User[]> {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.keys(params).forEach(key => {
        const value = params[key as keyof typeof params];
        if (value) {
          httpParams = httpParams.set(key, value.toString());
        }
      });
    }
    
    return this.http.get<User[]>(`${this.apiUrl}/available`, { params: httpParams });
  }

  /**
   * Search users directly from Active Directory (real-time)
   */
  searchADUsers(searchTerm: string, campusGroup?: string): Observable<User[]> {
    let params = new HttpParams().set('search', searchTerm);
    if (campusGroup) {
      params = params.set('campus_group', campusGroup);
    }
    
    return this.http.get<User[]>(`${this.apiUrl}/ad/search`, { params });
  }

  /**
   * Sync AD users to local database
   */
  syncADUsers(): Observable<{ message: string; synced: number; updated: number; total: number; errors: any[] }> {
    return this.http.post<{ message: string; synced: number; updated: number; total: number; errors: any[] }>(
      `${this.apiUrl}/ad/sync`,
      {}
    );
  }

  /**
   * Get all users
   */
  getAll(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl);
  }

  /**
   * Get user by ID
   */
  getById(id: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`);
  }

  /**
   * Get users by role
   */
  getUsersByRole(role: string): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/by-role/${role}`);
  }

  /**
   * Create user
   */
  create(user: Partial<User>): Observable<User> {
    return this.http.post<User>(this.apiUrl, user);
  }

  /**
   * Update user
   */
  update(id: number, user: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${id}`, user);
  }

  /**
   * Delete user
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}