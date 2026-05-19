import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Stage4Intro from '../Stage4Intro.jsx';

describe('Stage4Intro', () => {
  it('Stage 4 타이틀을 렌더한다', () => {
    render(<Stage4Intro onStart={() => {}} />);
    expect(screen.getByText('4단계: 통합 게임')).toBeInTheDocument();
  });

  it('Stage 1/2/3 프리뷰 이미지 3장을 모두 렌더한다', () => {
    render(<Stage4Intro onStart={() => {}} />);
    const previews = screen.getAllByRole('img');
    const srcs = previews.map((img) => img.getAttribute('src'));
    expect(srcs).toContain('/assets/images/bg_stage1_clock_example.webp');
    expect(srcs).toContain('/assets/images/bg_stage2_library_fake.webp');
    expect(srcs).toContain('/assets/images/bg_stage3_example.webp');
  });

  it('←, ↑, → 세 키를 모두 active 클래스로 렌더한다', () => {
    const { container } = render(<Stage4Intro onStart={() => {}} />);
    expect(container.querySelector('.key-cap.left-active')).toBeTruthy();
    expect(container.querySelector('.key-cap.top-active')).toBeTruthy();
    expect(container.querySelector('.key-cap.right-active')).toBeTruthy();
  });

  it('ENTER 키를 눌러 시작 텍스트 클릭 시 onStart를 호출한다', () => {
    const onStart = vi.fn();
    render(<Stage4Intro onStart={onStart} />);
    fireEvent.click(screen.getByText('ENTER 키를 눌러 시작'));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('ENTER 안내 문구를 렌더한다', () => {
    render(<Stage4Intro onStart={() => {}} />);
    expect(screen.getByText('ENTER 키를 눌러 시작')).toBeInTheDocument();
  });
});
