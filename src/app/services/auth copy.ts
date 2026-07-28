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
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: User;
  message?: string;
}

export interface ServerLoginResponse {
  token: string;
  user: User;
}

export class AuthError extends Error {
  public code: string;
  public status?: number;
  public userMessage: string;  // Changed from 'message' to 'userMessage'
  public technicalMessage: string;  // Store the original error message

  constructor(
    code: string,
    technicalMessage: string,
    status?: number,
    userMessage?: string
  ) {
    super(technicalMessage);  // Pass technical message to parent Error class
    this.name = 'AuthError';
    this.code = code;
    this.status = status;
    this.userMessage = userMessage || this.getDefaultUserMessage(code);
    this.technicalMessage = technicalMessage;
    
    // Maintains proper stack trace for where our error was thrown
    Object.setPrototypeOf(this, AuthError.prototype);
  }

  private getDefaultUserMessage(code: string): string {
    const messages: Record<string, string> = {
      NETWORK_ERROR: 'Unable to connect to the server. Please check your internet connection.',
      UNAUTHORIZED: 'Invalid username or password. Please try again.',
      FORBIDDEN: 'You do not have permission to access this resource.',
      SERVER_ERROR: 'Server error occurred. Please try again later.',
      INVALID_RESPONSE: 'Received invalid response from server. Please contact support.',
      STORAGE_ERROR: 'Unable to save login information locally.',
      TOKEN_MISSING: 'Authentication token is missing.',
      USER_MISSING: 'User information is missing.',
      UNKNOWN_ERROR: 'Login failed. Please try again.'
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
  
  // Error message templates
  private readonly ERROR_MESSAGES = {
    NETWORK: 'Unable to connect to the server. Please check your internet connection.',
    UNAUTHORIZED: 'Invalid username or password. Please try again.',
    SERVER_ERROR: 'Server error occurred. Please try again later.',
    INVALID_RESPONSE: 'Received invalid response from server. Please contact support.',
    STORAGE_ERROR: 'Unable to save login information locally.',
    TOKEN_MISSING: 'Authentication token is missing.',
    USER_MISSING: 'User information is missing.',
    DEFAULT: 'Login failed. Please try again.'
  };

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
        
        // Validate user object has required fields
        if (this.isValidUser(user)) {
          this.currentUserSubject.next(user);
        } else {
          // User data is corrupted, clear it
          this.clearStorage();
        }
      }
    } catch (error) {
      // Silent failure - just clear storage without logging
      this.clearStorage();
    }
  }

  login(username: string, password: string): Observable<LoginResponse> {
    const url = `${this.apiUrl}/ad-login`;
    const body = { username, password };
    
    return this.http.post<ServerLoginResponse>(url, body).pipe(
      map((response: ServerLoginResponse) => {
        // Validate response structure
        if (!response) {
          throw new AuthError(
            'INVALID_RESPONSE',
            'Empty response from server',
            0,
            this.ERROR_MESSAGES.INVALID_RESPONSE
          );
        }
        
        if (!response.token || response.token.trim() === '') {
          throw new AuthError(
            'TOKEN_MISSING',
            'Token missing or empty in response',
            0,
            this.ERROR_MESSAGES.TOKEN_MISSING
          );
        }
        
        if (!response.user || !response.user.id || !response.user.email) {
          throw new AuthError(
            'USER_MISSING',
            'User data incomplete in response',
            0,
            this.ERROR_MESSAGES.USER_MISSING
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
            this.ERROR_MESSAGES.STORAGE_ERROR
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
      switch (error.status) {
        case 0:
          return new AuthError(
            'NETWORK_ERROR',
            error.message,
            error.status,
            this.ERROR_MESSAGES.NETWORK
          );
        
        case 401:
          return new AuthError(
            'UNAUTHORIZED',
            error.message || 'Authentication failed',
            error.status,
            this.ERROR_MESSAGES.UNAUTHORIZED
          );
        
        case 403:
          return new AuthError(
            'FORBIDDEN',
            error.message || 'Access denied',
            error.status,
            'You do not have permission to access this resource.'
          );
        
        case 500:
        case 502:
        case 503:
        case 504:
          return new AuthError(
            'SERVER_ERROR',
            error.message,
            error.status,
            this.ERROR_MESSAGES.SERVER_ERROR
          );
        
        default:
          return new AuthError(
            'HTTP_ERROR',
            error.message,
            error.status,
            `${this.ERROR_MESSAGES.DEFAULT} (Error: ${error.status})`
          );
      }
    }
    
    // Handle generic errors
    if (error instanceof Error) {
      return new AuthError(
        'UNKNOWN_ERROR',
        error.message,
        undefined,
        this.ERROR_MESSAGES.DEFAULT
      );
    }
    
    // Fallback for unknown error types
    return new AuthError(
      'UNKNOWN_ERROR',
      'An unknown error occurred',
      undefined,
      this.ERROR_MESSAGES.DEFAULT
    );
  }

  private storeAuthData(token: string, user: User): boolean {
    try {
      localStorage.setItem('token', token);
      localStorage.setItem('currentUser', JSON.stringify(user));
      return true;
    } catch (error) {
      // Storage quota exceeded or other storage error
      this.clearStorage(); // Clean up any partial writes
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
      // Silent failure on clear - nothing we can do
    }
  }

  getToken(): string | null {
    try {
      const token = localStorage.getItem('token');
      // Validate token isn't empty string
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