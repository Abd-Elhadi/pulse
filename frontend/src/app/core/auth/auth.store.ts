import { Injectable, signal, computed } from '@angular/core';
import { User } from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly _user = signal<User | null>(null);
  private readonly _accessToken = signal<string | null>(null);
  private readonly _loading = signal<boolean>(false);

  readonly user = this._user.asReadonly();
  readonly accessToken = this._accessToken.asReadonly();
  readonly loading = this._loading.asReadonly();

  readonly isAuthenticated = computed(() => this._user() !== null && this._accessToken() !== null);
  readonly isAdmin = computed(() => this._user()?.role === 'admin');
  readonly displayName = computed(() => this._user()?.displayName ?? '');

  setAuth(user: User, accessToken: string): void {
    this._user.set(user);
    this._accessToken.set(accessToken);
  }

  setUser(user: User): void {
    this._user.set(user);
  }

  setLoading(loading: boolean): void {
    this._loading.set(loading);
  }

  clearAuth(): void {
    this._user.set(null);
    this._accessToken.set(null);
  }

  updateAccessToken(token: string): void {
    this._accessToken.set(token);
  }
}
