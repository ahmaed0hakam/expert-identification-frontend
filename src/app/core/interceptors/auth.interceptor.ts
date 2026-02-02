// This interceptor is now replaced by ApiInterceptor
// Keeping for backward compatibility but ApiInterceptor handles everything
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // All logic moved to ApiInterceptor
    // This is now a passthrough to avoid breaking existing code
    return next.handle(request);
  }
}
