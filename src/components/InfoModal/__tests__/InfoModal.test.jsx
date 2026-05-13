import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InfoModal from '../InfoModal.jsx';

describe('InfoModal', () => {
  afterEach(cleanup);

  it('게임 설명 모달이 렌더된다', () => {
    render(<InfoModal onClose={() => {}} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/그린이가 둘이 됐다/)).toBeInTheDocument();
  });

  it('닫기 버튼 클릭 시 onClose가 호출된다', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<InfoModal onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: '닫기' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('backdrop 클릭 시 onClose가 호출된다', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<InfoModal onClose={onClose} />);
    await user.click(container.querySelector('.info-modal-backdrop'));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
