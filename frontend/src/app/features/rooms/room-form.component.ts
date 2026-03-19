import { Component, inject, input, OnInit, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { RoomsService } from '../../core/services/rooms.service';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-room-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSlideToggleModule,
    RouterLink,
    MatIcon,
  ],
  template: `
    <div class="auth-container">
      <mat-card class="auth-card">
        <div class="form-header">
          <button mat-icon-button [routerLink]="['/rooms']">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <mat-card-title>{{ isEditMode() ? 'Edit Room' : 'Create a Study Room' }}</mat-card-title>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field class="full-width">
            <mat-label>Room Name</mat-label>
            <input matInput formControlName="name" />
            @if (form.get('name')?.hasError('required') && form.get('name')?.touched) {
              <mat-error>Room name is required</mat-error>
            }
            @if (form.get('name')?.hasError('minlength') && form.get('name')?.touched) {
              <mat-error>Minimum 3 characters</mat-error>
            }
          </mat-form-field>

          <mat-form-field class="full-width">
            <mat-label>Description</mat-label>
            <textarea matInput formControlName="description" rows="3"></textarea>
            <mat-hint align="end">{{ form.get('description')?.value?.length ?? 0 }}/500</mat-hint>
          </mat-form-field>

          <div class="toggle-row">
            <div class="toggle-info">
              <mat-icon>{{ form.get('isPrivate')?.value ? 'lock' : 'public' }}</mat-icon>
              <strong>{{ form.get('isPrivate')?.value ? 'Private Room' : 'Public Room' }}</strong>
            </div>
            <mat-slide-toggle formControlName="isPrivate" color="primary" />
          </div>

          <button
            mat-raised-button
            color="primary"
            type="submit"
            [disabled]="form.invalid || loading()"
          >
            {{ isEditMode() ? 'Save Changes' : 'Create Room' }}
          </button>
        </form>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .form-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 1rem 1rem 0;
        margin-bottom: 20px;
      }

      .toggle-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        margin-bottom: 1.5rem;
      }
      .toggle-info {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }
      .toggle-info mat-icon {
        color: #667eea;
      }
      .toggle-info strong {
        font-size: 0.95rem;
      }
    `,
  ],
})
export class RoomFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(RoomsService);
  private readonly router = inject(Router);
  readonly id = input<string>('');

  readonly loading = signal(false);
  readonly isEditMode = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(80)]],
    description: ['', Validators.maxLength(500)],
    isPrivate: [false],
  });

  ngOnInit(): void {
    if (this.id()) {
      this.isEditMode.set(true);
      this.loadRoom(this.id());
    }
  }

  private loadRoom(id: string): void {
    this.loading.set(true);
    this.service.getRoomById(id).subscribe({
      next: (room) => {
        this.form.patchValue({
          name: room.name,
          description: room.description,
          isPrivate: room.isPrivate,
        });
        this.loading.set(false);
      },
      error: () => {
        void this.router.navigate(['/rooms']);
      },
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);

    const action = this.isEditMode()
      ? this.service.updateRoom(this.id(), this.form.getRawValue())
      : this.service.createRoom(this.form.getRawValue());

    action.subscribe({
      next: () => {
        this.loading.set(false);
        void this.router.navigate(['/rooms']);
      },
      error: () => this.loading.set(false),
    });
  }
}
