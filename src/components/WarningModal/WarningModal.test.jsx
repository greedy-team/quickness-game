import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import WarningModal from './WarningModal.jsx';

describe('WarningModal', () => {
  it('4가지 경고 항목을 모두 표시한다', () => {
    render(<WarningModal onAgree={() => {}} />);
    expect(screen.getByText(/점프스케어와 갑작스러운 큰 효과음/)).toBeInTheDocument();
    expect(screen.getByText(/광과민성 발작 주의/)).toBeInTheDocument();
    expect(screen.getByText(/이어폰 사용 시 볼륨/)).toBeInTheDocument();
    expect(screen.getByText(/12세 이상에게 권장/)).toBeInTheDocument();
  });
});
