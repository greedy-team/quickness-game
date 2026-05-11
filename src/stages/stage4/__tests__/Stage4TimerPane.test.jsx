import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import Stage4TimerPane from '../Stage4TimerPane.jsx';

describe('Stage4TimerPane', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('ArrowLeft 입력 시 결과 오버레이를 렌더한다', () => {
    const onResult = vi.fn();
    render(<Stage4TimerPane isRunning={true} onResult={onResult} />);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    });

    expect(screen.getByText(/MEASURED TIME/i)).toBeInTheDocument();
    expect(screen.getByText(/\d+\s*\/\s*\d+점/)).toBeInTheDocument();
    expect(screen.getByText(/도플갱어|타이밍|정각/)).toBeInTheDocument();
  });

  it('ArrowLeft 입력 후 1500ms 경과 시 onResult를 1회 호출한다', () => {
    const onResult = vi.fn();
    render(<Stage4TimerPane isRunning={true} onResult={onResult} />);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    });

    // ArrowLeft 직후엔 아직 호출 안 됨
    expect(onResult).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(onResult).toHaveBeenCalledTimes(1);
    expect(typeof onResult.mock.calls[0][0]).toBe('number');
  });

  it('unmount 시 dangling onResult 호출이 없다', () => {
    const onResult = vi.fn();
    const { unmount } = render(<Stage4TimerPane isRunning={true} onResult={onResult} />);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    });

    unmount();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(onResult).not.toHaveBeenCalled();
  });

  it('ArrowLeft가 두 번 들어와도 onResult는 1회만 호출된다', () => {
    const onResult = vi.fn();
    render(<Stage4TimerPane isRunning={true} onResult={onResult} />);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    });

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(onResult).toHaveBeenCalledTimes(1);
  });
});
