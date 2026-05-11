import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AudioControls from '../AudioControls.jsx';
import { useAudioStore } from '../../../audio/useAudioStore.js';

describe('AudioControls', () => {
  beforeEach(() => {
    localStorage.removeItem('qg-audio');
    useAudioStore.setState({ bgmVolume: 0.7, sfxVolume: 0.7, isMuted: false });
  });

  afterEach(() => cleanup());

  it('마운트 시 popover 닫혀있음 (슬라이더 미노출)', () => {
    render(<AudioControls />);
    expect(screen.queryByLabelText(/BGM 볼륨/)).toBeNull();
  });

  it('아이콘 클릭 시 popover 열림 (BGM/SFX 슬라이더 + 음소거 버튼 노출)', async () => {
    const user = userEvent.setup();
    render(<AudioControls />);
    await user.click(screen.getByRole('button', { name: /사운드 설정/ }));
    expect(screen.getByLabelText(/BGM 볼륨/)).toBeInTheDocument();
    expect(screen.getByLabelText(/효과음 볼륨/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /마스터 음소거/ })).toBeInTheDocument();
  });

  it('BGM 슬라이더 change → store.bgmVolume 갱신 (0~100 → 0~1 변환)', async () => {
    const user = userEvent.setup();
    render(<AudioControls />);
    await user.click(screen.getByRole('button', { name: /사운드 설정/ }));
    const slider = screen.getByLabelText(/BGM 볼륨/);
    fireEvent.change(slider, { target: { value: '40' } });
    expect(useAudioStore.getState().bgmVolume).toBeCloseTo(0.4, 5);
  });

  it('SFX 슬라이더 change → store.sfxVolume 갱신', async () => {
    const user = userEvent.setup();
    render(<AudioControls />);
    await user.click(screen.getByRole('button', { name: /사운드 설정/ }));
    const slider = screen.getByLabelText(/효과음 볼륨/);
    fireEvent.change(slider, { target: { value: '20' } });
    expect(useAudioStore.getState().sfxVolume).toBeCloseTo(0.2, 5);
  });

  it('마스터 음소거 토글 클릭 → isMuted 반전, 아이콘에 muted 클래스 적용', async () => {
    const user = userEvent.setup();
    const { container } = render(<AudioControls />);
    await user.click(screen.getByRole('button', { name: /사운드 설정/ }));
    await user.click(screen.getByRole('button', { name: /마스터 음소거/ }));
    expect(useAudioStore.getState().isMuted).toBe(true);
    expect(container.querySelector('.audio-controls__icon-button--muted')).not.toBeNull();
  });

  it('popover 외부 클릭 → 닫힘', async () => {
    const user = userEvent.setup();
    render(<AudioControls />);
    await user.click(screen.getByRole('button', { name: /사운드 설정/ }));
    expect(screen.getByLabelText(/BGM 볼륨/)).toBeInTheDocument();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByLabelText(/BGM 볼륨/)).toBeNull();
  });

  it('Escape 키 → popover 닫힘', async () => {
    const user = userEvent.setup();
    render(<AudioControls />);
    await user.click(screen.getByRole('button', { name: /사운드 설정/ }));
    expect(screen.getByLabelText(/BGM 볼륨/)).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByLabelText(/BGM 볼륨/)).toBeNull();
  });
});
