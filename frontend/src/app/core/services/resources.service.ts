import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, switchMap, tap, from } from 'rxjs';
import { ResourcesStore } from '../../features/resources/resources.store';
import {
  Resource,
  PresignedUploadResponse,
  ConfirmUploadPayload,
  ResourceFileType,
} from '../models/resource.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ResourcesService {
  private readonly http = inject(HttpClient);
  private readonly store = inject(ResourcesStore);

  private baseUrl(roomId: string): string {
    // app.use("/api/rooms/:roomId/resources", resourcesRouter);
    return `${environment.apiUrl}/rooms/${roomId}/resources`;
  }

  getRoomResources(roomId: string): Observable<Resource[]> {
    this.store.setLoading(true);
    return this.http.get<Resource[]>(this.baseUrl(roomId)).pipe(
      tap((resources) => {
        this.store.setResources(resources);
        this.store.setLoading(false);
      }),
    );
  }

  uploadFile(
    roomId: string,
    file: File,
    options: { tags?: string[]; generateQuiz?: boolean } = {},
  ): Observable<Resource> {
    this.store.setUploading(true);

    const fileType = this.resolveFileType(file.type);

    return this.http
      .post<PresignedUploadResponse>(`${this.baseUrl(roomId)}/presign`, {
        mimeType: file.type,
        fileName: file.name,
      })
      .pipe(
        switchMap((presigned) =>
          from(
            fetch(presigned.uploadUrl, {
              method: 'PUT',
              body: file,
              headers: { 'Content-Type': file.type },
            }).then((res) => {
              if (!res.ok) throw new Error(`S3 upload failed: ${res.status}`);
              return presigned.s3Key;
            }),
          ).pipe(
            switchMap((s3Key) => {
              const payload: ConfirmUploadPayload = {
                s3Key,
                fileName: file.name,
                mimeType: file.type,
                sizeBytes: file.size,
                fileType,
                generateQuiz: options.generateQuiz ?? false,
              };
              return this.http.post<Resource>(`${this.baseUrl(roomId)}/confirm`, payload);
            }),
          ),
        ),
        tap((resource) => {
          this.store.addResource(resource);
          this.store.setUploading(false);
        }),
      );
  }

  deleteResource(roomId: string, resourceId: string): Observable<{ message: string }> {
    return this.http
      .delete<{ message: string }>(`${this.baseUrl(roomId)}/${resourceId}`)
      .pipe(tap(() => this.store.removeResource(resourceId)));
  }

  private resolveFileType(mimeType: string): ResourceFileType {
    if (mimeType === 'application/pdf') return 'pdf';
    return 'image';
  }
}
