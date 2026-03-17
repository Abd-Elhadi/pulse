import {QuizModel} from "../models/Quiz";
import {AiJobModel} from "../models/AI.Job";
import {RoomModel} from "../models/Room";
import {QuizResponse, SubmitAttemptBody, AttemptResult} from "../types/quiz";

const toQuizResponse = (quiz: {
    _id: {toString(): string};
    resourceId: string;
    roomId: string;
    title: string;
    questions: {
        question: string;
        options: string[];
        correctIndex: number;
        explanation: string;
    }[];
    createdAt: Date;
}): QuizResponse => ({
    _id: quiz._id.toString(),
    resourceId: quiz.resourceId,
    roomId: quiz.roomId,
    title: quiz.title,
    questions: quiz.questions,
    createdAt: quiz.createdAt.toISOString(),
});

export const getQuizForResource = async (
    resourceId: string,
    userId: string,
): Promise<QuizResponse | null> => {
    const quiz = await QuizModel.findOne({resourceId});
    if (!quiz) return null;

    const room = await RoomModel.findById(quiz.roomId);
    if (!room) throw new Error("ROOM_NOT_FOUND");

    const isMember = room.members.some((m) => m.userId === userId);
    const isOwner = room.ownerId === userId;
    if (!isMember && !isOwner) throw new Error("FORBIDDEN");
    return toQuizResponse(quiz);
};

export const getRoomQuizzes = async (
    roomId: string,
    userId: string,
): Promise<QuizResponse[]> => {
    const room = await RoomModel.findById(roomId);
    if (!room) throw new Error("ROOM_NOT_FOUND");

    const isMember = room.members.some((m) => m.userId === userId);
    const isOwner = room.ownerId === userId;
    if (!isMember && !isOwner) throw new Error("FORBIDDEN");

    const quizzes = await QuizModel.find({roomId}).sort({createdAt: -1});
    return quizzes.map(toQuizResponse);
};

export const getAiJobStatus = async (
    jobId: string,
    userId: string,
): Promise<{status: string; quizId: string | null; error: string | null}> => {
    const job = await AiJobModel.findById(jobId);
    if (!job) throw new Error("JOB_NOT_FOUND");

    const room = await RoomModel.findById(job.roomId);
    if (!room) throw new Error("ROOM_NOT_FOUND");

    const isMember = room.members.some((m) => m.userId === userId);
    const isOwner = room.ownerId === userId;
    if (!isMember && !isOwner) throw new Error("FORBIDDEN");

    let quizId: string | null = null;
    if (job.status === "completed") {
        const quiz = await QuizModel.findOne({resourceId: job.resourceId});
        quizId = quiz ? quiz._id.toString() : null;
    }

    return {status: job.status, quizId, error: job.errorMessage};
};

export const submitQuizAttempt = async (
    quizId: string,
    body: SubmitAttemptBody,
    userId: string,
): Promise<AttemptResult> => {
    const quiz = await QuizModel.findById(quizId).lean();
    if (!quiz) throw new Error("QUIZ_NOT_FOUND");

    const room = await RoomModel.findById(quiz.roomId).lean();
    if (!room) throw new Error("ROOM_NOT_FOUND");

    const isMember = room.members.some((m) => m.userId === userId);
    const isOwner = room.ownerId === userId;
    if (!isMember && !isOwner) throw new Error("FORBIDDEN");

    if (body.answers.length !== quiz.questions.length) {
        throw new Error("ANSWER_COUNT_MISMATCH");
    }

    let score = 0;
    const breakdown = quiz.questions.map((q, i) => {
        const isCorrect = body.answers[i] === q.correctIndex;
        if (isCorrect) score++;
        return {
            question: q.question,
            yourAnswer: q.options[body.answers[i] ?? -1] ?? "No answer",
            correctAnswer: q.options[q.correctIndex],
            explanation: q.explanation,
            isCorrect,
        };
    });

    return {
        score,
        total: quiz.questions.length,
        percentage: Math.round((score / quiz.questions.length) * 100),
        breakdown,
    };
};
