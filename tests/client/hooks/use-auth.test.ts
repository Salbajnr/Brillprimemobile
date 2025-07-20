import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../../../client/src/hooks/use-auth';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

describe('useAuth Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize with no user when localStorage is empty', () => {
    localStorageMock.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated()).toBe(false);
  });

  test('should initialize with user from localStorage', () => {
    const mockUser = {
      id: 1,
      fullName: 'Test User',
      email: 'test@example.com',
      role: 'CONSUMER'
    };

    localStorageMock.getItem.mockReturnValue(JSON.stringify(mockUser));

    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated()).toBe(true);
  });

  test('should login user and store in localStorage', () => {
    localStorageMock.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useAuth());

    const mockUser = {
      id: 1,
      fullName: 'Test User',
      email: 'test@example.com',
      role: 'CONSUMER'
    };

    act(() => {
      result.current.login(mockUser);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated()).toBe(true);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('user', JSON.stringify(mockUser));
  });

  test('should logout user and remove from localStorage', () => {
    const mockUser = {
      id: 1,
      fullName: 'Test User',
      email: 'test@example.com',
      role: 'CONSUMER'
    };

    localStorageMock.getItem.mockReturnValue(JSON.stringify(mockUser));

    const { result } = renderHook(() => useAuth());

    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated()).toBe(false);
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('user');
  });

  test('should handle invalid JSON in localStorage', () => {
    localStorageMock.getItem.mockReturnValue('invalid-json');

    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated()).toBe(false);
  });
});