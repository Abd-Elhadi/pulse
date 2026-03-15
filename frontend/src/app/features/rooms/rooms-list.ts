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
import { RoomsStore } from '../../core/auth/rooms.store';
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
          <button mat-icon-button [routerLink]="['/profile']" matTooltip="Profile">
            <mat-icon>account_circle</mat-icon>
          </button>
          @if (authStore.isAdmin()) {
            <button mat-icon-button [routerLink]="['/admin']" matTooltip="Admin">
              <mat-icon>admin_panel_settings</mat-icon>
            </button>
          }
          <button mat-icon-button (click)="logout()" matTooltip="Logout">
            <mat-icon>logout</mat-icon>
          </button>
        </div>
      </div>

      <div class="rooms-body">
        <aside class="sidebar">
          <div class="sidebar-header">
            <span>My Rooms</span>
            <button
              mat-icon-button
              [routerLink]="['/rooms/new']"
              matTooltip="Create Room"
              color="primary"
            >
              <mat-icon>add</mat-icon>
            </button>
          </div>
          @if (roomsStore.myRooms().length === 0) {
            <p class="empty-sidebar">No rooms yet.</p>
          }
          @for (room of roomsStore.myRooms(); track room._id) {
            <div
              class="sidebar-room"
              [routerLink]="['/rooms', room._id]"
              [class.private]="room.isPrivate"
            >
              <mat-icon class="room-icon">{{ room.isPrivate ? 'lock' : 'group' }}</mat-icon>
              <span class="room-name">{{ room.name }}</span>
              <span class="room-role" [class]="room.currentUserRole ?? ''">{{
                room.currentUserRole
              }}</span>
            </div>
          }
        </aside>

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
                      </div>
                      @if (room.currentUserRole) {
                        <span class="role-badge" [class]="room.currentUserRole">{{
                          room.currentUserRole
                        }}</span>
                      }
                    </mat-card-header>

                    <mat-card-content>
                      <p class="room-description">
                        {{ room.description || 'No description provided.' }}
                      </p>
                      <div class="room-tags">
                        @for (tag of room.tags.slice(0, 3); track tag) {
                          <mat-chip>{{ tag }}</mat-chip>
                        }
                      </div>
                      <div class="room-meta">
                        <mat-icon inline>group</mat-icon>
                        {{ room.memberCount }} member{{ room.memberCount !== 1 ? 's' : '' }}
                      </div>
                    </mat-card-content>

                    <mat-card-actions>
                      <button mat-button color="primary" [routerLink]="['/rooms', room._id]">
                        <mat-icon>open_in_new</mat-icon> Open
                      </button>
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
                      @if (room.currentUserRole === 'admin') {
                        <button
                          mat-icon-button
                          [routerLink]="['/rooms', room._id, 'edit']"
                          matTooltip="Edit"
                        >
                          <mat-icon>edit</mat-icon>
                        </button>
                        <button
                          mat-icon-button
                          color="warn"
                          (click)="deleteRoom(room)"
                          matTooltip="Delete"
                        >
                          <mat-icon>delete</mat-icon>
                        </button>
                      }
                    </mat-card-actions>
                  </mat-card>
                }
              </div>

              @if (roomsStore.pagination().totalPages > 1) {
                <div class="pagination">
                  <button
                    mat-icon-button
                    (click)="changePage(roomsStore.pagination().page - 1)"
                    [disabled]="roomsStore.pagination().page === 1"
                  >
                    <mat-icon>chevron_left</mat-icon>
                  </button>
                  <span
                    >Page {{ roomsStore.pagination().page }} of
                    {{ roomsStore.pagination().totalPages }}</span
                  >
                  <button
                    mat-icon-button
                    (click)="changePage(roomsStore.pagination().page + 1)"
                    [disabled]="roomsStore.pagination().page === roomsStore.pagination().totalPages"
                  >
                    <mat-icon>chevron_right</mat-icon>
                  </button>
                </div>
              }
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
      .user-name {
        font-size: 0.875rem;
        color: #666;
      }
      .rooms-body {
        display: flex;
        flex: 1;
        overflow: hidden;
      }
      .sidebar {
        width: 240px;
        min-width: 240px;
        background: white;
        border-right: 1px solid #e0e0e0;
        overflow-y: auto;
        padding: 1rem 0;
      }
      .sidebar-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 1rem 0.75rem;
        font-weight: 600;
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #888;
      }
      .sidebar-room {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.6rem 1rem;
        cursor: pointer;
        transition: background 0.15s;
      }
      .sidebar-room:hover {
        background: #f0f0ff;
      }
      .room-icon {
        font-size: 1rem;
        width: 1rem;
        height: 1rem;
        color: #888;
      }
      .room-name {
        flex: 1;
        font-size: 0.875rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .room-role {
        font-size: 0.65rem;
        padding: 1px 6px;
        border-radius: 10px;
        font-weight: 600;
      }
      .room-role.admin {
        background: #e8f5e9;
        color: #2e7d32;
      }
      .room-role.editor {
        background: #e3f2fd;
        color: #1565c0;
      }
      .room-role.viewer {
        background: #f3e5f5;
        color: #6a1b9a;
      }
      .empty-sidebar {
        font-size: 0.8rem;
        color: #aaa;
        padding: 0 1rem;
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
      .search-field {
        flex: 1;
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
      .role-badge {
        font-size: 0.7rem;
        padding: 2px 8px;
        border-radius: 10px;
        font-weight: 600;
      }
      .role-badge.admin {
        background: #e8f5e9;
        color: #2e7d32;
      }
      .role-badge.editor {
        background: #e3f2fd;
        color: #1565c0;
      }
      .role-badge.viewer {
        background: #f3e5f5;
        color: #6a1b9a;
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
      .room-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 0.25rem;
        margin-bottom: 0.75rem;
      }
      .room-meta {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.8rem;
        color: #888;
      }
      .pagination {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        margin-top: 2rem;
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
    this.roomsService.getMyRooms().subscribe();

    this.searchControl.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.loadRooms(1, value ?? undefined));
  }

  loadRooms(page = 1, search?: string): void {
    this.roomsService.getRooms(page, 12, search).subscribe();
  }

  changePage(page: number): void {
    this.loadRooms(page, this.searchControl.value ?? undefined);
  }

  isMember(room: Room): boolean {
    return room.members.some((m) => m.userId === this.authStore.user()?.id);
  }

  joinRoom(room: Room): void {
    this.actionLoading.set(room._id);
    this.roomsService.joinRoom(room._id).subscribe({
      next: () => {
        this.actionLoading.set(null);
        this.snackBar.open(`Joined "${room.name}"`, 'Close', { duration: 3000 });
        this.roomsService.getMyRooms().subscribe();
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
          this.roomsService.getMyRooms().subscribe();
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
          this.roomsService.getMyRooms().subscribe();
        },
        error: () => this.snackBar.open('Failed to delete room', 'Close', { duration: 3000 }),
      });
    });
  }

  logout(): void {
    this.authService.logout().subscribe();
  }
}
