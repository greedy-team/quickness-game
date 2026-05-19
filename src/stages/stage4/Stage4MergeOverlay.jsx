// src/stages/stage4/Stage4MergeOverlay.jsx
import React from 'react';
import ResultModal from '../../components/ResultModal/ResultModal.jsx';

export default function Stage4MergeOverlay({ scores, onComplete }) {
  const p1 = scores?.pane1 ?? 0;
  const p2 = scores?.pane2 ?? 0;
  const p3 = scores?.pane3 ?? 0;
  const totalScore = p1 + p2 + p3;

  return (
    <ResultModal
      tone="success"
      breakdown={[
        { label: '10초 게임', value: `${p1}점`, color: '#ffcc00' },
        { label: '순발력 게임', value: `${p2}점`, color: '#ffcc00' },
        { label: '정확도 게임', value: `${p3}점`, color: '#ffcc00' },
      ]}
      score={totalScore}
      continueText="ENTER를 눌러 메인 화면으로"
      onContinue={onComplete}
    />
  );
}
