import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { FormsModule } from '@angular/forms';
import { RoomsService } from '../../core/services/rooms.service';
import { RoomsStore } from '../../core/auth/rooms.store';
import { AuthStore } from '../../core/auth/auth.store';
import { RoomMember, RoomRole } from '../../core/models/room.models';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component.ts';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-room-detail',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatDialogModule,
    MatListModule,
    MatSelectModule,
    MatDividerModule,
    DatePipe,
  ],
  template: `
    <div class="detail-container">
      <!-- Loading -->
      @if (loading()) {
        <div class="loading-center"><mat-spinner diameter="48" /></div>
      }

      @if (!loading() && room()) {
        <!-- Header -->
        <div class="detail-header">
          <button mat-icon-button [routerLink]="['/rooms']">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div class="header-info">
            <div class="header-title">
              <mat-icon>{{ room()!.isPrivate ? 'lock' : 'public' }}</mat-icon>
              <h1>{{ room()!.name }}</h1>
              @if (room()!.currentUserRole) {
                <span class="role-badge" [class]="room()!.currentUserRole ?? ''">
                  {{ room()!.currentUserRole }}
                </span>
              }
            </div>
            <p class="room-desc">{{ room()!.description || 'No description.' }}</p>
            <div class="room-tags">
              @for (tag of room()!.tags; track tag) {
                <mat-chip>{{ tag }}</mat-chip>
              }
            </div>
          </div>
          <div class="header-actions">
            @if (roomsStore.selectedRoomIsAdmin()) {
              <button mat-stroked-button [routerLink]="['/rooms', room()!._id, 'edit']">
                <mat-icon>edit</mat-icon> Edit
              </button>
            }
            <!-- Chat button placeholder - Day 3 -->
            <button mat-raised-button color="primary" disabled>
              <mat-icon>chat</mat-icon> Chat (Day 3)
            </button>
          </div>
        </div>

        <mat-divider />

        <div class="detail-body">
          <!-- Members Panel -->
          <mat-card class="members-card">
            <mat-card-header>
              <mat-card-title>
                <mat-icon>group</mat-icon>
                Members ({{ room()!.memberCount }})
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <!-- Invite (admin only) -->
              @if (roomsStore.selectedRoomIsAdmin()) {
                <div class="invite-row">
                  <mat-icon>person_add</mat-icon>
                  <span class="invite-note">
                    Invite by sharing the room link or use the API. Full invite UI coming soon.
                  </span>
                </div>
                <mat-divider />
              }

              <!-- Member list -->
              <mat-list>
                @for (member of room()!.members; track member.userId) {
                  <mat-list-item class="member-item">
                    <div class="member-avatar" matListItemAvatar>
                      @if (member.avatarUrl) {
                        <img [src]="member.avatarUrl" [alt]="member.displayName" />
                      } @else {
                        <div class="avatar-placeholder">
                          {{ member.displayName.charAt(0).toUpperCase() }}
                        </div>
                      }
                    </div>

                    <div matListItemTitle class="member-name">
                      {{ member.displayName }}
                      @if (member.userId === room()!.ownerId) {
                        <mat-icon class="owner-icon" matTooltip="Room Owner">star</mat-icon>
                      }
                      @if (member.userId === authStore.user()?.id) {
                        <span class="you-label">(you)</span>
                      }
                    </div>

                    <div matListItemLine class="member-meta">
                      Joined {{ member.joinedAt | date: 'MMM d, y' }}
                    </div>

                    <div matListItemMeta class="member-actions">
                      <!-- Role selector for admins (not for owner) -->
                      @if (
                        roomsStore.selectedRoomIsAdmin() &&
                        member.userId !== room()!.ownerId &&
                        member.userId !== authStore.user()?.id
                      ) {
                        <mat-select
                          [value]="member.role"
                          (selectionChange)="updateRole(member, $event.value)"
                          class="role-select"
                        >
                          <mat-option value="admin">Admin</mat-option>
                          <mat-option value="editor">Editor</mat-option>
                          <mat-option value="viewer">Viewer</mat-option>
                        </mat-select>
                        <button
                          mat-icon-button
                          color="warn"
                          (click)="removeMember(member)"
                          matTooltip="Remove member"
                        >
                          <mat-icon>person_remove</mat-icon>
                        </button>
                      } @else {
                        <span class="role-badge-sm" [class]="member.role">{{ member.role }}</span>
                      }
                    </div>
                  </mat-list-item>
                  <mat-divider />
                }
              </mat-list>
            </mat-card-content>
          </mat-card>

          <!-- Resources placeholder (Day 4) -->
          <mat-card class="resources-card">
            <mat-card-header>
              <mat-card-title> <mat-icon>folder</mat-icon> Resources </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="coming-soon">
                <mat-icon>upload_file</mat-icon>
                <p>File uploads and AI quiz generation coming soon</p>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .detail-container {
        min-height: 100vh;
        background: #f8f9fa;
      }
      .loading-center {
        display: flex;
        justify-content: center;
        padding: 4rem;
      }

      .detail-header {
        display: flex;
        align-items: flex-start;
        gap: 1rem;
        padding: 1.5rem;
        background: white;
        border-bottom: 1px solid #e0e0e0;
      }
      .header-info {
        flex: 1;
      }
      .header-title {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
      }
      .header-title h1 {
        margin: 0;
        font-size: 1.5rem;
      }
      .header-title mat-icon {
        color: #888;
      }
      .room-desc {
        margin: 0 0 0.75rem;
        color: #666;
        font-size: 0.9rem;
      }
      .room-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 0.25rem;
      }
      .header-actions {
        display: flex;
        gap: 0.75rem;
        align-items: flex-start;
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

      .detail-body {
        display: grid;
        grid-template-columns: 340px 1fr;
        gap: 1.5rem;
        padding: 1.5rem;
      }

      .members-card mat-card-title {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .invite-row {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem;
        background: #f3f4ff;
        border-radius: 8px;
        margin-bottom: 1rem;
        font-size: 0.85rem;
        color: #555;
      }

      .member-item {
        height: auto !important;
        padding: 0.5rem 0;
      }
      .member-avatar img {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        object-fit: cover;
      }
      .avatar-placeholder {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 0.9rem;
      }
      .member-name {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        font-weight: 500;
      }
      .owner-icon {
        font-size: 0.9rem;
        width: 0.9rem;
        height: 0.9rem;
        color: #f59e0b;
      }
      .you-label {
        font-size: 0.75rem;
        color: #888;
      }
      .member-meta {
        font-size: 0.75rem;
        color: #999;
      }
      .member-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .role-select {
        width: 90px;
        font-size: 0.8rem;
      }
      .role-badge-sm {
        font-size: 0.65rem;
        padding: 1px 6px;
        border-radius: 10px;
        font-weight: 600;
      }
      .role-badge-sm.admin {
        background: #e8f5e9;
        color: #2e7d32;
      }
      .role-badge-sm.editor {
        background: #e3f2fd;
        color: #1565c0;
      }
      .role-badge-sm.viewer {
        background: #f3e5f5;
        color: #6a1b9a;
      }

      .resources-card {
        height: fit-content;
      }
      .resources-card mat-card-title {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .coming-soon {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        padding: 2rem;
        color: #ccc;
        text-align: center;
      }
      .coming-soon mat-icon {
        font-size: 3rem;
        width: 3rem;
        height: 3rem;
      }
      .coming-soon p {
        margin: 0;
        font-size: 0.875rem;
        color: #aaa;
      }
    `,
  ],
})
export class RoomDetailComponent implements OnInit {
  private readonly roomsService = inject(RoomsService);
  readonly roomsStore = inject(RoomsStore);
  readonly authStore = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  readonly loading = signal(true);
  readonly room = this.roomsStore.selectedRoom;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      void this.router.navigate(['/rooms']);
      return;
    }

    this.roomsService.getRoomById(id).subscribe({
      next: () => this.loading.set(false),
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Room not found', 'Close', { duration: 3000 });
        void this.router.navigate(['/rooms']);
      },
    });
  }

  updateRole(member: RoomMember, newRole: RoomRole): void {
    const currentRoom = this.room();
    if (!currentRoom) return;

    this.roomsService.updateMemberRole(currentRoom._id, member.userId, newRole).subscribe({
      next: () =>
        this.snackBar.open(`${member.displayName}'s role updated to ${newRole}`, 'Close', {
          duration: 3000,
        }),
      error: () => this.snackBar.open('Failed to update role', 'Close', { duration: 3000 }),
    });
  }

  removeMember(member: RoomMember): void {
    const currentRoom = this.room();
    if (!currentRoom) return;

    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Remove Member',
        message: `Remove ${member.displayName} from this room?`,
        confirmLabel: 'Remove',
        danger: true,
      },
    });

    ref.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;
      this.roomsService.removeMember(currentRoom._id, member.userId).subscribe({
        next: () =>
          this.snackBar.open(`${member.displayName} removed`, 'Close', { duration: 3000 }),
        error: () => this.snackBar.open('Failed to remove member', 'Close', { duration: 3000 }),
      });
    });
  }
}
