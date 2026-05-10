import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WarningModal from './WarningModal.jsx';

describe('WarningModal', () => {
  it('4가지 경고 항목을 모두 표시한다', () => {
    render(<WarningModal onAgree={() => {}} />);
    expect(screen.getByText(/점프스케어와 갑작스러운 큰 효과음/)).toBeInTheDocument();
    expect(screen.getByText(/광과민성 발작 주의/)).toBeInTheDocument();
    expect(screen.getByText(/이어폰 사용 시 볼륨/)).toBeInTheDocument();
    expect(screen.getByText(/12세 이상에게 권장/)).toBeInTheDocument();
  });

  it('동의 버튼 클릭 시 onAgree 콜백을 호출한다', async () => {
    const onAgree = vi.fn();
    const user = userEvent.setup();
    render(<WarningModal onAgree={onAgree} />);
    await user.click(screen.getByRole('button', { name: /동의하고 시작/ }));
    expect(onAgree).toHaveBeenCalledTimes(1);
  });
});
