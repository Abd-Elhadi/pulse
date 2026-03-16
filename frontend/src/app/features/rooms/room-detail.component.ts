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
import { RoomsStore } from './rooms.store';
import { AuthStore } from '../../core/auth/auth.store';
import { RoomMember, RoomRole } from '../../core/models/room.models';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component.ts';
import { DatePipe } from '@angular/common';
import { ChatComponent } from '../chat/chat';
import { MatTabsModule } from '@angular/material/tabs';

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
    MatTabsModule,
    ChatComponent,
  ],
  template: `
    <div class="detail-container">
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
            </div>
            <p class="room-desc">{{ room()!.description || 'No description.' }}</p>
          </div>
          @if (roomsStore.selectedRoomIsAdmin()) {
            <button mat-stroked-button [routerLink]="['/rooms', room()!._id, 'edit']">
              <mat-icon>edit</mat-icon> Edit
            </button>
          }
        </div>

        <mat-divider />

        <mat-tab-group class="detail-tabs" animationDuration="150ms">
          <mat-tab>
            <ng-template mat-tab-label> <mat-icon>chat</mat-icon>&nbsp;Chat </ng-template>
            <div class="tab-chat">
              <app-chat [roomId]="room()!._id" />
            </div>
          </mat-tab>

          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon>group</mat-icon>&nbsp;Members ({{ room()!.memberCount }})
            </ng-template>
            <div class="tab-content">
              <mat-list>
                @for (member of room()!.members; track member.userId) {
                  <mat-list-item class="member-item">
                    <div matListItemTitle class="member-name">
                      {{ member.displayName }}
                      @if (member.userId === room()!.ownerId) {
                        <mat-icon class="owner-icon" matTooltip="Owner">star</mat-icon>
                      }
                      @if (member.userId === authStore.user()?.id) {
                        <span class="you-label">(you)</span>
                      }
                    </div>
                    <div matListItemMeta class="member-actions">
                      @if (
                        roomsStore.selectedRoomIsAdmin() &&
                        member.userId !== room()!.ownerId &&
                        member.userId !== authStore.user()?.id
                      ) {
                        <button
                          mat-icon-button
                          color="warn"
                          (click)="removeMember(member)"
                          matTooltip="Remove"
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
            </div>
          </mat-tab>

          <mat-tab>
            <ng-template mat-tab-label> <mat-icon>folder</mat-icon>&nbsp;Resources </ng-template>
            <div class="tab-content coming-soon">
              <mat-icon>upload_file</mat-icon>
              <h3>Resources & AI Quiz</h3>
              <p>Upload PDFs and generate AI-powered quizzes — coming soon</p>
            </div>
          </mat-tab>
        </mat-tab-group>
      }
    </div>
  `,
  styles: [
    `
      .detail-container {
        display: flex;
        flex-direction: column;
        height: 100vh;
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
        padding: 1rem 1.5rem;
        background: white;
        border-bottom: 1px solid #e0e0e0;
        flex-shrink: 0;
      }
      .header-info {
        flex: 1;
      }
      .header-title {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.25rem;
      }
      .header-title h1 {
        margin: 0;
        font-size: 1.35rem;
      }
      .header-title mat-icon {
        color: #888;
      }
      .room-desc {
        margin: 0 0 0.5rem;
        color: #666;
        font-size: 0.875rem;
      }
      .room-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 0.25rem;
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

      .detail-tabs {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
      }

      ::ng-deep .detail-tabs .mat-mdc-tab-body-wrapper {
        flex: 1;
        min-height: 0;
      }
      ::ng-deep .detail-tabs .mat-mdc-tab-body-content {
        height: 100%;
        overflow: hidden;
      }

      .tab-chat {
        height: 100%;
        display: flex;
        flex-direction: column;
      }
      .tab-content {
        padding: 1.5rem;
        overflow-y: auto;
        height: 100%;
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
      .member-avatar img,
      .avatar-placeholder {
        width: 36px;
        height: 36px;
        border-radius: 50%;
      }
      .member-avatar img {
        object-fit: cover;
      }
      .avatar-placeholder {
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

      .coming-soon {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        color: #ccc;
        text-align: center;
        mat-icon {
          font-size: 4rem;
          width: 4rem;
          height: 4rem;
        }
        h3 {
          margin: 0;
          color: #555;
        }
        p {
          margin: 0;
          font-size: 0.875rem;
          color: #aaa;
        }
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

  removeMember(member: RoomMember): void {
    const currentRoom = this.room();
    if (!currentRoom) return;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Remove Member',
        message: `Remove ${member.displayName}?`,
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
