import { describe, it, expect, beforeEach } from 'vitest';
import { RoomsStore } from './rooms.store';
import { Room } from '../../core/models/room.models';

describe('RoomsStore', () => {
  let store: RoomsStore;

  const mockRoom = (overrides: Partial<Room> = {}): Room => ({
    _id: 'room1',
    name: 'Test Room',
    description: 'A test room',
    isPrivate: false,
    ownerId: 'user1',
    members: [],
    memberCount: 1,
    currentUserRole: 'viewer',
    createdAt: new Date().toISOString(),
    ...overrides,
  });

  beforeEach(() => {
    store = new RoomsStore();
  });

  describe('initial state', () => {
    it('should have empty rooms list', () => {
      expect(store.rooms()).toEqual([]);
    });

    it('should have null selected room', () => {
      expect(store.selectedRoom()).toBeNull();
    });

    it('should not be loading', () => {
      expect(store.loading()).toBe(false);
    });

    it('selectedRoomIsAdmin should be false', () => {
      expect(store.selectedRoomIsAdmin()).toBe(false);
    });
  });

  describe('setRooms', () => {
    it('should replace rooms list', () => {
      const rooms = [mockRoom({ _id: 'r1' }), mockRoom({ _id: 'r2' })];
      store.setRooms(rooms);
      expect(store.rooms()).toHaveLength(2);
      expect(store.rooms()[0]._id).toBe('r1');
    });
  });

  describe('addRoom', () => {
    it('should prepend room to list', () => {
      store.setRooms([mockRoom({ _id: 'r1' })]);
      store.addRoom(mockRoom({ _id: 'r2' }));
      expect(store.rooms()[0]._id).toBe('r2');
      expect(store.rooms()).toHaveLength(2);
    });
  });

  describe('removeRoom', () => {
    it('should remove room by id', () => {
      store.setRooms([mockRoom({ _id: 'r1' }), mockRoom({ _id: 'r2' })]);
      store.removeRoom('r1');
      expect(store.rooms()).toHaveLength(1);
      expect(store.rooms()[0]._id).toBe('r2');
    });

    it('should do nothing if id not found', () => {
      store.setRooms([mockRoom({ _id: 'r1' })]);
      store.removeRoom('nonexistent');
      expect(store.rooms()).toHaveLength(1);
    });
  });

  describe('setSelectedRoom', () => {
    it('should set selected room', () => {
      const room = mockRoom({ _id: 'r1' });
      store.setSelectedRoom(room);
      expect(store.selectedRoom()).toEqual(room);
    });

    it('should clear selected room when null', () => {
      store.setSelectedRoom(mockRoom());
      store.setSelectedRoom(null);
      expect(store.selectedRoom()).toBeNull();
    });
  });

  describe('selectedRoomIsAdmin', () => {
    it('should return true when currentUserRole is admin', () => {
      store.setSelectedRoom(mockRoom({ currentUserRole: 'admin' }));
      expect(store.selectedRoomIsAdmin()).toBe(true);
    });

    it('should return false for non-admin roles', () => {
      store.setSelectedRoom(mockRoom({ currentUserRole: 'viewer' }));
      expect(store.selectedRoomIsAdmin()).toBe(false);
    });
  });

  describe('setLoading', () => {
    it('should update loading state', () => {
      store.setLoading(true);
      expect(store.loading()).toBe(true);
      store.setLoading(false);
      expect(store.loading()).toBe(false);
    });
  });
});
