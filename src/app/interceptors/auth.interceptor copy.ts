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
  
  const token = authService.getToken();
  
  console.group('🔵 AUTH INTERCEPTOR');
  console.log('Request URL:', req.url);
  console.log('Request Method:', req.method);
  console.log('Token exists:', !!token);
  
  if (token) {
    console.log('Token preview:', token.substring(0, 30) + '...');
    
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1])) as TokenPayload;
        const expiryDate = new Date(payload.exp * 1000);
        const isExpired = expiryDate < new Date();
        console.log('Token expiry:', expiryDate.toLocaleString());
        console.log('Token expired:', isExpired);
        if (isExpired) {
          console.warn('⚠️ Token is expired!');
        }
      } else {
        console.warn('⚠️ Token has invalid format (not JWT)');
      }
    } catch (error) {
      console.warn('Could not decode token:', error);
    }
  } else {
    console.warn('⚠️ No token found - Request will likely fail with 401');
  }
  console.groupEnd();
  
  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('🔵 Added Authorization header to request');
  } else {
    console.warn('🔴 No token available - skipping Authorization header');
  }
  
  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      console.group('🔴 AUTH INTERCEPTOR ERROR');
      console.log('Error status:', error.status);
      console.log('Error message:', error.message);
      console.log('Error URL:', error.url);
      console.log('Full error:', error);
      
      if (error.error) {
        console.log('Error response body:', error.error);
      }
      
      if (error.status === 401 || error.status === 403) {
        console.warn(`🔴 ${error.status} Authentication error detected`);
        
        const currentToken = authService.getToken();
        console.log('Current token at error time:', currentToken ? 'Exists' : 'Missing');
        
        if (currentToken) {
          console.log('Token value:', currentToken);
        }
        
        console.log('Clearing localStorage...');
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        
        const message = error.status === 401 
          ? 'Your session has expired. Please login again.'
          : 'Your session is invalid. Please login again.';
        
        alert(message);
        
        console.log('Redirecting to login...');
        router.navigate(['/login']);
      }
      console.groupEnd();
      
      return throwError(() => error);
    })
  );
};