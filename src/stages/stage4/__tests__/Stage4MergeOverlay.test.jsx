import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Stage4MergeOverlay from '../Stage4MergeOverlay.jsx';

describe('Stage4MergeOverlay', () => {
  it('scores prop 없이 렌더해도 crash 없음', () => {
    const { container } = render(<Stage4MergeOverlay />);
    expect(container.firstChild).toBeTruthy();
  });

  it('scores prop이 주어지면 각 패널 점수를 렌더한다', () => {
    render(<Stage4MergeOverlay scores={{ pane1: 80, pane2: 100, pane3: 60 }} />);
    expect(screen.getByText('80점')).toBeInTheDocument();
    expect(screen.getByText('100점')).toBeInTheDocument();
    expect(screen.getByText('60점')).toBeInTheDocument();
  });

  it('합계를 계산해서 렌더한다', () => {
    render(<Stage4MergeOverlay scores={{ pane1: 80, pane2: 100, pane3: 60 }} />);
    expect(screen.getByText('+240점')).toBeInTheDocument();
  });

  it('scores가 없으면 합계 0을 렌더한다', () => {
    render(<Stage4MergeOverlay scores={undefined} />);
    expect(screen.getByText('+0점')).toBeInTheDocument();
  });

  it('각 sub-game 라벨을 렌더한다', () => {
    render(<Stage4MergeOverlay scores={{ pane1: 80, pane2: 100, pane3: 60 }} />);
    expect(screen.getByText('10초 게임')).toBeInTheDocument();
    expect(screen.getByText('순발력 게임')).toBeInTheDocument();
    expect(screen.getByText('정확도 게임')).toBeInTheDocument();
  });

  it('continue 버튼 클릭 시 onComplete 호출', () => {
    const onComplete = vi.fn();
    render(<Stage4MergeOverlay scores={{ pane1: 1, pane2: 2, pane3: 3 }} onComplete={onComplete} />);
    fireEvent.click(screen.getByText('ENTER를 눌러 메인 화면으로'));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
