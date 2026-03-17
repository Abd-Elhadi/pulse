import {RoomModel} from "../models/Room";
import {MessageModel} from "../models/Message";
import {ClientEvent} from "./ws.types";
import {
    AuthenticatedSocket,
    sendToSocket,
    broadcastToRoom,
    addToRoom,
    removeFromRoom,
    getOnlineUsers,
    getTypingUsers,
    setTyping,
} from "./ws.server";

export const handleClientEvent = (
    socket: AuthenticatedSocket,
    rawEvent: unknown,
): void => {
    if (
        typeof rawEvent !== "object" ||
        rawEvent === null ||
        !("type" in rawEvent)
    ) {
        sendToSocket(socket, {
            type: "error",
            message: "Event must have a type",
        });
        return;
    }

    const event = rawEvent as ClientEvent;

    switch (event.type) {
        case "join_room":
            handleJoinRoom(socket, event.roomId);
            break;
        case "leave_room":
            handleLeaveRoom(socket, event.roomId);
            break;
        case "send_message":
            handleSendMessage(socket, event.roomId, event.content);
            break;
        case "typing_start":
            handleTyping(socket, event.roomId, true);
            break;
        case "typing_stop":
            handleTyping(socket, event.roomId, false);
            break;
        default:
            sendToSocket(socket, {
                type: "error",
                message: "Unknown event type",
            });
    }
};

const handleJoinRoom = async (
    socket: AuthenticatedSocket,
    roomId: string,
): Promise<void> => {
    try {
        const room = await RoomModel.findById(roomId).lean();

        if (!room) {
            sendToSocket(socket, {type: "error", message: "Room not found"});
            return;
        }

        const isMember = room.members.some((m) => m.userId === socket.userId);
        const isOwner = room.ownerId === socket.userId;

        if (room.isPrivate && !isMember && !isOwner) {
            sendToSocket(socket, {
                type: "error",
                message: "Access denied to private room",
            });
            return;
        }

        if (socket.roomIds.has(roomId)) return;

        addToRoom(roomId, socket);

        broadcastToRoom(
            roomId,
            {
                type: "user_joined",
                roomId,
                userId: socket.userId,
                displayName: socket.displayName,
            },
            socket.userId,
        );

        sendToSocket(socket, {
            type: "presence_update",
            roomId,
            onlineUsers: getOnlineUsers(roomId),
        });

        broadcastToRoom(roomId, {
            type: "presence_update",
            roomId,
            onlineUsers: getOnlineUsers(roomId),
        });
    } catch (err) {
        console.error("handleJoinRoom error:", err);
        sendToSocket(socket, {type: "error", message: "Failed to join room"});
    }
};

const handleLeaveRoom = (socket: AuthenticatedSocket, roomId: string): void => {
    if (!socket.roomIds.has(roomId)) return;

    removeFromRoom(roomId, socket);

    broadcastToRoom(roomId, {
        type: "user_left",
        roomId,
        userId: socket.userId,
        displayName: socket.displayName,
    });

    broadcastToRoom(roomId, {
        type: "presence_update",
        roomId,
        onlineUsers: getOnlineUsers(roomId),
    });
};

const handleSendMessage = async (
    socket: AuthenticatedSocket,
    roomId: string,
    content: string,
): Promise<void> => {
    if (!content || content.trim().length === 0) {
        sendToSocket(socket, {
            type: "error",
            message: "Message cannot be empty",
        });
        return;
    }

    if (content.trim().length > 2000) {
        sendToSocket(socket, {
            type: "error",
            message: "Message too long (max 2000 chars)",
        });
        return;
    }

    if (!socket.roomIds.has(roomId)) {
        sendToSocket(socket, {type: "error", message: "Join the room first"});
        return;
    }

    try {
        const room = await RoomModel.findById(roomId).lean();
        if (!room) {
            sendToSocket(socket, {type: "error", message: "Room not found"});
            return;
        }

        const isMember = room.members.some((m) => m.userId === socket.userId);
        const isOwner = room.ownerId === socket.userId;

        if (!isMember && !isOwner) {
            sendToSocket(socket, {
                type: "error",
                message: "You must be a member to send messages",
            });
            return;
        }

        const message = await MessageModel.create({
            roomId,
            senderId: socket.userId,
            senderDisplayName: socket.displayName,
            senderAvatarUrl: socket.avatarUrl,
            content: content.trim(),
        });

        setTyping(roomId, socket.userId, socket.displayName, false);

        const messagePayload = {
            _id: message._id.toString(),
            roomId: message.roomId,
            senderId: message.senderId,
            senderDisplayName: message.senderDisplayName,
            senderAvatarUrl: message.senderAvatarUrl,
            content: message.content,
            attachmentUrl: message.attachmentUrl,
            createdAt: message.createdAt.toISOString(),
        };

        broadcastToRoom(roomId, {type: "new_message", message: messagePayload});

        broadcastToRoom(roomId, {
            type: "typing_update",
            roomId,
            typingUsers: getTypingUsers(roomId),
        });
    } catch (err) {
        console.error("handleSendMessage error:", err);
        sendToSocket(socket, {
            type: "error",
            message: "Failed to send message",
        });
    }
};

const handleTyping = (
    socket: AuthenticatedSocket,
    roomId: string,
    isTyping: boolean,
): void => {
    if (!socket.roomIds.has(roomId)) return;

    setTyping(roomId, socket.userId, socket.displayName, isTyping);

    broadcastToRoom(
        roomId,
        {
            type: "typing_update",
            roomId,
            typingUsers: getTypingUsers(roomId),
        },
        socket.userId,
    );
};
