export interface Message {
  _id: string;
  roomId: string;
  senderId: string;
  senderDisplayName: string;
  senderAvatarUrl: string;
  content: string;
  attachmentUrl: string | null;
  createdAt: string;
}

export interface PaginatedMessagesResponse {
  messages: Message[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface OnlineUser {
  userId: string;
  displayName: string;
}

export type ServerEventType =
  | 'connected'
  | 'error'
  | 'new_message'
  | 'user_joined'
  | 'user_left'
  | 'presence_update'
  | 'typing_update';

export interface WsConnectedEvent {
  type: 'connected';
  userId: string;
  displayName: string;
}

export interface WsErrorEvent {
  type: 'error';
  message: string;
}

export interface WsNewMessageEvent {
  type: 'new_message';
  message: Message;
}

export interface WsUserJoinedEvent {
  type: 'user_joined';
  roomId: string;
  userId: string;
  displayName: string;
}

export interface WsUserLeftEvent {
  type: 'user_left';
  roomId: string;
  userId: string;
  displayName: string;
}

export interface WsPresenceUpdateEvent {
  type: 'presence_update';
  roomId: string;
  onlineUsers: OnlineUser[];
}

export interface WsTypingUpdateEvent {
  type: 'typing_update';
  roomId: string;
  typingUsers: OnlineUser[];
}

export type WsServerEvent =
  | WsConnectedEvent
  | WsErrorEvent
  | WsNewMessageEvent
  | WsUserJoinedEvent
  | WsUserLeftEvent
  | WsPresenceUpdateEvent
  | WsTypingUpdateEvent;
