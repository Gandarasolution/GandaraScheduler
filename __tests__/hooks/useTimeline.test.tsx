import { renderHook, act, waitFor } from '@testing-library/react';
import { useTimeline } from '@/app/calendrier/hooks/useTimeline';
import { addDays, format } from 'date-fns';

describe('useTimeline', () => {
  const mockDate = Date.now();

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        cb(0);
        return 0;
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('initializes with correct days', async () => {
    const { result } = renderHook(() => useTimeline({
      isDisplayWeekend: true,
      selectedDate: mockDate,
      viewType: 'calendar'
    }));

    await waitFor(() => {
        expect(result.current.days.length).toBeGreaterThan(0);
    });

    const hasSelectedDate = result.current.days.some(d => 
        format(d, 'yyyy-MM-dd') === format(mockDate, 'yyyy-MM-dd')
    );
    expect(hasSelectedDate).toBe(true);
  });

  it('goToDate updates days', async () => {
    const { result } = renderHook(() => useTimeline({
      isDisplayWeekend: true,
      selectedDate: mockDate,
      viewType: 'calendar'
    }));

    await waitFor(() => {
        expect(result.current.days.length).toBeGreaterThan(0);
    });

    const newDate = mockDate + 10 * 86400000;

    // Mock scroll element
    const mockScrollElement = {
        scrollLeft: 0,
        clientWidth: 1000,
        scrollWidth: 5000,
        scrollTo: jest.fn(),
        getBoundingClientRect: jest.fn(() => ({ left: 0 })),
        isConnected: true,
    } as unknown as HTMLDivElement;

    // Set ref
    (result.current.mainScrollRef as any).current = mockScrollElement;

    // Mock document.getElementById
    const mockCell = {
        getBoundingClientRect: jest.fn(() => ({ left: 100, width: 100 })),
        clientWidth: 100
    };
    jest.spyOn(document, 'getElementById').mockReturnValue(mockCell as any);

    await act(async () => {
        const p = result.current.goToDate(newDate);
        jest.runAllTimers();
        await p;
    });
    
    await waitFor(() => {
         const hasNewDate = result.current.days.some(d => 
            format(d, 'yyyy-MM-dd') === format(newDate, 'yyyy-MM-dd')
        );
        expect(hasNewDate).toBe(true);
    });
  });
});
