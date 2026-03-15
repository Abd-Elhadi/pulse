import { Injectable, signal, computed } from '@angular/core';
import { Room, PaginatedRoomsResponse } from '../../core/models/room.models';

@Injectable({ providedIn: 'root' })
export class RoomsStore {
  private readonly _rooms = signal<Room[]>([]);
  private readonly _myRooms = signal<Room[]>([]);
  private readonly _selectedRoom = signal<Room | null>(null);
  private readonly _loading = signal(false);
  private readonly _pagination = signal<Omit<PaginatedRoomsResponse, 'rooms'>>({
    total: 0,
    page: 1,
    limit: 12,
    totalPages: 0,
  });

  readonly rooms = this._rooms.asReadonly();
  readonly myRooms = this._myRooms.asReadonly();
  readonly selectedRoom = this._selectedRoom.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly pagination = this._pagination.asReadonly();

  readonly hasRooms = computed(() => this._rooms().length > 0);
  readonly selectedRoomIsAdmin = computed(() => this._selectedRoom()?.currentUserRole === 'admin');
  readonly selectedRoomCanEdit = computed(() => {
    const role = this._selectedRoom()?.currentUserRole;
    return role === 'admin' || role === 'editor';
  });

  setRooms(response: PaginatedRoomsResponse): void {
    this._rooms.set(response.rooms);
    this._pagination.set({
      total: response.total,
      page: response.page,
      limit: response.limit,
      totalPages: response.totalPages,
    });
  }

  setMyRooms(rooms: Room[]): void {
    this._myRooms.set(rooms);
  }

  setSelectedRoom(room: Room | null): void {
    this._selectedRoom.set(room);
  }

  setLoading(loading: boolean): void {
    this._loading.set(loading);
  }

  addRoom(room: Room): void {
    this._rooms.update((rooms) => [room, ...rooms]);
    this._myRooms.update((rooms) => [room, ...rooms]);
  }

  updateRoom(updated: Room): void {
    this._rooms.update((rooms) => rooms.map((r) => (r._id === updated._id ? updated : r)));
    this._myRooms.update((rooms) => rooms.map((r) => (r._id === updated._id ? updated : r)));
    if (this._selectedRoom()?._id === updated._id) {
      this._selectedRoom.set(updated);
    }
  }

  removeRoom(roomId: string): void {
    this._rooms.update((rooms) => rooms.filter((r) => r._id !== roomId));
    this._myRooms.update((rooms) => rooms.filter((r) => r._id !== roomId));
    if (this._selectedRoom()?._id === roomId) {
      this._selectedRoom.set(null);
    }
  }
}
