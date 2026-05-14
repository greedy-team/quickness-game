import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Stage4MergeOverlay from '../Stage4MergeOverlay.jsx';

describe('Stage4MergeOverlay', () => {
  it('scores prop 없이 렌더해도 crash 없음', () => {
    const { container } = render(<Stage4MergeOverlay />);
    expect(container.firstChild).toBeTruthy();
  });

  it('scores prop이 주어지면 각 패널 점수를 렌더한다', () => {
    render(<Stage4MergeOverlay scores={{ pane1: 80, pane2: 100, pane3: 60 }} />);
    expect(screen.getByText('80')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('60')).toBeInTheDocument();
  });

  it('합계를 계산해서 렌더한다', () => {
    render(<Stage4MergeOverlay scores={{ pane1: 80, pane2: 100, pane3: 60 }} />);
    expect(screen.getByText('240')).toBeInTheDocument();
  });

  it('+ 연산자를 두 개 렌더한다', () => {
    render(<Stage4MergeOverlay scores={{ pane1: 80, pane2: 100, pane3: 60 }} />);
    const ops = screen.getAllByText('+');
    expect(ops).toHaveLength(2);
  });

  it('= 기호를 렌더한다', () => {
    render(<Stage4MergeOverlay scores={{ pane1: 80, pane2: 100, pane3: 60 }} />);
    expect(screen.getByText('=')).toBeInTheDocument();
  });

  it('scores가 없으면 합계 0을 렌더한다', () => {
    render(<Stage4MergeOverlay scores={undefined} />);
    expect(screen.getByTestId('merge-total')).toHaveTextContent('0');
  });
});
