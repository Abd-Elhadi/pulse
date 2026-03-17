export interface ResourceResponse {
    _id: string;
    roomId: string;
    uploadedBy: string;
    uploaderDisplayName: string;
    fileName: string;
    fileType: "pdf" | "image";
    mimeType: string;
    sizeBytes: number;
    downloadUrl: string;
    aiJobId: string | null;
    aiStatus: "pending" | "processing" | "completed" | "failed";
    createdAt: string;
}

export interface PresignedUploadResponse {
    uploadUrl: string;
    s3Key: string;
}

export interface ConfirmUploadBody {
    s3Key: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    fileType: "pdf" | "image";
    generateQuiz?: boolean;
}
