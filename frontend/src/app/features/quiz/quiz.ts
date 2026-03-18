import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { QuizzesService } from '../../core/services/quiz.service';
import { Quiz } from '../../core/models/quiz.model';

type QuizState = 'loading' | 'taking' | 'results';

@Component({
  selector: 'app-quiz',
  standalone: true,
  template: `
    @if (state() === 'loading') {
      <div>Loading...</div>
    }

    @if (state() === 'taking' && quiz(); as activeQuiz) {
      <h2>{{ activeQuiz.title }}</h2>

      @for (q of activeQuiz.questions; track $index; let i = $index) {
        <div>
          <p>{{ q.question }}</p>

          @for (option of q.options; track $index; let j = $index) {
            <div>
              <label>
                <input type="radio" name="q{{ i }}" (change)="selectAnswer(i, j)" />
                {{ option }}
              </label>
            </div>
          }
        </div>
      }

      <button (click)="submit()">Submit</button>
    }

    @if (state() === 'results' && result(); as r) {
      <h2>Result</h2>
      <p>{{ r.score }} / {{ r.total }} ({{ r.percentage }}%)</p>

      <button (click)="goBack()">Back</button>
    }
  `,
})
export class QuizComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly quizzesService = inject(QuizzesService);

  readonly roomId = signal<string>('');
  readonly quiz = signal<Quiz | null>(null);
  readonly answers = signal<(number | undefined)[]>([]);
  readonly result = signal<any>(null);
  readonly state = signal<QuizState>('loading');

  ngOnInit(): void {
    const roomId = this.route.snapshot.paramMap.get('id')!;
    const resourceId = this.route.snapshot.paramMap.get('resourceId')!;

    this.roomId.set(roomId);

    this.quizzesService.getQuizForResource(roomId, resourceId).subscribe({
      next: (quiz) => {
        this.quiz.set(quiz);
        this.answers.set(new Array(quiz.questions.length).fill(undefined));
        this.state.set('taking');
      },
      error: () => {
        this.router.navigate(['/rooms', roomId]);
      },
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
    if (!quiz) return;

    this.quizzesService
      .submitAttempt(this.roomId(), quiz._id, this.answers() as number[])
      .subscribe((res) => {
        this.result.set(res);
        this.state.set('results');
      });
  }

  goBack(): void {
    this.router.navigate(['/rooms', this.roomId()]);
  }
}
