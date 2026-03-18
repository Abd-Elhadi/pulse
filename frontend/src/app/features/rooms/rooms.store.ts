import { computed, Injectable, signal } from '@angular/core';
import { Room } from '../../core/models/room.models';

@Injectable({ providedIn: 'root' })
export class RoomsStore {
  private readonly _rooms = signal<Room[]>([]);
  private readonly _selectedRoom = signal<Room | null>(null);
  private readonly _loading = signal(false);

  readonly rooms = this._rooms.asReadonly();
  readonly selectedRoom = this._selectedRoom.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly selectedRoomIsAdmin = computed(() => this._selectedRoom()?.currentUserRole === 'admin');
  readonly selectedRoomCanEdit = computed(() => !!this.selectedRoom());

  setRooms(rooms: Room[]): void {
    this._rooms.set(rooms);
  }
  setSelectedRoom(room: Room | null): void {
    this._selectedRoom.set(room);
  }
  setLoading(value: boolean): void {
    this._loading.set(value);
  }
  addRoom(room: Room): void {
    this._rooms.update((r) => [room, ...r]);
  }
  removeRoom(id: string): void {
    this._rooms.update((r) => r.filter((x) => x._id !== id));
  }
}
