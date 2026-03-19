import { Injectable, signal, computed } from '@angular/core';
import { Message, OnlineUser } from '../../core/models/chat.models';

@Injectable({ providedIn: 'root' })
export class ChatStore {
  private readonly _messages = signal<Message[]>([]);
  private readonly _onlineUsers = signal<OnlineUser[]>([]);
  private readonly _typingUsers = signal<OnlineUser[]>([]);
  private readonly _connected = signal(false);
  private readonly _loadingHistory = signal(false);
  private readonly _hasMore = signal(false);

  readonly messages = this._messages.asReadonly();
  readonly onlineUsers = this._onlineUsers.asReadonly();
  readonly typingUsers = this._typingUsers.asReadonly();
  readonly connected = this._connected.asReadonly();
  readonly loadingHistory = this._loadingHistory.asReadonly();
  readonly hasMore = this._hasMore.asReadonly();

  readonly onlineCount = computed(() => this._onlineUsers().length);

  readonly typingLabel = computed(() => {
    const users = this._typingUsers();
    if (users.length === 0) return '';
    if (users.length === 1) return `${users[0].displayName} is typing...`;
    if (users.length === 2)
      return `${users[0].displayName} and ${users[1].displayName} are typing...`;
    return 'Several people are typing...';
  });

  setConnected(connected: boolean): void {
    this._connected.set(connected);
  }

  setLoadingHistory(loading: boolean): void {
    this._loadingHistory.set(loading);
  }

  setHasMore(hasMore: boolean): void {
    this._hasMore.set(hasMore);
  }

  prependMessages(messages: Message[]): void {
    const chronological = [...messages].reverse();
    this._messages.update((current) => [...chronological, ...current]);
  }

  addMessage(message: Message): void {
    const exists = this._messages().some((m) => m._id === message._id);
    if (!exists) {
      this._messages.update((msgs) => [...msgs, message]);
    }
  }

  setOnlineUsers(users: OnlineUser[]): void {
    this._onlineUsers.set(users);
  }

  setTypingUsers(users: OnlineUser[]): void {
    this._typingUsers.set(users);
  }

  clearRoom(): void {
    this._messages.set([]);
    this._onlineUsers.set([]);
    this._typingUsers.set([]);
    this._hasMore.set(false);
  }
}
