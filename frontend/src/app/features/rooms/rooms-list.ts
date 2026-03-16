import { Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { RoomsService } from '../../core/services/rooms.service';
import { RoomsStore } from './rooms.store';
import { AuthStore } from '../../core/auth/auth.store';
import { AuthService } from '../../core/services/auth.service';
import { Room } from '../../core/models/room.models';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component.ts';

@Component({
  selector: 'app-rooms-list',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatDialogModule,
  ],
  template: `
    <div class="rooms-container">
      <div class="rooms-header">
        <div class="logo"><mat-icon>bolt</mat-icon><span>Pulse</span></div>
        <div class="header-right">
          <span class="user-name">{{ authStore.displayName() }}</span>
          <mat-icon>account_circle</mat-icon>
          <button mat-icon-button (click)="logout()" matTooltip="Logout">
            <mat-icon>logout</mat-icon>
          </button>
        </div>
      </div>

      <div class="rooms-body">
        <main class="main-content">
          <div class="content-toolbar">
            <button mat-raised-button color="primary" [routerLink]="['/rooms/new']">
              <mat-icon>add</mat-icon> Create Room
            </button>
          </div>

          @if (roomsStore.loading()) {
            <div class="loading-container"><mat-spinner diameter="48" /></div>
          }

          @if (!roomsStore.loading()) {
            @if (roomsStore.rooms().length === 0) {
              <div class="empty-state">
                <mat-icon>school</mat-icon>
                <h3>No study rooms found</h3>
                <p>Be the first to create one!</p>
                <button mat-raised-button color="primary" [routerLink]="['/rooms/new']">
                  Create a Room
                </button>
              </div>
            } @else {
              <div class="rooms-grid">
                @for (room of roomsStore.rooms(); track room._id) {
                  <mat-card class="room-card" [class.private-card]="room.isPrivate">
                    <mat-card-header>
                      <div class="card-title-row">
                        <mat-icon class="privacy-icon">{{
                          room.isPrivate ? 'lock' : 'public'
                        }}</mat-icon>
                        <mat-card-title>{{ room.name }}</mat-card-title>
                        @if (room.ownerId === authStore.user()?.id) {
                          <span class="role-badge admin">Owner</span>
                        }
                      </div>
                    </mat-card-header>

                    <mat-card-content>
                      <p class="room-description">
                        {{ room.description || 'No description provided.' }}
                      </p>

                      <div class="room-meta">
                        <mat-icon inline>group</mat-icon>
                        {{ room.memberCount }} member{{ room.memberCount !== 1 ? 's' : '' }}
                      </div>
                    </mat-card-content>

                    <mat-card-actions>
                      @if (isMember(room)) {
                        <button
                          mat-button
                          color="primary"
                          [routerLink]="['/rooms', room._id]"
                          [disabled]="actionLoading() === room._id"
                        >
                          <mat-icon>open_in_new</mat-icon> Open
                        </button>
                      }

                      @if (!isMember(room)) {
                        <button
                          mat-button
                          color="accent"
                          (click)="joinRoom(room)"
                          [disabled]="actionLoading() === room._id"
                        >
                          <mat-icon>login</mat-icon> Join
                        </button>
                      }

                      @if (isMember(room) && room.ownerId !== authStore.user()?.id) {
                        <button
                          mat-button
                          color="warn"
                          (click)="leaveRoom(room)"
                          [disabled]="actionLoading() === room._id"
                        >
                          <mat-icon>logout</mat-icon> Leave
                        </button>
                      }
                    </mat-card-actions>
                  </mat-card>
                }
              </div>
            }
          }
        </main>
      </div>
    </div>
  `,
  styles: [
    `
      .rooms-container {
        display: flex;
        flex-direction: column;
        height: 100vh;
        background: #f8f9fa;
      }
      .rooms-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 1.5rem;
        height: 64px;
        background: white;
        border-bottom: 1px solid #e0e0e0;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
      }
      .logo {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 1.25rem;
        font-weight: 700;
        color: #667eea;
      }
      .logo mat-icon {
        font-size: 1.75rem;
        width: 1.75rem;
        height: 1.75rem;
      }
      .header-right {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .rooms-body {
        display: flex;
        width: 100%;
        flex: 1;
        overflow: hidden;
      }

      .role-badge.admin {
        background: #e8f5e9;
        color: #2e7d32;
      }

      .main-content {
        flex: 1;
        overflow-y: auto;
        padding: 1.5rem;
      }
      .content-toolbar {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1.5rem;
      }
      .loading-container {
        display: flex;
        justify-content: center;
        padding: 4rem;
      }
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
        padding: 4rem;
        color: #999;
        text-align: center;
      }
      .empty-state mat-icon {
        font-size: 4rem;
        width: 4rem;
        height: 4rem;
      }
      .empty-state h3 {
        margin: 0;
        color: #555;
      }
      .empty-state p {
        margin: 0;
      }
      .rooms-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1rem;
      }
      .room-card {
        transition:
          box-shadow 0.2s,
          transform 0.2s;
      }
      .room-card:hover {
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
        transform: translateY(-2px);
      }
      .private-card {
        border-left: 3px solid #9c27b0;
      }
      .card-title-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex: 1;
      }
      .privacy-icon {
        font-size: 1rem;
        width: 1rem;
        height: 1rem;
        color: #888;
      }
      .room-description {
        font-size: 0.875rem;
        color: #666;
        min-height: 2.5rem;
        margin-bottom: 0.75rem;
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }
      .room-meta {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.8rem;
        color: #888;
      }
    `,
  ],
})
export class RoomsListComponent implements OnInit {
  readonly roomsService = inject(RoomsService);
  readonly roomsStore = inject(RoomsStore);
  readonly authStore = inject(AuthStore);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  readonly searchControl = new FormControl('');
  readonly actionLoading = signal<string | null>(null);

