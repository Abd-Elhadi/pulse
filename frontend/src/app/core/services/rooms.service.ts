import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { RoomsStore } from '../../features/rooms/rooms.store';
import {
  Room,
  PaginatedRoomsResponse,
  CreateRoomPayload,
  UpdateRoomPayload,
  InviteMemberPayload,
  RoomRole,
} from '../models/room.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class RoomsService {
  private readonly http = inject(HttpClient);
  private readonly roomsStore = inject(RoomsStore);
  private readonly baseUrl = `${environment.apiUrl}/rooms`;

  getRooms(page = 1, limit = 12, search?: string): Observable<PaginatedRoomsResponse> {
    this.roomsStore.setLoading(true);
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (search) params = params;

    return this.http.get<PaginatedRoomsResponse>(this.baseUrl, { params }).pipe(
      tap((res) => {
        this.roomsStore.setRooms(res);
        this.roomsStore.setLoading(false);
      }),
    );
  }

  getMyRooms(): Observable<Room[]> {
    return this.http
      .get<Room[]>(`${this.baseUrl}/mine`)
      .pipe(tap((rooms) => this.roomsStore.setMyRooms(rooms)));
  }

  getRoomById(id: string): Observable<Room> {
    return this.http
      .get<Room>(`${this.baseUrl}/${id}`)
      .pipe(tap((room) => this.roomsStore.setSelectedRoom(room)));
  }

  createRoom(payload: CreateRoomPayload): Observable<Room> {
    return this.http
      .post<Room>(this.baseUrl, payload)
      .pipe(tap((room) => this.roomsStore.addRoom(room)));
  }

  updateRoom(id: string, payload: UpdateRoomPayload): Observable<Room> {
    return this.http
      .patch<Room>(`${this.baseUrl}/${id}`, payload)
      .pipe(tap((room) => this.roomsStore.updateRoom(room)));
  }

  deleteRoom(id: string): Observable<{ message: string }> {
    return this.http
      .delete<{ message: string }>(`${this.baseUrl}/${id}`)
      .pipe(tap(() => this.roomsStore.removeRoom(id)));
  }

  joinRoom(id: string): Observable<Room> {
    return this.http
      .post<Room>(`${this.baseUrl}/${id}/join`, {})
      .pipe(tap((room) => this.roomsStore.updateRoom(room)));
  }

  leaveRoom(id: string): Observable<{ message: string }> {
    return this.http
      .post<{ message: string }>(`${this.baseUrl}/${id}/leave`, {})
      .pipe(tap(() => this.roomsStore.removeRoom(id)));
  }

  inviteMember(id: string, payload: InviteMemberPayload): Observable<Room> {
    return this.http
      .post<Room>(`${this.baseUrl}/${id}/members`, payload)
      .pipe(tap((room) => this.roomsStore.updateRoom(room)));
  }

  updateMemberRole(id: string, userId: string, role: RoomRole): Observable<Room> {
    return this.http
      .patch<Room>(`${this.baseUrl}/${id}/members/${userId}`, { role })
      .pipe(tap((room) => this.roomsStore.updateRoom(room)));
  }

  removeMember(id: string, userId: string): Observable<Room> {
    return this.http
      .delete<Room>(`${this.baseUrl}/${id}/members/${userId}`)
      .pipe(tap((room) => this.roomsStore.updateRoom(room)));
  }
}
