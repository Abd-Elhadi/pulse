import { Injectable, signal, computed } from '@angular/core';
import { Resource } from '../../core/models/resource.model';
import { Quiz } from '../../core/models/quiz.model';

@Injectable({ providedIn: 'root' })
export class ResourcesStore {
  private readonly _resources = signal<Resource[]>([]);
  private readonly _quizzes = signal<Quiz[]>([]);
  private readonly _loading = signal(false);
  private readonly _uploading = signal(false);

  readonly resources = this._resources.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly uploading = this._uploading.asReadonly();

  readonly resourcesWithPendingJobs = computed(() =>
    this._resources().filter((r) => r.aiJobId && r.aiStatus !== 'completed'),
  );

  setResources(resources: Resource[]): void {
    this._resources.set(resources);
  }

  setQuizzes(quizzes: Quiz[]): void {
    this._quizzes.set(quizzes);
  }

  setLoading(v: boolean): void {
    this._loading.set(v);
  }

  setUploading(v: boolean): void {
    this._uploading.set(v);
  }

  addResource(resource: Resource): void {
    this._resources.update((r) => [resource, ...r]);
  }

  removeResource(resourceId: string): void {
    this._resources.update((r) => r.filter((x) => x._id !== resourceId));
  }

  markResourceProcessed(resourceId: string): void {
    this._resources.update((r) =>
      r.map((x) => (x._id === resourceId ? { ...x, aiStatus: 'completed' } : x)),
    );
  }

  addQuiz(quiz: Quiz): void {
    const exists = this._quizzes().some((q) => q._id === quiz._id);
    if (!exists) {
      this._quizzes.update((q) => [quiz, ...q]);
    }
  }
}
