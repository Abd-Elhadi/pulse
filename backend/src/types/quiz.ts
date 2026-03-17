export interface QuizQuestion {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
}

export interface QuizResponse {
    _id: string;
    resourceId: string;
    roomId: string;
    title: string;
    questions: QuizQuestion[];
    createdAt: string;
}

export interface SubmitAttemptBody {
    answers: number[];
}

export interface AttemptResult {
    score: number;
    total: number;
    percentage: number;
    breakdown: {
        question: string;
        yourAnswer: string;
        correctAnswer: string;
        explanation: string;
        isCorrect: boolean;
    }[];
}
