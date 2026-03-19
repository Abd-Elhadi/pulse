import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { RoomsService } from '../../core/services/rooms.service';
import { RoomsStore } from './rooms.store';
import { AuthStore } from '../../core/auth/auth.store';
import { RoomMember, RoomRole } from '../../core/models/room.models';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component.ts';
import { ChatComponent } from '../chat/chat';
import { ResourcesComponent } from '../resources/resources';

@Component({
  selector: 'app-room-detail',
  standalone: true,
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatDialogModule,
    MatListModule,
    MatSelectModule,
    MatDividerModule,
    MatTabsModule,
    ChatComponent,
    ResourcesComponent,
  ],
  template: `
    <div class="detail-container">
      @if (loading()) {
        <div class="loading-center"><mat-spinner diameter="48" /></div>
      }

      @if (!loading() && room()) {
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
            <ng-template mat-tab-label><mat-icon>chat</mat-icon>&nbsp;Chat</ng-template>
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
            <ng-template mat-tab-label><mat-icon>folder</mat-icon>&nbsp;Resources</ng-template>
            <app-resources [roomId]="room()!._id" />
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

      .member-item {
        height: auto !important;
        padding: 0.5rem 0;
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
      next: () => this.snackBar.open(`Role updated to ${newRole}`, 'Close', { duration: 3000 }),
      error: () => this.snackBar.open('Failed to update role', 'Close', { duration: 3000 }),
    });
  }

  removeMember(member: RoomMember): void {
    const currentRoom = this.room();
    if (!currentRoom) return;
    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          title: 'Remove Member',
          message: `Remove ${member.displayName}?`,
          confirmLabel: 'Remove',
          danger: true,
        },
      })
      .afterClosed()
      .subscribe((confirmed: boolean) => {
        if (!confirmed) return;
        this.roomsService.removeMember(currentRoom._id, member.userId).subscribe({
          next: () =>
            this.snackBar.open(`${member.displayName} removed`, 'Close', { duration: 3000 }),
          error: () => this.snackBar.open('Failed to remove member', 'Close', { duration: 3000 }),
        });
      });
  }
}
