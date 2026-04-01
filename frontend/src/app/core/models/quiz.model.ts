export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Quiz {
  _id: string;
  resourceId: string;
  roomId: string;
  title: string;
  questions: QuizQuestion[];
  createdAt: string;
}

export interface AiJobStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  quizId: string | null;
  error: string | null;
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
