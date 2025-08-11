
import { renderHook, act } from '@testing-library/react-hooks';
import NetInfo from '@react-native-community/netinfo';
import { useNetworkStatus } from '../useNetworkStatus';

// Mock NetInfo
jest.mock('@react-native-community/netinfo');
const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;

describe('useNetworkStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return initial network state', () => {
    const mockUnsubscribe = jest.fn();
    mockNetInfo.addEventListener.mockReturnValue(mockUnsubscribe);
    mockNetInfo.fetch.mockResolvedValue({
      isConnected: true,
      type: 'wifi',
      isInternetReachable: true,
    } as any);

    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isConnected).toBe(true);
    expect(result.current.connectionType).toBe('wifi');
    expect(result.current.isInternetReachable).toBe(true);
  });

  test('should update state when network changes', async () => {
    const mockUnsubscribe = jest.fn();
    let networkCallback: any;

    mockNetInfo.addEventListener.mockImplementation((callback) => {
      networkCallback = callback;
      return mockUnsubscribe;
    });

    mockNetInfo.fetch.mockResolvedValue({
      isConnected: true,
      type: 'wifi',
      isInternetReachable: true,
    } as any);

    const { result } = renderHook(() => useNetworkStatus());

    // Simulate network disconnection
    act(() => {
      networkCallback({
        isConnected: false,
        type: 'none',
        isInternetReachable: false,
      });
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.connectionType).toBe('none');
    expect(result.current.isInternetReachable).toBe(false);
  });

  test('should cleanup event listener on unmount', () => {
    const mockUnsubscribe = jest.fn();
    mockNetInfo.addEventListener.mockReturnValue(mockUnsubscribe);
    mockNetInfo.fetch.mockResolvedValue({
      isConnected: true,
      type: 'wifi',
      isInternetReachable: true,
    } as any);

    const { unmount } = renderHook(() => useNetworkStatus());

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  test('should handle network state changes from cellular to wifi', () => {
    const mockUnsubscribe = jest.fn();
    let networkCallback: any;

    mockNetInfo.addEventListener.mockImplementation((callback) => {
      networkCallback = callback;
      return mockUnsubscribe;
    });

    mockNetInfo.fetch.mockResolvedValue({
      isConnected: true,
      type: 'cellular',
      isInternetReachable: true,
    } as any);

    const { result } = renderHook(() => useNetworkStatus());

    // Initial state should be cellular
    act(() => {
      networkCallback({
        isConnected: true,
        type: 'cellular',
        isInternetReachable: true,
      });
    });

    expect(result.current.connectionType).toBe('cellular');

    // Change to wifi
    act(() => {
      networkCallback({
        isConnected: true,
        type: 'wifi',
        isInternetReachable: true,
      });
    });

    expect(result.current.connectionType).toBe('wifi');
  });
});
