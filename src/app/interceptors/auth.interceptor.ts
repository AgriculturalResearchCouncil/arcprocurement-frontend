// frontend/src/app/interceptors/auth.interceptor.ts
import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError, Observable } from 'rxjs';
import { AuthService } from '../services/auth';

interface TokenPayload {
  exp: number;
  iat: number;
  id: number;
  username: string;
  role: string;
}

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>, 
  next: HttpHandlerFn
): Observable<import('@angular/common/http').HttpEvent<unknown>> => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  // Skip auth header for login and public endpoints
  const isPublicEndpoint = req.url.includes('/auth/ad-login') || 
                          req.url.includes('/auth/refresh') ||
                          req.url.includes('/public/');
  
  if (isPublicEndpoint) {
    return next(req);
  }
  
  const token = authService.getToken();
  
  // Use localStorage or environment variable instead of process.env
  // In Angular, you can check if it's development mode
  const isDevelopment = !window.location.hostname.includes('production') && 
                        window.location.hostname !== 'localhost' === false;
  
  if (isDevelopment) {
    console.group('🔵 AUTH INTERCEPTOR');
    console.log('Request URL:', req.url);
    console.log('Token exists:', !!token);
    if (token) {
      console.log('Token preview:', token.substring(0, 30) + '...');
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1])) as TokenPayload;
          const expiryDate = new Date(payload.exp * 1000);
          console.log('Token expires:', expiryDate.toLocaleString());
        }
      } catch (e) {
        console.warn('Could not decode token');
      }
    }
    console.groupEnd();
  }
  
  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }
  
  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Handle 401 Unauthorized or 403 Forbidden
      if (error.status === 401 || error.status === 403) {
        const errorCode = error.error?.error || error.error?.code;
        const isTokenExpired = errorCode === 'TOKEN_EXPIRED' || 
                              error.error?.message?.includes('expired');
        
        if (isDevelopment) {
          console.group('🔴 AUTH INTERCEPTOR ERROR');
          console.log('Status:', error.status);
          console.log('Error code:', errorCode);
          console.log('Is token expired:', isTokenExpired);
          console.groupEnd();
        }
        
        // Clear storage only for token expiration or invalid token
        if (isTokenExpired || errorCode === 'INVALID_TOKEN') {
          localStorage.removeItem('token');
          localStorage.removeItem('currentUser');
          
          // Only redirect if not already on login page
          const currentUrl = router.url;
          if (!currentUrl.includes('/login')) {
            // Use a timeout to avoid race conditions
            setTimeout(() => {
              router.navigate(['/login']);
            }, 100);
          }
        }
      }
      
      return throwError(() => error);
    })
  );
};