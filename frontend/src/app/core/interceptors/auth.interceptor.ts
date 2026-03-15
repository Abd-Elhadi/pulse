import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpErrorResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthStore } from '../auth/auth.store';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  const authStore = inject(AuthStore);
  const authService = inject(AuthService);
  const router = inject(Router);

  const accessToken = authStore.accessToken();

  // Skip auth header for auth routes (except logout/me)
  const isPublicAuthRoute =
    req.url.includes('/auth/register') ||
    req.url.includes('/auth/login') ||
    req.url.includes('/auth/refresh');

  let authReq = req.clone({ withCredentials: true });

  if (accessToken && !isPublicAuthRoute) {
    authReq = authReq.clone({
      setHeaders: { Authorization: `Bearer ${accessToken}` },
    });
  }

  return next(authReq).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !isPublicAuthRoute &&
        !req.url.includes('/auth/logout')
      ) {
        // Try to refresh the token
        return authService.refresh().pipe(
          switchMap((response) => {
            const retryReq = req.clone({
              setHeaders: { Authorization: `Bearer ${response.accessToken}` },
            });
            return next(retryReq);
          }),
          catchError((refreshError: unknown) => {
            authStore.clearAuth();
            void router.navigate(['/auth/login']);
            return throwError(() => refreshError);
          }),
        );
      }
      return throwError(() => error);
    }),
  );
};
