import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Campus } from '../models/campus.model';

@Injectable({
  providedIn: 'root'
})
export class CampusService {
  // Use only the working dashboard API endpoint
  private dashboardUrl = `${environment.apiUrl}/dashboard`;

  constructor(private http: HttpClient) {}

  /**
   * Get all campuses from the working dashboard API endpoint
   */
  getAll(): Observable<Campus[]> {
    console.log('Loading campuses from dashboard API...');
    
    return this.http.get<any[]>(`${this.dashboardUrl}/by-campus`).pipe(
      map(campusData => {
        if (!campusData || campusData.length === 0) {
          console.warn('No campus data returned from API');
          return [];
        }
        
        // Transform dashboard campus data to Campus model
        return campusData.map(item => ({
          id: item.campus_id,
          name: item.campus_name,
          campus_name: item.campus_name
        }));
      }),
      catchError(error => {
        console.error('Error loading campuses from dashboard API:', error);
        return of([]);
      })
    );
  }

  /**
   * Get single campus by ID
   */
  getById(id: number): Observable<Campus> {
    return this.http.get<any[]>(`${this.dashboardUrl}/by-campus`).pipe(
      map(campusData => {
        const campus = campusData.find(c => c.campus_id === id);
        if (campus) {
          return {
            id: campus.campus_id,
            name: campus.campus_name,
            campus_name: campus.campus_name
          };
        }
        throw new Error(`Campus with id ${id} not found`);
      }),
      catchError(error => {
        console.error(`Error loading campus ${id}:`, error);
        throw error;
      })
    );
  }
}