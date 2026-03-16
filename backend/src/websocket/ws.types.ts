export type ClientEventType =
    | "join_room"
    | "leave_room"
    | "send_message"
    | "typing_start"
    | "typing_stop";

export interface JoinRoomEvent {
    type: "join_room";
    roomId: string;
}

export interface LeaveRoomEvent {
    type: "leave_room";
    roomId: string;
}

export interface SendMessageEvent {
    type: "send_message";
    roomId: string;
    content: string;
}

export interface TypingStartEvent {
    type: "typing_start";
    roomId: string;
}

export interface TypingStopEvent {
    type: "typing_stop";
    roomId: string;
}

export type ClientEvent =
    | JoinRoomEvent
    | LeaveRoomEvent
    | SendMessageEvent
    | TypingStartEvent
    | TypingStopEvent;

export type ServerEventType =
    | "connected"
    | "error"
    | "new_message"
    | "user_joined"
    | "user_left"
    | "presence_update"
    | "typing_update";

export interface ConnectedEvent {
    type: "connected";
    userId: string;
    displayName: string;
}

export interface ErrorEvent {
    type: "error";
    message: string;
}

export interface NewMessageEvent {
    type: "new_message";
    message: {
        _id: string;
        roomId: string;
        senderId: string;
        senderDisplayName: string;
        senderAvatarUrl: string;
        content: string;
        attachmentUrl: string | null;
        createdAt: string;
    };
}

export interface UserJoinedEvent {
    type: "user_joined";
    roomId: string;
    userId: string;
    displayName: string;
}

export interface UserLeftEvent {
    type: "user_left";
    roomId: string;
    userId: string;
    displayName: string;
}

export interface PresenceUpdateEvent {
    type: "presence_update";
    roomId: string;
    onlineUsers: {userId: string; displayName: string}[];
}

export interface TypingUpdateEvent {
    type: "typing_update";
    roomId: string;
    typingUsers: {userId: string; displayName: string}[];
}

export type ServerEvent =
    | ConnectedEvent
    | ErrorEvent
    | NewMessageEvent
    | UserJoinedEvent
    | UserLeftEvent
    | PresenceUpdateEvent
    | TypingUpdateEvent;
