export interface MessageResponse {
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
    messages: MessageResponse[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
}