  ngOnInit(): void {
    this.loadRooms();

    this.searchControl.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.loadRooms());
  }

  loadRooms(): void {
    this.roomsService.getRooms().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  changePage(page: number): void {
    this.loadRooms();
  }

  isMember(room: Room): boolean {
    const userId = this.authStore.user()?.id;
    if (!userId) return false;
    return room.members.some((m) => m.userId === userId);
  }

  joinRoom(room: Room): void {
    this.actionLoading.set(room._id);
    this.roomsService.joinRoom(room._id).subscribe({
      next: () => {
        this.actionLoading.set(null);
        this.snackBar.open(`Joined "${room.name}"`, 'Close', { duration: 3000 });
        this.roomsService.getRooms().subscribe();
      },
      error: () => {
        this.actionLoading.set(null);
        this.snackBar.open('Failed to join room', 'Close', { duration: 3000 });
      },
    });
  }

  leaveRoom(room: Room): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Leave Room',
        message: `Leave "${room.name}"?`,
        confirmLabel: 'Leave',
        danger: true,
      },
    });
    ref.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;
      this.actionLoading.set(room._id);
      this.roomsService.leaveRoom(room._id).subscribe({
        next: () => {
          this.actionLoading.set(null);
          this.snackBar.open(`Left "${room.name}"`, 'Close', { duration: 3000 });
          this.roomsService.getRooms().subscribe();
        },
        error: () => {
          this.actionLoading.set(null);
          this.snackBar.open('Failed to leave room', 'Close', { duration: 3000 });
        },
      });
    });
  }

  deleteRoom(room: Room): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete Room',
        message: `Permanently delete "${room.name}"? This cannot be undone.`,
        confirmLabel: 'Delete',
        danger: true,
      },
    });
    ref.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;
      this.roomsService.deleteRoom(room._id).subscribe({
        next: () => {
          this.snackBar.open(`Room deleted`, 'Close', { duration: 3000 });
          this.roomsService.getRooms().subscribe();
        },
        error: () => this.snackBar.open('Failed to delete room', 'Close', { duration: 3000 }),
      });
    });
  }

  logout(): void {
    this.authService.logout().subscribe();
  }
}
