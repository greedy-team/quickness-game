import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import ScoreTable from '../ScoreTable.jsx';

describe('ScoreTable', () => {
  afterEach(() => {
    cleanup();
  });

  it('헤더 아래에 만점·생존선 요약 라인이 노출된다', () => {
    render(<ScoreTable onClose={() => {}} />);
    expect(screen.getByText(/만점\s*2240/)).toBeInTheDocument();
    expect(screen.getByText(/생존선\s*700/)).toBeInTheDocument();
  });
});
