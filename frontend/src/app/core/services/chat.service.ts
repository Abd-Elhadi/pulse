import { Injectable, inject, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { ChatStore } from '../../features/chat/chat.store';
import { AuthStore } from '../auth/auth.store';
import { WsServerEvent, PaginatedMessagesResponse } from '../../core/models/chat.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ChatService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly chatStore = inject(ChatStore);
  private readonly authStore = inject(AuthStore);

  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private typingTimer: ReturnType<typeof setTimeout> | null = null;
  private currentRoomId: string | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;

  connect(): void {
    if (this.socket?.readyState === WebSocket.OPEN) return;

    const token = this.authStore.accessToken();
    if (!token) return;

    const url = `${environment.wsUrl}?token=${encodeURIComponent(token)}`;
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      this.chatStore.setConnected(true);
      this.reconnectAttempts = 0;

      if (this.currentRoomId) {
        this.joinRoom(this.currentRoomId);
      }
    };

    this.socket.onmessage = (event: MessageEvent<string>) => {
      try {
        const serverEvent = JSON.parse(event.data) as WsServerEvent;
        this.handleServerEvent(serverEvent);
      } catch {
        console.error('Failed to parse WS message');
      }
    };

    this.socket.onclose = (event) => {
      this.chatStore.setConnected(false);

      if (event.code === 4000 || event.code === 4001) return;

      this.scheduleReconnect();
    };

    this.socket.onerror = () => {
      this.chatStore.setConnected(false);
    };
  }

  disconnect(): void {
    this.clearReconnectTimer();
    if (this.socket) {
      this.socket.close(4000, 'Client disconnect');
      this.socket = null;
    }
    this.chatStore.setConnected(false);
    this.currentRoomId = null;
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;

    this.reconnectAttempts++;
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30_000);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  joinRoom(roomId: string): void {
    this.currentRoomId = roomId;
    this.chatStore.setCurrentRoom(roomId);
    this.send({ type: 'join_room', roomId });
  }

  leaveRoom(roomId: string): void {
    this.send({ type: 'leave_room', roomId });
    this.chatStore.clearRoom();
    this.currentRoomId = null;
  }

  sendMessage(roomId: string, content: string): void {
    this.send({ type: 'send_message', roomId, content });
    this.stopTyping(roomId);
  }

  startTyping(roomId: string): void {
    this.send({ type: 'typing_start', roomId });

    if (this.typingTimer) clearTimeout(this.typingTimer);
    this.typingTimer = setTimeout(() => this.stopTyping(roomId), 3000);
  }

  stopTyping(roomId: string): void {
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
      this.typingTimer = null;
    }
    this.send({ type: 'typing_stop', roomId });
  }

  loadMessageHistory(roomId: string, page = 1, limit = 50): Observable<PaginatedMessagesResponse> {
    this.chatStore.setLoadingHistory(true);
    return this.http
      .get<PaginatedMessagesResponse>(`${environment.apiUrl}/rooms/${roomId}/messages`, {
        params: { page, limit },
      })
      .pipe(
        tap((res) => {
          this.chatStore.prependMessages(res.messages);
          this.chatStore.setHasMore(res.hasMore);
          this.chatStore.setLoadingHistory(false);
        }),
      );
  }

  private send(event: object): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(event));
    }
  }

  private handleServerEvent(event: WsServerEvent): void {
    switch (event.type) {
      case 'connected':
        break;

      case 'new_message':
        this.chatStore.addMessage(event.message);
        break;

      case 'presence_update':
        this.chatStore.setOnlineUsers(event.onlineUsers);
        break;

      case 'typing_update':
        this.chatStore.setTypingUsers(event.typingUsers);
        break;

      case 'user_joined':
      case 'user_left':
        break;

      case 'error':
        console.error('WS server error:', event.message);
        break;
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
