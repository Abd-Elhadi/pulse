import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { RoomsService } from '../../core/services/rooms.service';

@Component({
  selector: 'app-room-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  template: `
    <div class="auth-container">
      <mat-card class="auth-card">
        <mat-card-title>Create Room</mat-card-title>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field class="full-width">
            <mat-label>Room Name</mat-label>
            <input matInput formControlName="name" />
          </mat-form-field>

          <mat-form-field class="full-width">
            <mat-label>Description</mat-label>
            <input matInput formControlName="description" />
          </mat-form-field>

          <button
            mat-raised-button
            color="primary"
            type="submit"
            [disabled]="form.invalid || loading()"
          >
            Create Room
          </button>
        </form>
      </mat-card>
    </div>
  `,
})
export class RoomFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(RoomsService);
  private readonly router = inject(Router);

  readonly loading = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    isPrivate: [false],
  });

  submit() {
    if (this.form.invalid) return;

    this.loading.set(true);

    this.service.createRoom(this.form.getRawValue()).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/rooms']);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }
}
