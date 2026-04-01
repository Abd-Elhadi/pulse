import { Component, inject, signal, OnInit, Input, DestroyRef } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ResourcesService } from '../../core/services/resources.service';
import { QuizzesService } from '../../core/services/quiz.service';
import { ResourcesStore } from './resources.store';
import { AuthStore } from '../../core/auth/auth.store';
import { RoomsStore } from '../rooms/rooms.store';
import { Resource } from '../../core/models/resource.model';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component.ts';

@Component({
  selector: 'app-resources',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatDialogModule,
    MatDividerModule,
  ],
  template: `
    <div class="resources-container">
      @if (roomsStore.selectedRoomCanEdit()) {
        <div class="upload-area">
          <input
            #fileInput
            type="file"
            accept=".pdf,image/jpeg,image/png"
            (change)="onFileSelected($event)"
            style="display:none"
          />

          @if (pendingFile()) {
            <div class="pending-row">
              <mat-icon>insert_drive_file</mat-icon>
              <span class="pending-name">{{ pendingFile()!.name }}</span>
              @if (pendingFile()!.type === 'application/pdf') {
                <label class="quiz-toggle">
                  <input
                    type="checkbox"
                    [checked]="generateQuiz()"
                    (change)="generateQuiz.set(!generateQuiz())"
                  />
                  <mat-icon>quiz</mat-icon> Generate AI Quiz
                </label>
              }
              <button mat-raised-button color="primary" (click)="confirmUpload()">Upload</button>
              <button mat-button (click)="pendingFile.set(null)">Cancel</button>
            </div>
          } @else {
            <button mat-stroked-button (click)="fileInput.click()" [disabled]="store.uploading()">
              {{ store.uploading() ? 'Uploading...' : 'Upload File' }}
            </button>
          }
        </div>
      }

      @if (store.loading()) {
        <div class="center"><mat-spinner diameter="40" /></div>
      } @else if (store.resources().length === 0) {
        <div class="center empty">
          <mat-icon>folder_open</mat-icon>
          <p>No resources yet.</p>
        </div>
      } @else {
        @for (resource of store.resources(); track resource._id) {
          <div class="resource-row">
            <mat-icon class="file-icon">
              {{ resource.fileType === 'pdf' ? 'picture_as_pdf' : 'image' }}
            </mat-icon>

            <div class="resource-info">
              <span class="name">{{ resource.fileName }}</span>
              <span class="meta">
                {{ resource.uploaderDisplayName }} · {{ resource.sizeBytes | number }} bytes ·
                {{ resource.createdAt | date: 'MMM d, y' }}
              </span>
            </div>

            @if (resource.aiJobId) {
              @if (resource.aiStatus === 'completed') {
                <button mat-stroked-button color="primary" (click)="openQuiz(resource)">
                  Take Quiz
                </button>
              } @else if (resource.aiStatus === 'failed') {
                <mat-icon class="failed" matTooltip="Quiz generation failed"
                  >error_outline</mat-icon
                >
              } @else {
                <mat-spinner diameter="20" matTooltip="Generating quiz..." />
              }
            }

            <div class="actions">
              <a
                mat-icon-button
                [href]="resource.downloadUrl"
                target="_blank"
                matTooltip="Download"
              >
                <mat-icon>download</mat-icon>
              </a>
              @if (canDelete(resource)) {
                <button
                  mat-icon-button
                  color="warn"
                  matTooltip="Delete"
                  (click)="deleteResource(resource)"
                >
                  <mat-icon>delete</mat-icon>
                </button>
              }
            </div>
          </div>
          <mat-divider />
        }
      }
    </div>
  `,
  styles: [
    `
      .resources-container {
        padding: 1.5rem;
        height: 100%;
        overflow-y: auto;
      }

      .upload-area {
        margin-bottom: 1.5rem;
      }

      .pending-row {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
        padding: 0.75rem 1rem;
        background: #e8eaf6;
        border-radius: 8px;
        font-size: 0.875rem;
      }
      .pending-name {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .quiz-toggle {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        cursor: pointer;
        font-size: 0.85rem;
      }

      .center {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 3rem;
      }
      .empty {
        color: #aaa;
        gap: 0.5rem;
      }
      .empty mat-icon {
        font-size: 3rem;
        width: 3rem;
        height: 3rem;
      }
      .empty p {
        margin: 0;
      }

      .resource-row {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0.875rem 0;
      }
      .file-icon {
        color: #5c6bc0;
        flex-shrink: 0;
      }
      .resource-info {
        flex: 1;
        min-width: 0;
      }
      .name {
        display: block;
        font-weight: 500;
        font-size: 0.9rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .meta {
        font-size: 0.75rem;
        color: #999;
      }
      .failed {
        color: #e53935;
      }
      .actions {
        display: flex;
        gap: 0.25rem;
        flex-shrink: 0;
      }
    `,
  ],
})
export class ResourcesComponent implements OnInit {
  @Input({ required: true }) roomId!: string;

