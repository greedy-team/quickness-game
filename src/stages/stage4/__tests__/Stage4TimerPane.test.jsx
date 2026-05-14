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

  it('ArrowLeft 입력 시 crash 없이 종료 상태로 진입한다', () => {
    const onResult = vi.fn();
    const { container } = render(<Stage4TimerPane isRunning={true} onResult={onResult} />);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    });

    expect(container.firstChild).toBeTruthy();
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
