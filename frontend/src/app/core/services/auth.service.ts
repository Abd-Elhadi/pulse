import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { AuthStore } from '../auth/auth.store';
import { AuthResponse, RegisterPayload, LoginPayload, User } from '../models/auth.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly baseUrl = `${environment.apiUrl}/auth`;

  register(payload: RegisterPayload): Observable<AuthResponse> {
    this.authStore.setLoading(true);
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/register`, payload, {
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          this.authStore.setAuth(response.user, response.accessToken);
          this.authStore.setLoading(false);
        }),
        catchError((err: unknown) => {
          this.authStore.setLoading(false);
          return throwError(() => err);
        }),
      );
  }

  login(payload: LoginPayload): Observable<AuthResponse> {
    this.authStore.setLoading(true);
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/login`, payload, {
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          this.authStore.setAuth(response.user, response.accessToken);
          this.authStore.setLoading(false);
        }),
        catchError((err: unknown) => {
          this.authStore.setLoading(false);
          return throwError(() => err);
        }),
      );
  }

  refresh(): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(
        `${this.baseUrl}/refresh`,
        {},
        {
          withCredentials: true,
        },
      )
      .pipe(
        tap((response) => {
          this.authStore.setAuth(response.user, response.accessToken);
        }),
      );
  }

  logout(): Observable<{ message: string }> {
    return this.http
      .post<{ message: string }>(
        `${this.baseUrl}/logout`,
        {},
        {
          withCredentials: true,
        },
      )
      .pipe(
        tap(() => {
          this.authStore.clearAuth();
          void this.router.navigate(['/auth/login']);
        }),
        catchError((err: unknown) => {
          // Clear auth even on error
          this.authStore.clearAuth();
          void this.router.navigate(['/auth/login']);
          return throwError(() => err);
        }),
      );
  }

  getMe(): Observable<User> {
    return this.http
      .get<User>(`${this.baseUrl}/me`)
      .pipe(tap((user) => this.authStore.setUser(user)));
  }
}
