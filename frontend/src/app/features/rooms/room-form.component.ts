import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatChipInputEvent } from '@angular/material/chips';
import { RoomsService } from '../../core/services/rooms.service';

@Component({
  selector: 'app-room-form',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="form-container">
      <mat-card class="form-card">
        <mat-card-header>
          <button mat-icon-button [routerLink]="['/rooms']">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <mat-card-title>{{ isEditMode() ? 'Edit Room' : 'Create a Study Room' }}</mat-card-title>
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
              <mat-label>Room Name</mat-label>
              <input matInput formControlName="name" placeholder="e.g. Calculus Study Group" />
              <mat-icon matPrefix>school</mat-icon>
              @if (form.get('name')?.hasError('required') && form.get('name')?.touched) {
                <mat-error>Room name is required</mat-error>
              }
              @if (form.get('name')?.hasError('minlength') && form.get('name')?.touched) {
                <mat-error>Minimum 3 characters</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Description</mat-label>
              <textarea
                matInput
                formControlName="description"
                rows="3"
                placeholder="What will you study in this room?"
              ></textarea>
              <mat-hint align="end">{{ form.get('description')?.value?.length ?? 0 }}/500</mat-hint>
            </mat-form-field>

            <!-- Tags -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Tags</mat-label>
              <mat-chip-grid #chipGrid>
                @for (tag of tags(); track tag) {
                  <mat-chip-row (removed)="removeTag(tag)">
                    {{ tag }}
                    <button matChipRemove>
                      <mat-icon>cancel</mat-icon>
                    </button>
                  </mat-chip-row>
                }
              </mat-chip-grid>
              <input
                placeholder="Add a tag..."
                [matChipInputFor]="chipGrid"
                [matChipInputSeparatorKeyCodes]="separatorKeysCodes"
                (matChipInputTokenEnd)="addTag($event)"
              />
              <mat-hint>Press Enter or comma to add. Max 10 tags.</mat-hint>
            </mat-form-field>

            <!-- Privacy Toggle -->
            <div class="toggle-row">
              <div class="toggle-info">
                <mat-icon>{{ form.get('isPrivate')?.value ? 'lock' : 'public' }}</mat-icon>
                <div>
                  <strong>{{
                    form.get('isPrivate')?.value ? 'Private Room' : 'Public Room'
                  }}</strong>
                  <p>
                    {{
                      form.get('isPrivate')?.value
                        ? 'Only invited members can join.'
                        : 'Anyone can discover and join.'
                    }}
                  </p>
                </div>
              </div>
              <mat-slide-toggle formControlName="isPrivate" color="primary" />
            </div>

            <div class="form-actions">
              <button mat-button type="button" [routerLink]="['/rooms']">Cancel</button>
              <button
                mat-raised-button
                color="primary"
                type="submit"
                [disabled]="form.invalid || loading()"
              >
                @if (loading()) {
                  <mat-spinner diameter="20" />
                } @else {
                  {{ isEditMode() ? 'Save Changes' : 'Create Room' }}
                }
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .form-container {
        min-height: 100vh;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        background: #f8f9fa;
        padding: 2rem 1rem;
      }
      .form-card {
        width: 100%;
        max-width: 600px;
      }
      mat-card-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 1.5rem;
      }
      .full-width {
        width: 100%;
        margin-bottom: 1rem;
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
      .toggle-info p {
        margin: 0;
        font-size: 0.8rem;
        color: #888;
      }
      .toggle-info strong {
        font-size: 0.95rem;
      }
      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
      }
    `,
  ],
})
export class RoomFormComponent implements OnInit {
  private readonly roomsService = inject(RoomsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  readonly isEditMode = signal(false);
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly tags = signal<string[]>([]);
  readonly separatorKeysCodes = [ENTER, COMMA];

  private roomId: string | null = null;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(80)]],
    description: ['', Validators.maxLength(500)],
    isPrivate: [false],
  });

  ngOnInit(): void {
    this.roomId = this.route.snapshot.paramMap.get('id');
    if (this.roomId) {
      this.isEditMode.set(true);
      this.loadRoom(this.roomId);
    }
  }

  private loadRoom(id: string): void {
    this.loading.set(true);
    this.roomsService.getRoomById(id).subscribe({
      next: (room) => {
        this.form.patchValue({
          name: room.name,
          description: room.description,
          isPrivate: room.isPrivate,
        });
        this.tags.set([...room.tags]);
        this.loading.set(false);
      },
      error: () => {
        this.snackBar.open('Failed to load room', 'Close', { duration: 3000 });
        void this.router.navigate(['/rooms']);
      },
    });
  }

  addTag(event: MatChipInputEvent): void {
    const value = (event.value ?? '').trim().toLowerCase();
    if (value && !this.tags().includes(value) && this.tags().length < 10) {
      this.tags.update((t) => [...t, value]);
    }
    event.chipInput.clear();
  }

  removeTag(tag: string): void {
    this.tags.update((t) => t.filter((x) => x !== tag));
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.errorMessage.set('');

    const payload = { ...this.form.getRawValue(), tags: this.tags() };

    const request$ =
      this.isEditMode() && this.roomId
        ? this.roomsService.updateRoom(this.roomId, payload)
        : this.roomsService.createRoom(payload);

    request$.subscribe({
      next: (room) => {
        this.loading.set(false);
        this.snackBar.open(this.isEditMode() ? 'Room updated!' : 'Room created!', 'Close', {
          duration: 3000,
        });
        void this.router.navigate(['/rooms', room._id]);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        const apiErr = err as { error: { message: string } };
        this.errorMessage.set(apiErr?.error?.message ?? 'Something went wrong.');
      },
    });
  }
}
