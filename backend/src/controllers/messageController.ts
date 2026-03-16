import {MessageModel} from "../models/chat/Message";
import {RoomModel} from "../models/rooms/Room";
import {
    PaginatedMessagesResponse,
    MessageResponse,
} from "../types/message.types";

const toMessageResponse = (msg: {
    _id: {toString(): string};
    roomId: string;
    senderId: string;
    senderDisplayName: string;
    senderAvatarUrl: string;
    content: string;
    attachmentUrl: string | null;
    createdAt: Date;
}): MessageResponse => ({
    _id: msg._id.toString(),
    roomId: msg.roomId,
    senderId: msg.senderId,
    senderDisplayName: msg.senderDisplayName,
    senderAvatarUrl: msg.senderAvatarUrl,
    content: msg.content,
    attachmentUrl: msg.attachmentUrl,
    createdAt: msg.createdAt.toISOString(),
});

export const getMessageHistory = async (
    roomId: string,
    userId: string,
    page: number,
    limit: number,
): Promise<PaginatedMessagesResponse> => {
    const room = await RoomModel.findById(roomId).lean();
    if (!room) throw new Error("ROOM_NOT_FOUND");

    const isMember = room.members.some((m) => m.userId === userId);
    if (room.isPrivate && !isMember && room.ownerId !== userId)
        throw new Error("ROOM_PRIVATE");

    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
        MessageModel.find({roomId})
            .sort({createdAt: -1})
            .skip(skip)
            .limit(limit),
        MessageModel.countDocuments({roomId}),
    ]);

    return {
        messages: messages.map(toMessageResponse),
        total,
        page,
        limit,
        hasMore: skip + messages.length < total,
    };
};
