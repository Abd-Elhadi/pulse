import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';

interface ApiError {
  error: { message: string };
}

const passwordMatchValidator = (control: AbstractControl): ValidationErrors | null => {
  const password = control.get('password')?.value as string;
  const confirmPassword = control.get('confirmPassword')?.value as string;
  return password === confirmPassword ? null : { passwordMismatch: true };
};

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="auth-container">
      <mat-card class="auth-card">
        <mat-card-header>
          <div class="auth-logo">
            <mat-icon>bolt</mat-icon>
            <span>Pulse</span>
          </div>
          <mat-card-title>Create your account</mat-card-title>
          <mat-card-subtitle>Start learning with others today</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
            @if (errorMessage()) {
              <div class="error-banner">
                <mat-icon>error_outline</mat-icon>
                {{ errorMessage() }}
              </div>
            }

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Display Name</mat-label>
              <input matInput formControlName="displayName" autocomplete="name" />
              <mat-icon matPrefix>person</mat-icon>
              @if (
                form.get('displayName')?.hasError('required') && form.get('displayName')?.touched
              ) {
                <mat-error>Display name is required</mat-error>
              }
              @if (
                form.get('displayName')?.hasError('minlength') && form.get('displayName')?.touched
              ) {
                <mat-error>Minimum 2 characters</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email" autocomplete="email" />
              <mat-icon matPrefix>email</mat-icon>
              @if (form.get('email')?.hasError('required') && form.get('email')?.touched) {
                <mat-error>Email is required</mat-error>
              }
              @if (form.get('email')?.hasError('email') && form.get('email')?.touched) {
                <mat-error>Enter a valid email</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Password</mat-label>
              <input
                matInput
                [type]="showPassword() ? 'text' : 'password'"
                formControlName="password"
                autocomplete="new-password"
              />
              <mat-icon matPrefix>lock</mat-icon>
              <button
                mat-icon-button
                matSuffix
                type="button"
                (click)="showPassword.set(!showPassword())"
              >
                <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (form.get('password')?.hasError('required') && form.get('password')?.touched) {
                <mat-error>Password is required</mat-error>
              }
              @if (form.get('password')?.hasError('minlength') && form.get('password')?.touched) {
                <mat-error>Minimum 8 characters</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Confirm Password</mat-label>
              <input
                matInput
                [type]="showPassword() ? 'text' : 'password'"
                formControlName="confirmPassword"
                autocomplete="new-password"
              />
              <mat-icon matPrefix>lock_reset</mat-icon>
              @if (form.hasError('passwordMismatch') && form.get('confirmPassword')?.touched) {
                <mat-error>Passwords do not match</mat-error>
              }
            </mat-form-field>

            <button
              mat-raised-button
              color="primary"
              class="full-width submit-btn"
              type="submit"
              [disabled]="form.invalid || loading()"
            >
              @if (loading()) {
                <mat-spinner diameter="20" />
              } @else {
                Create Account
              }
            </button>
          </form>
        </mat-card-content>

        <mat-card-actions>
          <p class="auth-redirect">
            Already have an account?
            <a routerLink="/auth/login" mat-button color="primary">Sign in</a>
          </p>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .auth-container {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 1rem;
      }
      .auth-card {
        width: 100%;
        max-width: 420px;
        padding: 1.5rem;
      }
      .auth-logo {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 1.5rem;
        font-weight: 700;
        color: #667eea;
        margin-bottom: 0.5rem;
        mat-icon {
          font-size: 2rem;
          width: 2rem;
          height: 2rem;
        }
      }
      .full-width {
        width: 100%;
        margin-bottom: 0.5rem;
      }
      .error-banner {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: #fdecea;
        color: #c62828;
        padding: 0.75rem 1rem;
        border-radius: 8px;
        margin-bottom: 1rem;
        font-size: 0.875rem;
      }
      .submit-btn {
        height: 48px;
        font-size: 1rem;
        margin-top: 0.5rem;
      }
      .auth-redirect {
        text-align: center;
        width: 100%;
        color: #666;
        font-size: 0.875rem;
      }
      mat-card-header {
        flex-direction: column;
        margin-bottom: 1rem;
      }
    `,
  ],
})
export class RegisterComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly showPassword = signal(false);
  readonly loading = signal(false);
  readonly errorMessage = signal('');

  readonly form = this.fb.nonNullable.group(
    {
      displayName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordMatchValidator },
  );

  onSubmit(): void {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.errorMessage.set('');

    const { email, password, displayName } = this.form.getRawValue();

    this.authService.register({ email, password, displayName }).subscribe({
      next: () => {
        this.loading.set(false);
        void this.router.navigate(['/rooms']);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        const apiErr = err as ApiError;
        this.errorMessage.set(apiErr?.error?.message ?? 'Registration failed. Please try again.');
      },
    });
  }
}
