import React, { useEffect, useRef, useState } from 'react';
import { useAudioStore } from '../../audio/useAudioStore.js';
import './AudioControls.css';

function MuteIcon({ muted }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 9v6h4l5 4V5L7 9H3z" fill="currentColor" />
      {muted ? (
        <>
          <line x1="16" y1="9" x2="22" y2="15" stroke="currentColor" strokeWidth="2" />
          <line x1="22" y1="9" x2="16" y2="15" stroke="currentColor" strokeWidth="2" />
        </>
      ) : (
        <>
          <path d="M16 8.5a4.5 4.5 0 0 1 0 7" stroke="currentColor" strokeWidth="2" fill="none" />
          <path d="M18.5 6a8 8 0 0 1 0 12" stroke="currentColor" strokeWidth="2" fill="none" />
        </>
      )}
    </svg>
  );
}

export default function AudioControls() {
  const bgmVolume = useAudioStore((s) => s.bgmVolume);
  const sfxVolume = useAudioStore((s) => s.sfxVolume);
  const isMuted = useAudioStore((s) => s.isMuted);
  const setBgmVolume = useAudioStore((s) => s.setBgmVolume);
  const setSfxVolume = useAudioStore((s) => s.setSfxVolume);
  const toggleMute = useAudioStore((s) => s.toggleMute);

  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const bgmDisplay = Math.round(bgmVolume * 100);
  const sfxDisplay = Math.round(sfxVolume * 100);

  return (
    <div className="audio-controls" ref={rootRef}>
      <button
        type="button"
        className={`audio-controls__icon-button ${isMuted ? 'audio-controls__icon-button--muted' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="사운드 설정"
        aria-expanded={open}
        aria-pressed={isMuted}
      >
        <MuteIcon muted={isMuted} />
      </button>

      {open && (
        <div className="audio-controls__popover" role="dialog" aria-label="사운드 컨트롤">
          <label className="audio-controls__row">
            <span className="audio-controls__label">BGM</span>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={bgmDisplay}
              onChange={(e) => setBgmVolume(Number(e.target.value) / 100)}
              aria-label="BGM 볼륨"
            />
            <span className="audio-controls__value">{bgmDisplay}</span>
          </label>

          <label className="audio-controls__row">
            <span className="audio-controls__label">효과음</span>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={sfxDisplay}
              onChange={(e) => setSfxVolume(Number(e.target.value) / 100)}
              aria-label="효과음 볼륨"
            />
            <span className="audio-controls__value">{sfxDisplay}</span>
          </label>

          <div className="audio-controls__divider" />

          <button
            type="button"
            className={`audio-controls__mute-toggle ${isMuted ? 'audio-controls__mute-toggle--on' : ''}`}
            onClick={toggleMute}
            aria-label="마스터 음소거"
            aria-pressed={isMuted}
          >
            {isMuted ? '음소거 해제' : '마스터 음소거'}
          </button>
        </div>
      )}
    </div>
  );
}
