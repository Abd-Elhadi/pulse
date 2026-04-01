import mongoose, {Document, Schema, Model} from "mongoose";

export interface IQuizQuestion {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
}

export interface IQuiz extends Document {
    _id: mongoose.Types.ObjectId;
    resourceId: string;
    roomId: string;
    title: string;
    questions: IQuizQuestion[];
    createdAt: Date;
    updatedAt: Date;
}

const quizQuestionSchema = new Schema<IQuizQuestion>(
    {
        question: {type: String, required: true},
        options: {type: [String], required: true},
        correctIndex: {type: Number, required: true},
        explanation: {type: String, required: true},
    },
    {_id: false},
);

const quizSchema = new Schema<IQuiz>(
    {
        resourceId: {type: String, required: true},
        roomId: {type: String, required: true},
        title: {type: String, required: true},
        questions: {type: [quizQuestionSchema], required: true},
    },
    {timestamps: true},
);

quizSchema.index({resourceId: 1});
quizSchema.index({roomId: 1, createdAt: -1});

export const QuizModel: Model<IQuiz> = mongoose.model<IQuiz>(
    "Quiz",
    quizSchema,
);
