import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { User } from '../models/user.model';
import { Campus } from '../models/campus.model';

/**
 * User Management Service
 * Handles user CRUD operations and campus management
 */
@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  /**
   * Get all users with optional filters
   * @param search - Search term for name/email
   * @param role - Filter by role
   * @returns Observable with array of users
   */
  getAll(search?: string, role?: string): Observable<User[]> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    if (role) params = params.set('role', role);
    
    return this.http.get<User[]>(this.apiUrl, { params });
  }

  /**
   * Get user by ID
   * @param id - User ID
   * @returns Observable with user details
   */
  getById(id: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`);
  }

  /**
   * Create new user
   * @param user - User data (password required)
   * @returns Observable with created user ID
   */
  create(user: Partial<User> & { password: string }): Observable<{ id: number; message: string }> {
    return this.http.post<{ id: number; message: string }>(this.apiUrl, user);
  }

  /**
   * Update existing user
   * @param id - User ID
   * @param user - Updated user data
   * @returns Observable with success message
   */
  update(id: number, user: Partial<User>): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/${id}`, user);
  }

  /**
   * Delete user
   * @param id - User ID
   * @returns Observable with success message
   */
  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  /**
   * Get all campuses
   * @returns Observable with array of campuses
   */
  getCampuses(): Observable<Campus[]> {
    return this.http.get<Campus[]>(`${this.apiUrl}/campuses`);
  }

  /**
   * Get users by role
   * @param role - User role to filter by
   * @returns Observable with users of specified role
   */
  getUsersByRole(role: string): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/by-role/${role}`);
  }
}