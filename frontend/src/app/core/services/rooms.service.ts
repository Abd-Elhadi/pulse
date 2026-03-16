import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { Room } from '../models/room.models';
import { RoomsStore } from '../../features/rooms/rooms.store';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class RoomsService {
  private readonly http = inject(HttpClient);
  private readonly store = inject(RoomsStore);
  private readonly baseUrl = `${environment.apiUrl}/rooms`;

  getRooms() {
    this.store.setLoading(true);
    return this.http.get<{ rooms: Room[] }>(this.baseUrl).pipe(
      tap((res) => {
        this.store.setRooms(res.rooms);
        this.store.setLoading(false);
      }),
    );
  }

  getRoomById(id: string) {
    return this.http
      .get<Room>(`${this.baseUrl}/${id}`)
      .pipe(tap((room) => this.store.setSelectedRoom(room)));
  }

  createRoom(data: { name: string; description: string; isPrivate: boolean }) {
    return this.http.post<Room>(this.baseUrl, data).pipe(tap((room) => this.store.addRoom(room)));
  }

  deleteRoom(id: string) {
    return this.http.delete(`${this.baseUrl}/${id}`).pipe(tap(() => this.store.removeRoom(id)));
  }

  joinRoom(id: string) {
    return this.http.post(`${this.baseUrl}/${id}/join`, {});
  }

  leaveRoom(id: string) {
    return this.http.post(`${this.baseUrl}/${id}/leave`, {});
  }

  removeMember(id: string, userId: string) {
    return this.http.delete<Room>(`${this.baseUrl}/${id}/members/${userId}`);
  }
}
