import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { AuthService } from '../services/auth.service';
import { catchError, map, of } from 'rxjs';

export const authGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const authService = inject(AuthService);
  const router = inject(Router);

  // Already authenticated in memory
  if (authStore.isAuthenticated()) {
    return true;
  }

  // Try to restore session via refresh token (httpOnly cookie)
  return authService.refresh().pipe(
    map(() => true),
    catchError(() => {
      void router.navigate(['/auth/login']);
      return of(false);
    }),
  );
};
