import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import ResultModal from '../ResultModal.jsx';

describe('ResultModal', () => {
  afterEach(() => {
    cleanup();
  });

  it('필수 props(tierComment, score)만으로 렌더된다', () => {
    render(<ResultModal tierComment="멘트" score={120} />);
    expect(screen.getByText('멘트')).toBeInTheDocument();
    expect(screen.getByText('+120점')).toBeInTheDocument();
  });

  it('headline 미지정 시 헤드라인 영역이 렌더되지 않는다', () => {
    const { container } = render(<ResultModal tierComment="멘트" score={50} />);
    expect(container.querySelector('.result-modal__headline')).toBeNull();
  });

  it('headline 지정 시 헤드라인이 렌더된다', () => {
    render(<ResultModal headline="LOST IN DARKNESS" tierComment="멘트" score={50} />);
    expect(screen.getByText('LOST IN DARKNESS')).toBeInTheDocument();
  });

  it('metricLabel + metricValue 모두 있으면 metric 영역이 렌더된다', () => {
    render(
      <ResultModal
        tierComment="멘트"
        metricLabel="REACTION TIME"
        metricValue="0.523s"
        score={100}
      />,
    );
    expect(screen.getByText(/REACTION TIME/)).toBeInTheDocument();
    expect(screen.getByText(/0\.523s/)).toBeInTheDocument();
  });

  it('metricValue 없으면 metric 영역이 미렌더', () => {
    const { container } = render(
      <ResultModal tierComment="멘트" metricLabel="REACTION TIME" score={100} />,
    );
    expect(container.querySelector('.result-modal__metric')).toBeNull();
  });

  it('metricValue가 JSX(node)일 때도 그대로 렌더된다', () => {
    render(
      <ResultModal
        tierComment="멘트"
        metricLabel="MEASURED TIME"
        metricValue={<span data-testid="custom-metric">12:00:01.50</span>}
        score={200}
      />,
    );
    expect(screen.getByTestId('custom-metric')).toBeInTheDocument();
  });

  it("tone='success'일 때 result-modal--success 클래스 적용", () => {
    const { container } = render(
      <ResultModal tierComment="멘트" score={100} tone="success" />,
    );
    expect(container.querySelector('.result-modal--success')).not.toBeNull();
  });

  it("tone='failed'일 때 result-modal--failed 클래스 적용", () => {
    const { container } = render(
      <ResultModal tierComment="멘트" score={100} tone="failed" />,
    );
    expect(container.querySelector('.result-modal--failed')).not.toBeNull();
  });

  it('tone 미지정 시 default failed 클래스 적용', () => {
    const { container } = render(<ResultModal tierComment="멘트" score={100} />);
    expect(container.querySelector('.result-modal--failed')).not.toBeNull();
  });
});
