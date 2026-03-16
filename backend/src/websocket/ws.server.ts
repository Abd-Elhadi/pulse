import {WebSocketServer, WebSocket} from "ws";
import {IncomingMessage, Server} from "http";
import {verifyAccessToken, JwtPayload} from "../utils/jwt";
import {handleClientEvent} from "./ws.handlers";
import {ServerEvent} from "./ws.types";

export interface AuthenticatedSocket extends WebSocket {
    userId: string;
    displayName: string;
    avatarUrl: string;
    roomIds: Set<string>;
    isAlive: boolean;
}

const roomSockets = new Map<string, Set<AuthenticatedSocket>>();

const userSockets = new Map<string, AuthenticatedSocket>();

const typingUsers = new Map<string, Map<string, string>>();

export const sendToSocket = (
    socket: AuthenticatedSocket,
    event: ServerEvent,
): void => {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(event));
    }
};

export const broadcastToRoom = (
    roomId: string,
    event: ServerEvent,
    excludeUserId?: string,
): void => {
    const sockets = roomSockets.get(roomId);
    if (!sockets) return;

    for (const socket of sockets) {
        if (excludeUserId && socket.userId === excludeUserId) continue;
        sendToSocket(socket, event);
    }
};

export const getOnlineUsers = (
    roomId: string,
): {userId: string; displayName: string}[] => {
    const sockets = roomSockets.get(roomId);
    if (!sockets) return [];
    return Array.from(sockets).map((s) => ({
        userId: s.userId,
        displayName: s.displayName,
    }));
};

export const getTypingUsers = (
    roomId: string,
): {userId: string; displayName: string}[] => {
    const map = typingUsers.get(roomId);
    if (!map) return [];
    return Array.from(map.entries()).map(([userId, displayName]) => ({
        userId,
        displayName,
    }));
};

export const addToRoom = (
    roomId: string,
    socket: AuthenticatedSocket,
): void => {
    if (!roomSockets.has(roomId)) {
        roomSockets.set(roomId, new Set());
    }
    roomSockets.get(roomId)!.add(socket);
    socket.roomIds.add(roomId);
};

export const removeFromRoom = (
    roomId: string,
    socket: AuthenticatedSocket,
): void => {
    roomSockets.get(roomId)?.delete(socket);
    if (roomSockets.get(roomId)?.size === 0) {
        roomSockets.delete(roomId);
    }
    socket.roomIds.delete(roomId);

    typingUsers.get(roomId)?.delete(socket.userId);
};

export const setTyping = (
    roomId: string,
    userId: string,
    displayName: string,
    isTyping: boolean,
): void => {
    if (!typingUsers.has(roomId)) {
        typingUsers.set(roomId, new Map());
    }
    if (isTyping) {
        typingUsers.get(roomId)!.set(userId, displayName);
    } else {
        typingUsers.get(roomId)!.delete(userId);
    }
};

const authenticateSocket = (request: IncomingMessage): JwtPayload | null => {
    try {
        const url = new URL(
            request.url ?? "",
            `http://${request.headers.host}`,
        );
        const token = url.searchParams.get("token");
        if (!token) return null;
        return verifyAccessToken(token);
    } catch {
        return null;
    }
};

const handleDisconnect = (socket: AuthenticatedSocket): void => {
    userSockets.delete(socket.userId);

    for (const roomId of socket.roomIds) {
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

        broadcastToRoom(roomId, {
            type: "typing_update",
            roomId,
            typingUsers: getTypingUsers(roomId),
        });
    }
};

export const createWsServer = (httpServer: Server): WebSocketServer => {
    const wss = new WebSocketServer({server: httpServer});

    const heartbeatInterval = setInterval(() => {
        wss.clients.forEach((client) => {
            const socket = client as AuthenticatedSocket;
            if (!socket.isAlive) {
                handleDisconnect(socket);
                socket.terminate();
                return;
            }
            socket.isAlive = false;
            socket.ping();
        });
    }, 30_000);

    wss.on("close", () => clearInterval(heartbeatInterval));

    wss.on("connection", (ws: WebSocket, request: IncomingMessage) => {
        const payload = authenticateSocket(request);

        if (!payload) {
            ws.close(4001, "Unauthorized");
            return;
        }

        const existing = userSockets.get(payload.userId);
        if (existing) {
            handleDisconnect(existing);
            existing.close(4000, "Replaced by new connection");
        }

        const socket = ws as AuthenticatedSocket;
        socket.userId = payload.userId;
        socket.displayName = "";
        socket.avatarUrl = "";
        socket.roomIds = new Set();
        socket.isAlive = true;

        userSockets.set(payload.userId, socket);

        socket.on("pong", () => {
            socket.isAlive = true;
        });

        import("../models/users/User.js")
            .then(({UserModel}) => {
                UserModel.findById(payload.userId)
                    .lean()
                    .then((user) => {
                        if (user) {
                            socket.displayName = user.displayName;
                            socket.avatarUrl = user.avatarUrl;
                        }

                        sendToSocket(socket, {
                            type: "connected",
                            userId: payload.userId,
                            displayName: socket.displayName,
                        });
                    })
                    .catch(console.error);
            })
            .catch(console.error);

        socket.on("message", (data: Buffer) => {
            try {
                const event = JSON.parse(data.toString()) as unknown;
                handleClientEvent(socket, event);
            } catch {
                sendToSocket(socket, {
                    type: "error",
                    message: "Invalid message format",
                });
            }
        });

        socket.on("close", () => handleDisconnect(socket));

        socket.on("error", (err) => {
            console.error(`WS error for user ${socket.userId}:`, err);
            handleDisconnect(socket);
        });
    });

    console.log("🔌 WebSocket server attached");
    return wss;
};
