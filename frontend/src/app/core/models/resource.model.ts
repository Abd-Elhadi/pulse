export type ResourceFileType = 'pdf' | 'image';

export interface Resource {
  _id: string;
  roomId: string;
  uploadedBy: string;
  uploaderDisplayName: string;
  fileName: string;
  fileType: ResourceFileType;
  mimeType: string;
  sizeBytes: number;
  downloadUrl: string;
  aiJobId: string | null;
  aiStatus: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
}

export interface PresignedUploadResponse {
  uploadUrl: string;
  s3Key: string;
}

export interface ConfirmUploadPayload {
  s3Key: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  fileType: ResourceFileType;
  generateQuiz?: boolean;
}
