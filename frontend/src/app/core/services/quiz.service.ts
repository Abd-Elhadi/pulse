import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval, switchMap, tap, takeWhile } from 'rxjs';
import { ResourcesStore } from '../../features/resources/resources.store';
import { Quiz, AiJobStatus } from '../models/quiz.model';
import { Resource } from '../models/resource.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class QuizzesService {
  private readonly http = inject(HttpClient);
  private readonly store = inject(ResourcesStore);
  private activePolls = new Map<string, boolean>();

  private baseUrl(roomId: string) {
    return `${environment.apiUrl}/rooms/${roomId}/quizzes`;
  }

  getRoomQuizzes(roomId: string): Observable<Quiz[]> {
    return this.http.get<Quiz[]>(this.baseUrl(roomId)).pipe(tap((q) => this.store.setQuizzes(q)));
  }

  getQuizForResource(roomId: string, resourceId: string) {
    return this.http
      .get<Quiz>(`${this.baseUrl(roomId)}/resource/${resourceId}`)
      .pipe(tap((q) => this.store.addQuiz(q)));
  }

  pollJobStatus(roomId: string, jobId: string, resourceId: string) {
    if (this.activePolls.get(jobId)) return;

    this.activePolls.set(jobId, true);

    return interval(4000).pipe(
      switchMap(() => this.http.get<AiJobStatus>(`${this.baseUrl(roomId)}/job/${jobId}`)),
      takeWhile((status) => status.status === 'pending' || status.status === 'processing', true),
      tap((status) => {
        if (status.status === 'completed') {
          this.store.markResourceProcessed(resourceId);
        }

        if (status.status === 'completed' || status.status === 'failed') {
          this.activePolls.set(jobId, false);
        }
      }),
    );
  }

  startPollingForPendingJobs(roomId: string, resources: Resource[]) {
    console.log(
      'START POLLING',
      resources.map((r) => ({
        id: r._id,
        job: r.aiJobId,
        status: r.aiStatus,
      })),
    );
    if (!resources.length) return;
    resources
      .filter(
        (r) => r.aiJobId && r.aiStatus !== 'completed' && this.activePolls.get(r.aiJobId) !== true,
      )
      .forEach((r) => {
        this.pollJobStatus(roomId, r.aiJobId!, r._id)?.subscribe();
      });
  }

  submitAttempt(roomId: string, quizId: string, answers: number[]) {
    return this.http.post(`${this.baseUrl(roomId)}/${quizId}/attempt`, { answers });
  }
}
