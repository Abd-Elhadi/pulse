import {
  Component,
  inject,
  signal,
  OnInit,
  OnDestroy,
  AfterViewChecked,
  ViewChild,
  ElementRef,
  Input,
  DestroyRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChatService } from '../../core/services/chat.service';
import { ChatStore } from './chat.store';
import { AuthStore } from '../../core/auth/auth.store';
import { Message } from '../../core/models/chat.models';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDividerModule,
    DatePipe,
  ],
  template: `
    <div class="chat-wrapper">
      <div class="chat-main">
        @if (!chatStore.connected()) {
          <div class="status-bar disconnected">
            <mat-icon>wifi_off</mat-icon>
            Reconnecting...
          </div>
        }

        @if (chatStore.hasMore()) {
          <div class="load-more">
            @if (chatStore.loadingHistory()) {
              <mat-spinner diameter="24" />
            } @else {
              <button mat-button (click)="loadMore()">
                <mat-icon>expand_less</mat-icon> Load earlier messages
              </button>
            }
          </div>
        }

        <div class="messages-list" #messagesList>
          @if (chatStore.messages().length === 0 && !chatStore.loadingHistory()) {
            <div class="empty-chat">
              <mat-icon>chat_bubble_outline</mat-icon>
              <p>No messages yet. Say hello! 👋</p>
            </div>
          }

          @for (message of chatStore.messages(); track message._id) {
            <div
              class="message-row"
              [class.own-message]="message.senderId === authStore.user()?.id"
            >
              <div class="msg-avatar">
                @if (message.senderAvatarUrl) {
                  <img [src]="message.senderAvatarUrl" [alt]="message.senderDisplayName" />
                } @else {
                  <div class="avatar-fallback">
                    {{ message.senderDisplayName.charAt(0).toUpperCase() }}
                  </div>
                }
              </div>

              <div class="msg-content">
                <div class="msg-header">
                  <span class="msg-sender">
                    {{
                      message.senderId === authStore.user()?.id ? 'You' : message.senderDisplayName
                    }}
                  </span>
                  <span class="msg-time">
                    {{ message.createdAt | date: 'h:mm a' }}
                  </span>
                </div>
                <div class="msg-bubble">{{ message.content }}</div>
              </div>
            </div>
          }
        </div>

        @if (chatStore.typingLabel()) {
          <div class="typing-indicator">
            <span class="typing-dots"> <span></span><span></span><span></span> </span>
            {{ chatStore.typingLabel() }}
          </div>
        }

        <div class="chat-input-area">
          <mat-form-field appearance="outline" class="message-field">
            <input
              matInput
              [(ngModel)]="messageText"
              placeholder="Type a message..."
              (keydown.enter)="sendMessage()"
              (input)="onInput()"
              maxlength="2000"
              [disabled]="!chatStore.connected()"
              #messageInput
            />
          </mat-form-field>
          <button
            mat-fab
            color="primary"
            (click)="sendMessage()"
            [disabled]="!messageText.trim() || !chatStore.connected()"
            matTooltip="Send message"
          >
            <mat-icon>send</mat-icon>
          </button>
        </div>
      </div>

      <div class="presence-panel">
        <div class="presence-header">
          <mat-icon>circle</mat-icon>
          Online — {{ chatStore.onlineCount() }}
        </div>
        <mat-divider />
        <div class="presence-list">
          @for (user of chatStore.onlineUsers(); track user.userId) {
            <div class="presence-user">
              <div class="presence-avatar">{{ user.displayName.charAt(0).toUpperCase() }}</div>
              <span class="presence-name">
                {{ user.userId === authStore.user()?.id ? 'You' : user.displayName }}
              </span>
              <div class="online-dot"></div>
            </div>
          }
          @if (chatStore.onlineUsers().length === 0) {
            <p class="no-users">No one online yet</p>
          }
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .chat-wrapper {
        display: flex;
        height: 100%;
        min-height: 0;
      }

      .chat-main {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-width: 0;
        background: #fafafa;
      }

      .status-bar {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        font-size: 0.8rem;
        &.disconnected {
          background: #fff3e0;
          color: #e65100;
        }
      }

      .load-more {
        display: flex;
        justify-content: center;
        padding: 0.75rem;
      }

      .messages-list {
        flex: 1;
        overflow-y: auto;
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .empty-chat {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        margin: auto;
        color: #ccc;
        mat-icon {
          font-size: 3rem;
          width: 3rem;
          height: 3rem;
        }
        p {
          margin: 0;
          font-size: 0.875rem;
          color: #aaa;
        }
      }

      .message-row {
        display: flex;
        gap: 0.75rem;
        align-items: flex-end;
        max-width: 75%;

        &.own-message {
          flex-direction: row-reverse;
          align-self: flex-end;

          .msg-bubble {
            background: #667eea;
            color: white;
            border-radius: 18px 18px 4px 18px;
          }
          .msg-header {
            flex-direction: row-reverse;
          }
        }

        &:not(.own-message) {
          align-self: flex-start;
          .msg-bubble {
            background: white;
            border: 1px solid #e8e8e8;
            border-radius: 18px 18px 18px 4px;
          }
        }
      }

      .msg-avatar {
        flex-shrink: 0;
        img,
        .avatar-fallback {
          width: 32px;
          height: 32px;
          border-radius: 50%;
        }
        img {
          object-fit: cover;
        }
        .avatar-fallback {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          font-weight: 600;
        }
      }

      .msg-content {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
        min-width: 0;
      }

      .msg-header {
        display: flex;
        gap: 0.5rem;
        align-items: baseline;
        padding: 0 0.25rem;
      }
      .msg-sender {
        font-size: 0.75rem;
        font-weight: 600;
        color: #555;
      }
      .msg-time {
        font-size: 0.7rem;
        color: #aaa;
      }

      .msg-bubble {
        padding: 0.5rem 0.875rem;
        font-size: 0.9rem;
        line-height: 1.4;
        word-break: break-word;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
      }

      .typing-indicator {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.25rem 1rem;
        font-size: 0.8rem;
        color: #888;
        min-height: 28px;
      }
      .typing-dots {
        display: flex;
        gap: 3px;
        span {
          width: 5px;
          height: 5px;
          background: #aaa;
          border-radius: 50%;
          animation: bounce 1.2s infinite;
          &:nth-child(2) {
            animation-delay: 0.2s;
          }
          &:nth-child(3) {
            animation-delay: 0.4s;
          }
        }
      }
      @keyframes bounce {
        0%,
        60%,
        100% {
          transform: translateY(0);
        }
        30% {
          transform: translateY(-4px);
        }
      }

      .chat-input-area {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 1rem;
        background: white;
        border-top: 1px solid #e0e0e0;
      }
      .message-field {
        flex: 1;
      }

      .presence-panel {
        width: 200px;
        min-width: 200px;
        background: white;
        border-left: 1px solid #e0e0e0;
        display: flex;
        flex-direction: column;
      }

      .presence-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 1rem;
        font-size: 0.8rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #888;
        mat-icon {
          font-size: 0.75rem;
          width: 0.75rem;
          height: 0.75rem;
          color: #4caf50;
        }
      }

      .presence-list {
        padding: 0.5rem 0;
        overflow-y: auto;
        flex: 1;
      }

      .presence-user {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.4rem 1rem;
      }
      .presence-avatar {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.75rem;
        font-weight: 600;
        flex-shrink: 0;
      }
      .presence-name {
        flex: 1;
        font-size: 0.8rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .online-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #4caf50;
        flex-shrink: 0;
      }
      .no-users {
        font-size: 0.8rem;
        color: #ccc;
        padding: 0.5rem 1rem;
        margin: 0;
      }
    `,
  ],
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @Input({ required: true }) roomId!: string;
  @ViewChild('messagesList') private messagesList!: ElementRef<HTMLDivElement>;

  readonly chatService = inject(ChatService);
  readonly chatStore = inject(ChatStore);
  readonly authStore = inject(AuthStore);
  private readonly destroyRef = inject(DestroyRef);

  messageText = '';
  private shouldScrollToBottom = true;
  private historyPage = 1;

  ngOnInit(): void {
    this.chatStore.clearRoom();

    this.chatService.connect();

    this.chatService
      .loadMessageHistory(this.roomId, 1, 50)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.chatService.joinRoom(this.roomId);
          this.shouldScrollToBottom = true;
        },
      });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy(): void {
    this.chatService.leaveRoom(this.roomId);
  }

  sendMessage(): void {
    const content = this.messageText.trim();
    if (!content || !this.chatStore.connected()) return;

    this.chatService.sendMessage(this.roomId, content);
    this.messageText = '';
    this.shouldScrollToBottom = true;
  }

  onInput(): void {
    if (this.messageText.trim()) {
      this.chatService.startTyping(this.roomId);
    } else {
      this.chatService.stopTyping(this.roomId);
    }
  }

  loadMore(): void {
    this.historyPage++;
    this.chatService
      .loadMessageHistory(this.roomId, this.historyPage, 50)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  private scrollToBottom(): void {
    const el = this.messagesList?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  isConsecutive(message: Message, index: number): boolean {
    if (index === 0) return false;
    const prev = this.chatStore.messages()[index - 1];
    return prev.senderId === message.senderId;
  }
}
