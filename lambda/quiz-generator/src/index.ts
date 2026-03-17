import {SQSEvent, SQSRecord} from "aws-lambda";
import {S3Client, GetObjectCommand} from "@aws-sdk/client-s3";
import {GoogleGenerativeAI} from "@google/generative-ai";
import mongoose, {Schema, model, Model, Document} from "mongoose";

type ResourceFileType = "pdf" | "image";

interface SqsMessageBody {
    jobId: string;
    resourceId: string;
    roomId: string;
    s3Key: string;
    fileName: string;
}

interface QuizQuestion {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
}

interface GeminiQuizResponse {
    title: string;
    questions: QuizQuestion[];
}

interface IAiJob extends Document {
    status: "pending" | "processing" | "completed" | "failed";
    tokensUsed: number | null;
    errorMessage: string | null;
    completedAt: Date | null;
}

const AiJobModel: Model<IAiJob> =
    (mongoose.models["AiJob"] as Model<IAiJob>) ||
    model<IAiJob>(
        "AiJob",
        new Schema(
            {
                status: {
                    type: String,
                    enum: ["pending", "processing", "completed", "failed"],
                    required: true,
                    default: "pending",
                },
                tokensUsed: {type: Number, default: null},
                errorMessage: {type: String, default: null},
                completedAt: {type: Date, default: null},
            },
            {timestamps: true},
        ),
    );

export interface IQuiz extends Document {
    resourceId: string;
    roomId: string;
    title: string;
    questions: QuizQuestion[];
    createdAt: Date;
    updatedAt: Date;
}

const QuizModel: Model<IQuiz> =
    (mongoose.models["Quiz"] as Model<IQuiz>) ||
    model<IQuiz>(
        "Quiz",
        new Schema(
            {
                resourceId: {type: String, required: true, index: true},
                roomId: {type: String, required: true, index: true},
                title: {type: String, required: true},
                questions: [
                    {
                        question: {type: String, required: true},
                        options: {
                            type: [String],
                            validate: (v: string[]) => v.length === 4,
                        },
                        correctIndex: {
                            type: Number,
                            min: 0,
                            max: 3,
                            required: true,
                        },
                        explanation: {type: String, required: true},
                        _id: false,
                    },
                ],
            },
            {timestamps: true},
        ),
    );

export interface IResource extends Document {
    roomId: string;
    uploadedBy: string;
    uploaderDisplayName: string;
    fileName: string;
    fileType: ResourceFileType;
    mimeType: string;
    sizeBytes: number;
    s3Key: string;
    aiJobId: string | null;
    aiStatus: "pending" | "processing" | "completed" | "failed";
    createdAt: Date;
    updatedAt: Date;
}

const ResourceModel: Model<IResource> =
    (mongoose.models["Resource"] as Model<IResource>) ||
    model<IResource>(
        "Resource",
        new Schema(
            {
                roomId: {type: String, required: true, index: true},
                uploadedBy: {type: String, required: true},
                uploaderDisplayName: {type: String, required: true},
                fileName: {type: String, required: true},
                fileType: {
                    type: String,
                    enum: ["pdf", "image"],
                    required: true,
                },
                mimeType: {type: String, required: true},
                sizeBytes: {type: Number, required: true},
                s3Key: {type: String, required: true, unique: true},
                aiJobId: {type: String, default: null},
                aiStatus: {
                    type: String,
                    enum: ["pending", "processing", "completed", "failed"],
                    default: "pending",
                },
            },
            {timestamps: true},
        ),
    );

let isConnected = false;

const connectDB = async (): Promise<void> => {
    if (isConnected) return;

    const uri = process.env["MONGODB_URI"];
    if (!uri) throw new Error("MONGODB_URI not set");

    await mongoose.connect(uri);
    isConnected = true;
};

const s3 = new S3Client({});

