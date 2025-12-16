import { renderHook, act } from '@testing-library/react';
import { useCalendarInteractions } from '@/app/calendrier/hooks/useCalendarInteractions';

describe('useCalendarInteractions', () => {
  let mainScrollRef: any;
  let columnEmployeeRef: any;
  let dayInTimeline: Date[];

  beforeEach(() => {
    mainScrollRef = { current: document.createElement('div') };
    columnEmployeeRef = { current: document.createElement('div') };
    dayInTimeline = [new Date(), new Date()];
    
    // Mock requestAnimationFrame
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: any) => cb());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should initialize correctly', () => {
    const { result } = renderHook(() =>
      useCalendarInteractions({
        dayInTimeline,
        mainScrollRef,
        columnEmployeeRef,
      })
    );

    expect(result.current.tableRef).toBeDefined();
    expect(result.current.handleMouseOver).toBeDefined();
    expect(result.current.handleMouseOut).toBeDefined();
    expect(result.current.handleScrollY).toBeDefined();
  });

  it('should sync scroll from main to column', () => {
    const { result } = renderHook(() =>
      useCalendarInteractions({
        dayInTimeline,
        mainScrollRef,
        columnEmployeeRef,
      })
    );

    const event = {
      currentTarget: mainScrollRef.current,
      target: mainScrollRef.current,
    } as unknown as React.UIEvent<HTMLDivElement>;

    mainScrollRef.current.scrollTop = 100;

    act(() => {
      result.current.handleScrollY(event);
    });

    expect(columnEmployeeRef.current.scrollTop).toBe(100);
  });

  it('should sync scroll from column to main', () => {
    const { result } = renderHook(() =>
      useCalendarInteractions({
        dayInTimeline,
        mainScrollRef,
        columnEmployeeRef,
      })
    );

    const event = {
      currentTarget: columnEmployeeRef.current,
      target: columnEmployeeRef.current,
    } as unknown as React.UIEvent<HTMLDivElement>;

    columnEmployeeRef.current.scrollTop = 50;

    act(() => {
      result.current.handleScrollY(event);
    });

    expect(mainScrollRef.current.scrollTop).toBe(50);
  });
});
