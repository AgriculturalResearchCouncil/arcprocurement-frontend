import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { User } from '../models/user.model';  // Import from models - SINGLE SOURCE OF TRUTH

export interface SyncADResponse {
  message: string;
  synced: number;
  updated: number;
  total: number;
  errors: any[];
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

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
   * Get users by role (used in procurement.page.ts)
   */
  getUsersByRole(role: string): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/by-role/${role}`);
  }

  /**
   * Get available users for assignment (from database)
   * This filters users who can be assigned to procurements
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
   * This queries AD directly without storing in database first
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
   * This imports all responsible users from AD to the local users table
   */
  syncADUsers(): Observable<SyncADResponse> {
    return this.http.post<SyncADResponse>(`${this.apiUrl}/ad/sync`, {});
  }

  /**
   * Create new user
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