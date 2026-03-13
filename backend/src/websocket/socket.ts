import {Server} from "socket.io";

export const setupSocket = (server: any): void => {
    const io = new Server(server, {
        cors: {
            origin: "*",
        },
    });

    io.on("connection", (socket) => {
        socket.on("room:join", (roomId) => {
            socket.join(roomId);
        });

        socket.on("chat:message", (data) => {
            io.to(data.roomId).emit("chat:message", data);
        });
    });
};
