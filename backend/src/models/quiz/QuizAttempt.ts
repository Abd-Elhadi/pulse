import mongoose, {Schema, Document, Types} from "mongoose";

interface IAnswer {
    questionId: string;
    selected: string;
}

export interface IQuizAttempt extends Document {
    materialId: Types.ObjectId;
    userId: Types.ObjectId;
    userName: string;
    answers: IAnswer[];
    score: number;
    completedAt: Date;
}

const AnswerSchema = new Schema<IAnswer>({
    questionId: {type: String, required: true},
    selected: {type: String, required: true},
});

const QuizAttemptSchema = new Schema<IQuizAttempt>({
    materialId: {type: Schema.Types.ObjectId, required: true},
    userId: {type: Schema.Types.ObjectId, required: true},
    userName: {type: String, required: true},
    answers: [AnswerSchema],
    score: {type: Number, required: true},
    completedAt: {type: Date, default: Date.now},
});

export const QuizAttemptModel = mongoose.model<IQuizAttempt>(
    "QuizAttempt",
    QuizAttemptSchema,
);