const getPdfFromS3 = async (bucket: string, key: string): Promise<string> => {
    const res = await s3.send(new GetObjectCommand({Bucket: bucket, Key: key}));

    if (!res.Body) throw new Error("Empty S3 body");

    const stream = res.Body as AsyncIterable<Uint8Array>;
    const chunks: Uint8Array[] = [];

    for await (const chunk of stream) {
        chunks.push(chunk);
    }

    return Buffer.concat(chunks).toString("base64");
};

const generateQuizFromPdf = async (
    pdfBase64: string,
    fileName: string,
): Promise<{quiz: GeminiQuizResponse; tokensUsed: number}> => {
    const apiKey = process.env["GOOGLE_AI_API_KEY"];
    if (!apiKey) throw new Error("GOOGLE_AI_API_KEY not set");

    const genAi = new GoogleGenerativeAI(apiKey);

    const model = genAi.getGenerativeModel({
        model: "gemini-3-flash-preview",
    });

    const prompt = `You are an expert educator. Analyze the provided PDF document and create a multiple-choice quiz. Return ONLY a valid JSON object with this exact structure (no markdown, no explanation): { "title": "Quiz title based on the document", "questions": [ { "question": "Clear, specific question about the content", "options": ["Option A", "Option B", "Option C", "Option D"], "correctIndex": 0, "explanation": "Brief explanation of why this is correct" } ] } Requirements: - Generate exactly 5 questions - Each question must have exactly 4 options - correctIndex is 0-based (0, 1, 2, or 3) - Questions should test understanding, not just memorization - Keep questions and options concise and clear - File name for context: ${fileName};
    `;

    const result = await model.generateContent([
        {
            inlineData: {
                data: pdfBase64,
                mimeType: "application/pdf",
            },
        },
        prompt,
    ]);

    const raw = result.response.text();

    const cleaned = raw
        .replace(/```json/i, "")
        .replace(/```/g, "")
        .trim();

    let parsed: GeminiQuizResponse;

    try {
        parsed = JSON.parse(cleaned);
    } catch {
        throw new Error("Invalid JSON from Gemini");
    }

    if (!parsed.title || parsed.questions?.length !== 5) {
        throw new Error("Invalid quiz structure");
    }

    const tokensUsed = result.response.usageMetadata?.totalTokenCount ?? 0;

    return {quiz: parsed, tokensUsed};
};

const processRecord = async (record: SQSRecord): Promise<void> => {
    const body = JSON.parse(record.body) as SqsMessageBody;

    if (!body.jobId || !body.resourceId || !body.s3Key) {
        throw new Error("Invalid SQS message");
    }

    const {jobId, resourceId, roomId, s3Key, fileName} = body;

    await connectDB();

    await AiJobModel.findByIdAndUpdate(jobId, {
        status: "processing",
    });

    try {
        const bucket = process.env["AWS_S3_BUCKET_NAME"];
        if (!bucket) throw new Error("Missing bucket");

        const pdf = await getPdfFromS3(bucket, s3Key);

        const {quiz, tokensUsed} = await generateQuizFromPdf(pdf, fileName);

        await QuizModel.create({
            resourceId,
            roomId,
            title: quiz.title,
            questions: quiz.questions,
        });

        await ResourceModel.findByIdAndUpdate(resourceId, {
            aiStatus: "completed",
        });

        await AiJobModel.findByIdAndUpdate(jobId, {
            status: "completed",
            tokensUsed,
            completedAt: new Date(),
        });
    } catch (err) {
        const error = err as Error;

        await AiJobModel.findByIdAndUpdate(jobId, {
            status: "failed",
            errorMessage: error.message,
            completedAt: new Date(),
        });

        await ResourceModel.findByIdAndUpdate(resourceId, {
            aiStatus: "failed",
        });

        throw error; // important for SQS retry
    }
};

export const handler = async (event: SQSEvent) => {
    const failures: {itemIdentifier: string}[] = [];

    await Promise.all(
        event.Records.map(async (record) => {
            try {
                await processRecord(record);
            } catch {
                failures.push({itemIdentifier: record.messageId});
            }
        }),
    );

    return {batchItemFailures: failures};
};