  private readonly resourcesService = inject(ResourcesService);
  private readonly quizzesService = inject(QuizzesService);
  readonly store = inject(ResourcesStore);
  readonly roomsStore = inject(RoomsStore);
  readonly authStore = inject(AuthStore);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly pendingFile = signal<File | null>(null);
  readonly generateQuiz = signal(false);

  ngOnInit(): void {
    this.resourcesService.getRoomResources(this.roomId).subscribe({
      next: () => this.store.resourcesWithPendingJobs().forEach((r) => this.startPolling(r)),
      error: () => this.snackBar.open('Failed to load resources', 'Close', { duration: 3000 }),
    });
    this.quizzesService.getRoomQuizzes(this.roomId).subscribe();
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      this.snackBar.open('File too large. Max 10MB.', 'Close', { duration: 3000 });
      return;
    }
    this.pendingFile.set(file);
  }

  confirmUpload(): void {
    const file = this.pendingFile();
    if (!file) return;
    this.pendingFile.set(null);

    this.resourcesService
      .uploadFile(this.roomId, file, { generateQuiz: this.generateQuiz() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resource) => {
          this.generateQuiz.set(false);
          this.snackBar.open(`"${resource.fileName}" uploaded!`, 'Close', { duration: 3000 });
          if (resource.aiJobId && resource.aiStatus === 'pending') this.startPolling(resource);
        },
        error: () => {
          this.store.setUploading(false);
          this.snackBar.open('Upload failed.', 'Close', { duration: 3000 });
        },
      });
  }

  startPolling(resource: Resource): void {
    if (!resource.aiJobId) return;
    this.quizzesService
      .pollJobStatus(this.roomId, resource.aiJobId, resource._id)
      ?.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((status) => {
        if (status.status === 'completed')
          this.snackBar.open(`Quiz ready for "${resource.fileName}"! 🎉`, 'Close', {
            duration: 4000,
          });
        else if (status.status === 'failed')
          this.snackBar.open('Quiz generation failed.', 'Close', { duration: 4000 });
      });
  }

  openQuiz(resource: Resource): void {
    void this.router.navigate(['/rooms', this.roomId, 'quiz', resource._id]);
  }

  deleteResource(resource: Resource): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          title: 'Delete Resource',
          message: `Delete "${resource.fileName}"?`,
          confirmLabel: 'Delete',
          danger: true,
        },
      })
      .afterClosed()
      .subscribe((confirmed: boolean) => {
        if (!confirmed) return;
        this.resourcesService.deleteResource(this.roomId, resource._id).subscribe({
          next: () => this.snackBar.open('Resource deleted', 'Close', { duration: 3000 }),
          error: () => this.snackBar.open('Failed to delete', 'Close', { duration: 3000 }),
        });
      });
  }

  canDelete(resource: Resource): boolean {
    return (
      resource.uploadedBy === this.authStore.user()?.id || this.roomsStore.selectedRoomIsAdmin()
    );
  }
}
