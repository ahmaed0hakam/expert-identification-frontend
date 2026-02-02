import { Injectable, inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

@Injectable()
export class ApiInterceptor implements HttpInterceptor {
  private router = inject(Router);
  private authService = inject(AuthService);

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const url = request.url;
    
    // Skip interceptor for external URLs (not our API), assets, and blob URLs
    const isExternalUrl = (url.startsWith('http://') || url.startsWith('https://')) && !url.startsWith(environment.apiUrl);
    const isAssetUrl = url.includes('/assets/') || url.includes('./assets/') || url.startsWith('assets/');
    const isBlobOrDataUrl = url.startsWith('blob:') || url.startsWith('data:');
    
    if (isExternalUrl || isAssetUrl || isBlobOrDataUrl) {
      return next.handle(request);
    }

    // Build full URL with base API URL
    let fullUrl = request.url;
    
    // If URL already starts with API URL, use it as-is
    // Otherwise, prepend API URL to relative paths
    if (!fullUrl.startsWith(environment.apiUrl)) {
      // Remove leading slash if present
      const path = fullUrl.startsWith('/') ? fullUrl.substring(1) : fullUrl;
      fullUrl = `${environment.apiUrl}/${path}`;
    }

    // Get headers - always add auth headers for our API URLs
    let headers = request.headers;

    // Add Authorization header if token exists (always for our API)
    const token = this.authService.getAccessToken();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    // Add Accept-Language header from localStorage (avoid circular dependency)
    const language = localStorage.getItem('language') || 'en';
    if (language) {
      headers = headers.set('Accept-Language', language);
    }

    // Add Content-Type for non-FormData requests
    if (!(request.body instanceof FormData) && !headers.has('Content-Type')) {
      headers = headers.set('Content-Type', 'application/json');
    }

    // Clone request with updated URL and headers
    const clonedRequest = request.clone({
      url: fullUrl,
      headers: headers
    });

    // Handle response and errors
    return next.handle(clonedRequest).pipe(
      catchError((error: HttpErrorResponse) => {
        // Handle 401 Unauthorized - logout user
        if (error.status === 401 && this.authService.isAuthenticated()) {
          this.authService.logout().then(() => {
            const currentPath = this.router.url;
            if (currentPath.startsWith('/admin')) {
              this.router.navigate(['/admin/login']);
            } else {
              this.router.navigate(['/login']);
            }
          }).catch(err => {
            console.error('Error during logout:', err);
            this.router.navigate(['/login']);
          });
        }

        // Handle 403 Forbidden
        if (error.status === 403) {
          console.error('Access forbidden:', error.message);
        }

        // Handle 500 Server Error
        if (error.status === 500) {
          console.error('Server error:', error.message);
        }

        return throwError(() => error);
      })
    );
  }
}
