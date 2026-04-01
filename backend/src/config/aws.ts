import {S3Client} from "@aws-sdk/client-s3";
import {SQSClient} from "@aws-sdk/client-sqs";
import {env} from "./env";

export const s3Client = new S3Client({});
export const sqsClient = new SQSClient({});

export const getS3Bucket = (): string => {
    return env.AWS_S3_BUCKET_NAME;
};

export const getSqsQueueUrl = (): string => {
    return env.AWS_SQS_PULSE_AI_JOBS;
};
