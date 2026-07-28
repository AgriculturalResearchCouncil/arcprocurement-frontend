// frontend/src/app/services/auth.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  campus_id: number;
  business_unit?: string;
  department?: string;
  title?: string;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: User;
  message?: string;
  error?: string;
  requiresAction?: string;
}

export class AuthError extends Error {
  public code: string;
  public status?: number;
  public userMessage: string;
  public technicalMessage: string;
  public requiresAction?: string;

  constructor(
    code: string,
    technicalMessage: string,
    status?: number,
    userMessage?: string,
    requiresAction?: string
  ) {
    super(technicalMessage);
    this.name = 'AuthError';
    this.code = code;
    this.status = status;
    this.userMessage = userMessage || this.getDefaultUserMessage(code);
    this.technicalMessage = technicalMessage;
    this.requiresAction = requiresAction;
    
    Object.setPrototypeOf(this, AuthError.prototype);
  }

  private getDefaultUserMessage(code: string): string {
    const messages: Record<string, string> = {
      'NETWORK_ERROR': 'Unable to connect to the server. Please check your internet connection.',
      'INVALID_CREDENTIALS': 'Invalid username or password. Please try again.',
      'PASSWORD_EXPIRED': 'Your password has expired. Please contact IT support to reset your password.',
      'ACCOUNT_DISABLED': 'Your account has been disabled. Please contact the system administrator.',
      'ACCOUNT_EXPIRED': 'Your account has expired. Please contact the system administrator.',
      'ACCOUNT_LOCKED': 'Your account has been locked due to multiple failed attempts. Please contact IT support or try again later.',
      'SERVICE_UNAVAILABLE': 'Authentication service is temporarily unavailable. Please try again later.',
      'TIMEOUT': 'Authentication request timed out. Please check your network connection and try again.',
      'MISSING_CREDENTIALS': 'Please enter both username and password.',
      'TOKEN_EXPIRED': 'Your session has expired. Please login again.',
      'FORBIDDEN': 'You do not have permission to access this resource.',
      'SERVER_ERROR': 'Server error occurred. Please try again later.',
      'INVALID_RESPONSE': 'Received invalid response from server. Please contact support.',
      'STORAGE_ERROR': 'Unable to save login information locally.',
      'UNKNOWN_ERROR': 'Login failed. Please try again.'
    };
    return messages[code] || messages['UNKNOWN_ERROR'];
  }
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.loadStoredUser();
  }

  private loadStoredUser(): void {
    try {
      const token = this.getToken();
      const storedUser = localStorage.getItem('currentUser');
      
      if (token && storedUser) {
        const user = JSON.parse(storedUser) as User;
        
        if (this.isValidUser(user)) {
          this.currentUserSubject.next(user);
        } else {
          this.clearStorage();
        }
      }
    } catch (error) {
      this.clearStorage();
    }
  }

  login(username: string, password: string): Observable<LoginResponse> {
    const url = `${this.apiUrl}/ad-login`;
    const body = { username, password };
    
    return this.http.post<any>(url, body).pipe(
      map((response: any) => {
        // Validate response structure
        if (!response) {
          throw new AuthError(
            'INVALID_RESPONSE',
            'Empty response from server',
            0,
            undefined
          );
        }
        
        // Check if response indicates an error
        if (!response.success) {
          throw new AuthError(
            response.error || 'UNKNOWN_ERROR',
            response.message || 'Authentication failed',
            response.status,
            response.message,
            response.requiresAction
          );
        }
        
        if (!response.token || response.token.trim() === '') {
          throw new AuthError(
            'TOKEN_MISSING',
            'Token missing in response',
            0,
            undefined
          );
        }
        
        if (!response.user || !response.user.id || !response.user.email) {
          throw new AuthError(
            'USER_MISSING',
            'User data incomplete in response',
            0,
            undefined
          );
        }
        
        return {
          success: true,
          token: response.token,
          user: response.user
        } as LoginResponse;
      }),
      tap((response: LoginResponse) => {
        const storageSuccess = this.storeAuthData(response.token, response.user);
        
        if (!storageSuccess) {
          throw new AuthError(
            'STORAGE_ERROR',
            'Failed to save authentication data',
            0,
            undefined
          );
        }
        
        this.currentUserSubject.next(response.user);
      }),
      catchError((error: HttpErrorResponse | AuthError | any) => {
        const authError = this.handleError(error);
        return throwError(() => authError);
      })
    );
  }

  private handleError(error: HttpErrorResponse | AuthError | any): AuthError {
    // If it's already our custom AuthError, just return it
    if (error instanceof AuthError) {
      return error;
    }
    
    // Handle HTTP errors
    if (error instanceof HttpErrorResponse) {
      // Check if error response has our custom error format
      if (error.error && error.error.error) {
        return new AuthError(
          error.error.error,
          error.error.message || error.message,
          error.status,
          error.error.message,
          error.error.requiresAction
        );
      }
      
      // Handle standard HTTP errors
      switch (error.status) {
        case 0:
          return new AuthError(
            'NETWORK_ERROR',
            error.message,
            error.status,
            undefined
          );
        
        case 400:
          if (error.error?.error === 'MISSING_CREDENTIALS') {
            return new AuthError(
              'MISSING_CREDENTIALS',
              error.error.message || error.message,
              error.status,
              error.error?.message
            );
          }
          return new AuthError(
            'BAD_REQUEST',
            error.message,
            error.status,
            'Invalid request. Please check your input.'
          );
        
        case 401:
          return new AuthError(
            error.error?.error || 'UNAUTHORIZED',
            error.error?.message || error.message,
            error.status,
            error.error?.message,
            error.error?.requiresAction
          );
        
        case 403:
          return new AuthError(
            error.error?.error || 'FORBIDDEN',
            error.error?.message || error.message,
            error.status,
            error.error?.message
          );
        
        case 503:
          return new AuthError(
            'SERVICE_UNAVAILABLE',
            error.error?.message || error.message,
            error.status,
            error.error?.message
          );
        
        case 504:
          return new AuthError(
            'TIMEOUT',
            error.error?.message || error.message,
            error.status,
            error.error?.message
          );
        
        default:
          return new AuthError(
            'HTTP_ERROR',
            error.message,
            error.status,
            `Login failed. Please try again. (Error: ${error.status})`
          );
      }
    }
    
    // Handle generic errors
    if (error instanceof Error) {
      return new AuthError(
        'UNKNOWN_ERROR',
        error.message,
        undefined,
        undefined
      );
    }
    
    // Fallback for unknown error types
    return new AuthError(
      'UNKNOWN_ERROR',
      'An unknown error occurred',
      undefined,
      undefined
    );
  }

  private storeAuthData(token: string, user: User): boolean {
    try {
      localStorage.setItem('token', token);
      localStorage.setItem('currentUser', JSON.stringify(user));
      return true;
    } catch (error) {
      this.clearStorage();
      return false;
    }
  }

  private isValidUser(user: User): boolean {
    return !!(user && 
      typeof user.id === 'number' && 
      user.id > 0 &&
      typeof user.email === 'string' &&
      user.email.trim() !== '' &&
      typeof user.name === 'string' &&
      user.name.trim() !== '' &&
      typeof user.role === 'string' &&
      user.role.trim() !== '');
  }

  logout(): void {
    this.clearStorage();
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  private clearStorage(): void {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('currentUser');
    } catch (error) {
      // Silent failure
    }
  }

  getToken(): string | null {
    try {
      const token = localStorage.getItem('token');
      return token && token.trim() !== '' ? token : null;
    } catch (error) {
      return null;
    }
  }

  getCurrentUser(): User | null {
    const user = this.currentUserSubject.value;
    return user && this.isValidUser(user) ? user : null;
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    const user = this.getCurrentUser();
    return !!(token && user);
  }

  hasRole(roles: string[]): boolean {
    const user = this.getCurrentUser();
    if (!user || !roles || roles.length === 0) return false;
    return roles.includes(user.role);
  }
}