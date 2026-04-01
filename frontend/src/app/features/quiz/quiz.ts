import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatRadioModule } from '@angular/material/radio';
import { FormsModule } from '@angular/forms';
import { QuizzesService } from '../../core/services/quiz.service';
import { Quiz, AttemptResult } from '../../core/models/quiz.model';

type QuizState = 'loading' | 'taking' | 'results';

@Component({
  selector: 'app-quiz',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatRadioModule,
  ],
  template: `
    <div class="quiz-container">
      @if (state() === 'loading') {
        <div class="center"><mat-spinner diameter="48" /></div>
      }

      @if (state() === 'taking' && quiz(); as activeQuiz) {
        <div class="quiz-header">
          <button mat-icon-button (click)="goBack()"><mat-icon>arrow_back</mat-icon></button>
          <div>
            <h2>{{ activeQuiz.title }}</h2>
            <span class="question-count">{{ activeQuiz.questions.length }} questions</span>
          </div>
        </div>

        <div class="questions">
          @for (q of activeQuiz.questions; track $index; let i = $index) {
            <mat-card class="question-card">
              <mat-card-content>
                <p class="question-text">
                  <strong>{{ i + 1 }}.</strong> {{ q.question }}
                </p>
                <mat-radio-group
                  [name]="'q' + i"
                  [value]="answers()[i]"
                  (change)="selectAnswer(i, $event.value)"
                >
                  @for (option of q.options; track $index; let j = $index) {
                    <mat-radio-button [value]="j" class="option">
                      {{ option }}
                    </mat-radio-button>
                  }
                </mat-radio-group>
              </mat-card-content>
            </mat-card>
          }
        </div>

        <div class="quiz-actions">
          <button mat-raised-button color="primary" (click)="submit()" [disabled]="!allAnswered()">
            Submit Quiz
          </button>
          <span class="answered-count">
            {{ answeredCount() }} / {{ quiz()!.questions.length }} answered
          </span>
        </div>
      }

      @if (state() === 'results' && result(); as r) {
        <div class="quiz-header">
          <button mat-icon-button (click)="goBack()"><mat-icon>arrow_back</mat-icon></button>
          <h2>Results</h2>
        </div>

        <mat-card class="score-card" [class.passing]="r.percentage >= 60">
          <mat-card-content class="score-content">
            <span class="score-number">{{ r.score }} / {{ r.total }}</span>
            <span class="score-percent">{{ r.percentage }}%</span>
            <span class="score-label">{{
              r.percentage >= 60 ? '🎉 Passed' : '📚 Keep studying'
            }}</span>
          </mat-card-content>
        </mat-card>

        <div class="breakdown">
          @for (item of r.breakdown; track $index; let i = $index) {
            <mat-card
              class="breakdown-card"
              [class.correct]="item.isCorrect"
              [class.incorrect]="!item.isCorrect"
            >
              <mat-card-content>
                <div class="breakdown-header">
                  <mat-icon>{{ item.isCorrect ? 'check_circle' : 'cancel' }}</mat-icon>
                  <p class="breakdown-question">
                    <strong>{{ i + 1 }}.</strong> {{ item.question }}
                  </p>
                </div>
                @if (!item.isCorrect) {
                  <p class="your-answer">
                    <span class="label">Your answer:</span> {{ item.yourAnswer }}
                  </p>
                }
                <p class="correct-answer">
                  <span class="label">Correct answer:</span> {{ item.correctAnswer }}
                </p>
                <mat-divider />
                <p class="explanation">{{ item.explanation }}</p>
              </mat-card-content>
            </mat-card>
          }
        </div>

        <div class="quiz-actions">
          <button mat-raised-button color="primary" (click)="goBack()">
            <mat-icon>arrow_back</mat-icon> Back to Room
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .quiz-container {
        max-width: 720px;
        margin: 0 auto;
        padding: 1.5rem;
      }

      .center {
        display: flex;
        justify-content: center;
        padding: 4rem;
      }

      .quiz-header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 1.5rem;
        h2 {
          margin: 0;
          font-size: 1.25rem;
        }
        .question-count {
          font-size: 0.8rem;
          color: #999;
        }
      }

      .questions {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-bottom: 1.5rem;
      }

      .question-card {
        border-radius: 10px;
      }
      .question-text {
        margin: 0 0 1rem;
        font-size: 0.95rem;
        line-height: 1.5;
      }

      mat-radio-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .option {
        font-size: 0.9rem;
      }

      .quiz-actions {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem 0;
        position: sticky;
        bottom: 0;
        background: #f8f9fa;
        border-top: 1px solid #e0e0e0;
      }
      .answered-count {
        font-size: 0.85rem;
        color: #888;
      }

      .score-card {
        border-radius: 12px;
        margin-bottom: 1.5rem;
        background: #ffebee;
        &.passing {
          background: #e8f5e9;
        }
      }
      .score-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.25rem;
        padding: 2rem !important;
      }
      .score-number {
        font-size: 2.5rem;
        font-weight: 700;
        color: #333;
      }
      .score-percent {
        font-size: 1.25rem;
        color: #666;
      }
      .score-label {
        font-size: 1rem;
        margin-top: 0.5rem;
      }

      .breakdown {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-bottom: 1.5rem;
      }

      .breakdown-card {
        border-radius: 10px;
        border-left: 4px solid #e0e0e0;
        &.correct {
          border-left-color: #4caf50;
        }
        &.incorrect {
          border-left-color: #e53935;
        }
      }
      .breakdown-header {
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
        mat-icon {
          flex-shrink: 0;
          margin-top: 2px;
        }
        .correct & mat-icon {
          color: #4caf50;
        }
        .incorrect & mat-icon {
          color: #e53935;
        }
      }
      .breakdown-question {
        margin: 0;
        font-size: 0.9rem;
        line-height: 1.4;
      }
      .label {
        font-weight: 600;
        font-size: 0.8rem;
        color: #888;
      }
      .your-answer {
        margin: 0.5rem 0 0;
        font-size: 0.875rem;
        color: #e53935;
      }
      .correct-answer {
        margin: 0.25rem 0 0.75rem;
        font-size: 0.875rem;
        color: #2e7d32;
      }
      mat-divider {
        margin: 0.75rem 0;
      }
      .explanation {
        margin: 0;
        font-size: 0.85rem;
        color: #666;
        font-style: italic;
      }
    `,
  ],
})
export class QuizComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly quizzesService = inject(QuizzesService);

  private roomId = '';
  readonly quiz = signal<Quiz | null>(null);
  readonly answers = signal<(number | undefined)[]>([]);
  readonly result = signal<any | null>(null);
  readonly state = signal<QuizState>('loading');

  readonly answeredCount = () => this.answers().filter((a) => a !== undefined).length;
  readonly allAnswered = () => this.answeredCount() === (this.quiz()?.questions.length ?? 0);

  ngOnInit(): void {
    this.roomId = this.route.snapshot.paramMap.get('id')!;
    const resourceId = this.route.snapshot.paramMap.get('resourceId')!;

    this.quizzesService.getQuizForResource(this.roomId, resourceId).subscribe({
      next: (quiz) => {
        this.quiz.set(quiz);
        this.answers.set(new Array(quiz.questions.length).fill(undefined));
        this.state.set('taking');
      },
      error: () => void this.router.navigate(['/rooms', this.roomId]),
    });
  }

  selectAnswer(qIndex: number, optionIndex: number): void {
    this.answers.update((a) => {
      const copy = [...a];
      copy[qIndex] = optionIndex;
      return copy;
    });
  }

  submit(): void {
    const quiz = this.quiz();
    if (!quiz || !this.allAnswered()) return;

    this.quizzesService
      .submitAttempt(this.roomId, quiz._id, this.answers() as number[])
      .subscribe((res) => {
        this.result.set(res);
        this.state.set('results');
      });
  }

  goBack(): void {
    void this.router.navigate(['/rooms', this.roomId]);
  }
}
