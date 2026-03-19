import { describe, it, expect, beforeEach } from 'vitest';
import { AuthStore } from './auth.store';
import { User } from '../models/auth.models';

describe('AuthStore', () => {
  let store: AuthStore;

  const mockUser: User = {
    id: 'user123',
    email: 'test@example.com',
    displayName: 'Test User',
    avatarUrl: '',
    bio: '',
    role: 'user',
  };

  beforeEach(() => {
    store = new AuthStore();
  });

  describe('initial state', () => {
    it('should have null user and token', () => {
      expect(store.user()).toBeNull();
      expect(store.accessToken()).toBeNull();
    });

    it('should not be authenticated', () => {
      expect(store.isAuthenticated()).toBe(false);
    });

    it('should have empty displayName', () => {
      expect(store.displayName()).toBe('');
    });

    it('should not be admin', () => {
      expect(store.isAdmin()).toBe(false);
    });
  });

  describe('setAuth', () => {
    it('should set user and token', () => {
      store.setAuth(mockUser, 'token123');
      expect(store.user()).toEqual(mockUser);
      expect(store.accessToken()).toBe('token123');
    });

    it('should mark as authenticated', () => {
      store.setAuth(mockUser, 'token123');
      expect(store.isAuthenticated()).toBe(true);
    });

    it('should expose displayName', () => {
      store.setAuth(mockUser, 'token123');
      expect(store.displayName()).toBe('Test User');
    });
  });

  describe('isAdmin', () => {
    it('should return false for regular user', () => {
      store.setAuth(mockUser, 'token123');
      expect(store.isAdmin()).toBe(false);
    });

    it('should return true for admin role', () => {
      store.setAuth({ ...mockUser, role: 'admin' }, 'token123');
      expect(store.isAdmin()).toBe(true);
    });
  });

  describe('clearAuth', () => {
    it('should clear user and token', () => {
      store.setAuth(mockUser, 'token123');
      store.clearAuth();
      expect(store.user()).toBeNull();
      expect(store.accessToken()).toBeNull();
    });

    it('should mark as unauthenticated', () => {
      store.setAuth(mockUser, 'token123');
      store.clearAuth();
      expect(store.isAuthenticated()).toBe(false);
    });
  });

  describe('updateAccessToken', () => {
    it('should update token without changing user', () => {
      store.setAuth(mockUser, 'old_token');
      store.updateAccessToken('new_token');
      expect(store.accessToken()).toBe('new_token');
      expect(store.user()).toEqual(mockUser);
    });
  });

  describe('setLoading', () => {
    it('should update loading state', () => {
      expect(store.loading()).toBe(false);
      store.setLoading(true);
      expect(store.loading()).toBe(true);
      store.setLoading(false);
      expect(store.loading()).toBe(false);
    });
  });
});
