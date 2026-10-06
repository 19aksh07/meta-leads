import { act, renderHook } from '@testing-library/react-native';
import { io } from 'socket.io-client';
import { useLeadSocket } from '../src/hooks/useLeadSocket';

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
    disconnect: jest.fn(),
  })),
}));

describe('useLeadSocket', () => {
  const fetchMock = jest.spyOn(global, 'fetch');

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_SOCKET_URL = 'http://backend.test:4000';
    fetchMock.mockImplementation(() => new Promise<Response>(() => {}));
  });

  afterAll(() => {
    fetchMock.mockRestore();
  });

  it('connects to the configured backend when mounted', () => {
    renderHook(() => useLeadSocket());

    expect(io).toHaveBeenCalledWith(
      'http://backend.test:4000',
      expect.objectContaining({ transports: ['websocket'] }),
    );
  });

  it('prepends each new lead to the list', () => {
    const { result } = renderHook(() => useLeadSocket());
    const socket = (io as jest.Mock).mock.results[0].value;
    const handler = socket.on.mock.calls.find(
      ([event]: [string]) => event === 'new-lead',
    )?.[1] as (lead: { id: string; email: string }) => void;

    act(() => handler({ id: 'lead-1', email: 'ada@example.com' }));
    act(() => handler({ id: 'lead-2', email: 'grace@example.com' }));

    expect(result.current.leads.map((lead) => lead.id)).toEqual([
      'lead-2',
      'lead-1',
    ]);
  });

  it('loads existing Meta test leads from the backend on mount', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        leads: [
          {
            id: 'test-lead-1',
            full_name: 'Existing Test Lead',
            is_test_lead: true,
          },
        ],
      }),
    } as Response);

    const { result } = renderHook(() => useLeadSocket());

    await act(async () => {
      await new Promise((resolve) => setImmediate(resolve));
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://backend.test:4000/api/test-leads',
    );
    expect(result.current.leads[0].full_name).toBe('Existing Test Lead');
  });

  it('removes listeners and disconnects on unmount', () => {
    const { unmount } = renderHook(() => useLeadSocket());
    const socket = (io as jest.Mock).mock.results[0].value;

    unmount();

    expect(socket.off).toHaveBeenCalledWith('new-lead', expect.any(Function));
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
  });
});