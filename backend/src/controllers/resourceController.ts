import {
    PutObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand,
} from "@aws-sdk/client-s3";

import {SendMessageCommand} from "@aws-sdk/client-sqs";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";
import {v4 as uuidv4} from "uuid";

import {s3Client, sqsClient, getS3Bucket, getSqsQueueUrl} from "../config/aws";

import {AiJobModel} from "../models/AI.Job";
import {IResource, ResourceModel} from "../models/Resource";
import {RoomModel} from "../models/Room";
import {UserModel} from "../models/User";

import {
    ResourceResponse,
    PresignedUploadResponse,
    ConfirmUploadBody,
} from "../types/resource";

const PRESIGNED_URL_EXPIRES = 300;
const DOWNLOAD_URL_EXPIRES = 3600;

const getDownloadUrl = async (s3Key: string): Promise<string> => {
    return getSignedUrl(
        s3Client,
        new GetObjectCommand({
            Bucket: getS3Bucket(),
            Key: s3Key,
        }),
        {expiresIn: DOWNLOAD_URL_EXPIRES},
    );
};

const toResourceResponse = async (
    resource: IResource,
): Promise<ResourceResponse> => ({
    _id: resource._id.toString(),
    roomId: resource.roomId,
    uploadedBy: resource.uploadedBy,
    uploaderDisplayName: resource.uploaderDisplayName,
    fileName: resource.fileName,
    fileType: resource.fileType,
    mimeType: resource.mimeType,
    sizeBytes: resource.sizeBytes,
    downloadUrl: await getDownloadUrl(resource.s3Key),
    aiJobId: resource.aiJobId,
    aiStatus: resource.aiStatus,
    createdAt: resource.createdAt.toISOString(),
});

export const getPresignedUploadUrl = async (
    roomId: string,
    userId: string,
    mimeType: string,
    fileName: string,
): Promise<PresignedUploadResponse> => {
    if (!["application/pdf", "image/jpeg"].includes(mimeType)) {
        throw new Error("INVALID_FILE_TYPE");
    }
    const room = await RoomModel.findById(roomId);
    if (!room) throw new Error("ROOM_NOT_FOUND");

    const isMember = room.members.some((m) => m.userId === userId);
    const isOwner = room.ownerId === userId;
    if (!isMember && !isOwner) throw new Error("FORBIDDEN");

    const ext = fileName.split(".").pop() ?? "bin";
    const s3Key = `rooms/${roomId}/resources/${uuidv4()}.${ext}`;

    const uploadUrl = await getSignedUrl(
        s3Client,
        new PutObjectCommand({
            Bucket: getS3Bucket(),
            Key: s3Key,
            ContentType: mimeType,
        }),
        {expiresIn: PRESIGNED_URL_EXPIRES},
    );

    return {uploadUrl, s3Key};
};

export const confirmUpload = async (
    roomId: string,
    userId: string,
    body: ConfirmUploadBody,
): Promise<ResourceResponse> => {
    const user = await UserModel.findById(userId);
    if (!user) throw new Error("USER_NOT_FOUND");

    const room = await RoomModel.findById(roomId);
    if (!room) throw new Error("ROOM_NOT_FOUND");

    const isMember = room.members.some((m) => m.userId === userId);
    const isOwner = room.ownerId === userId;
    if (!isMember && !isOwner) throw new Error("FORBIDDEN");

    const resource = await ResourceModel.create({
        roomId,
        uploadedBy: userId,
        uploaderDisplayName: user.displayName,
        fileName: body.fileName,
        fileType: body.fileType,
        mimeType: body.mimeType,
        sizeBytes: body.sizeBytes,
        s3Key: body.s3Key,
        aiJobId: null,
        aiStatus: body.generateQuiz ? "pending" : "completed",
    });

    if (body.fileType === "pdf" && body.generateQuiz) {
        const aiJob = await AiJobModel.create({
            jobType: "quiz",
            status: "pending",
            resourceId: resource._id.toString(),
            roomId,
            requestedBy: userId,
        });

        resource.aiJobId = aiJob._id.toString();
        await resource.save();

        await sqsClient.send(
            new SendMessageCommand({
                QueueUrl: getSqsQueueUrl(),
                MessageBody: JSON.stringify({
                    jobId: aiJob._id.toString(),
                    resourceId: resource._id.toString(),
                    roomId,
                    s3Key: body.s3Key,
                    fileName: body.fileName,
                }),
            }),
        );
    }

    return await toResourceResponse(resource);
};

export const getRoomResources = async (
    roomId: string,
    userId: string,
): Promise<ResourceResponse[]> => {
    const room = await RoomModel.findById(roomId);
    if (!room) throw new Error("ROOM_NOT_FOUND");

    const isMember = room.members.some((m) => m.userId === userId);
    const isOwner = room.ownerId === userId;
    if (!isMember && !isOwner) throw new Error("FORBIDDEN");

    const resources = await ResourceModel.find({roomId}).sort({createdAt: -1});
    return Promise.all(resources.map(toResourceResponse));
};

export const deleteResource = async (
    resourceId: string,
    userId: string,
): Promise<void> => {
    const resource = await ResourceModel.findById(resourceId);
    if (!resource) throw new Error("RESOURCE_NOT_FOUND");

    const room = await RoomModel.findById(resource.roomId);
    if (!room) throw new Error("ROOM_NOT_FOUND");

    const isOwner = room.ownerId === userId;
    const isUploader = resource.uploadedBy === userId;
    const member = room.members.find((m) => m.userId === userId);
    const isRoomAdmin = member?.role === "admin";

    if (!isOwner && !isUploader && !isRoomAdmin) {
        throw new Error("FORBIDDEN");
    }

    await s3Client.send(
        new DeleteObjectCommand({Bucket: getS3Bucket(), Key: resource.s3Key}),
    );

    await ResourceModel.findByIdAndDelete(resourceId);
};
