import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError, switchMap } from 'rxjs';
import { AuthService } from '../services/auth';

/**
 * Authentication Interceptor
 * 
 * PURPOSE:
 * Automatically adds JWT token to all outgoing HTTP requests and handles
 * authentication errors (401/403) by redirecting to login page.
 * 
 * FEATURES:
 * - Adds Authorization header with Bearer token
 * - Handles token expiration (401) by clearing storage and redirecting
 * - Handles invalid token (403) with user notification
 * - Logs all authentication-related events for debugging
 * 
 * USAGE:
 * Registered in main.ts with: provideHttpClient(withInterceptors([authInterceptor]))
 * 
 * @param req - Outgoing HTTP request
 * @param next - Next handler in the interceptor chain
 * @returns Observable with the HTTP response
 */
export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  // Get authentication token from localStorage
  const token = authService.getToken();
  
  // Log request details for debugging
  console.group('🔵 AUTH INTERCEPTOR');
  console.log('Request URL:', req.url);
  console.log('Request Method:', req.method);
  console.log('Token exists:', !!token);
  if (token) {
    console.log('Token preview:', token.substring(0, 50) + '...');
    
    // Decode token to check expiry (optional)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiryDate = new Date(payload.exp * 1000);
      const isExpired = expiryDate < new Date();
      console.log('Token expiry:', expiryDate.toLocaleString());
      console.log('Token expired:', isExpired);
      if (isExpired) {
        console.warn('⚠️ Token is expired!');
      }
    } catch (e) {
      console.warn('Could not decode token:', e);
    }
  }
  console.groupEnd();
  
  // Clone request and add authorization header if token exists
  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }
  
  // Process the request and handle errors
  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      console.group('🔴 AUTH INTERCEPTOR ERROR');
      console.log('Error status:', error.status);
      console.log('Error message:', error.message);
      console.log('Error URL:', error.url);
      console.log('Error status text:', error.statusText);
      
      if (error.error && error.error.error) {
        console.log('Server error message:', error.error.error);
      }
      console.groupEnd();
      
      // Handle 401 Unauthorized - Token missing or expired
      if (error.status === 401) {
        console.warn('🔴 401 Unauthorized - Token missing or expired');
        console.log('Clearing localStorage and redirecting to login...');
        
        // Clear all authentication data
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        
        // Show alert to user
        alert('Your session has expired. Please login again.');
        
        // Redirect to login page
        router.navigate(['/login']);
      }
      
      // Handle 403 Forbidden - Invalid token or insufficient permissions
      if (error.status === 403) {
        console.warn('🔴 403 Forbidden - Invalid token or insufficient permissions');
        
        // Check if token exists but is invalid
        if (token) {
          console.warn('Token exists but was rejected by server');
          console.warn('Token value:', token);
          
          // Clear invalid token
          localStorage.removeItem('token');
          localStorage.removeItem('currentUser');
          
          // Show alert to user
          alert('Your session is invalid. Please login again.');
          
          // Redirect to login page
          router.navigate(['/login']);
        } else {
          console.warn('No token provided for protected resource');
        }
      }
      
      // Handle 500 Internal Server Error
      if (error.status === 500) {
        console.error('🔴 500 Internal Server Error - Backend issue');
        console.error('Error details:', error);
      }
      
      // Re-throw error for component-level handling
      return throwError(() => error);
    })
  );
};

/**
 * Alternative: Token Refresh Interceptor
 * Automatically refreshes expired tokens
 * 
 * Uncomment this if you implement token refresh functionality
 */
/*
export const authInterceptorWithRefresh: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  const token = authService.getToken();
  
  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: { 'Authorization': `Bearer ${token}` }
    });
  }
  
  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && token) {
        // Attempt to refresh token
        return authService.refreshToken().pipe(
          switchMap((response: any) => {
            // Store new token
            localStorage.setItem('token', response.token);
            
            // Retry original request with new token
            const retryReq = req.clone({
              setHeaders: { 'Authorization': `Bearer ${response.token}` }
            });
            return next(retryReq);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
*/