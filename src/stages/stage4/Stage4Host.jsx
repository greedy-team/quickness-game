// Stage 4 진입점 — 통합 인트로 + 3분할 + 점수 집계 + 합체 + 점프스케어 → onResult.
// state machine: intro → running → merging → jumpscare → done
// 사운드 전체 길이 6초에 맞춰 merging(4s) 동안 SFX pre-roll → jumpscare(2s) 클라이맥스에 이미지 표시.

import { useEffect, useMemo, useRef, useState } from 'react';
import Stage4Intro from './Stage4Intro.jsx';
import Stage4Split from './Stage4Split.jsx';
import Stage4MergeOverlay from './Stage4MergeOverlay.jsx';
import Stage4JumpscareOverlay from './Stage4JumpscareOverlay.jsx';
import { ASSETS } from '../../assets.js';
import { BGM_DEFAULTS } from '../../audio/trackRegistry.js';
import { useAudioVolume } from '../../audio/useAudioVolume.js';
import { useAudioStore } from '../../audio/useAudioStore.js';
import './Stage4Host.css';

const MERGE_DURATION_MS = 4000;
const JUMPSCARE_DURATION_MS = 2000;

export default function Stage4Host({ onResult }) {
  const [phase, setPhase] = useState('intro'); // intro | running | merging | jumpscare | done
  // 각 sub-pane 결과: { metric, score } | null. metric은 평균을 위한 통계용,
  // score는 실제 누적 점수 (3개 합 = Stage 4 기여).
  const [results, setResults] = useState({ 1: null, 2: null, 3: null });
  const aggregateRef = useRef(null);
  const totalScoreRef = useRef(null);
  const sfxAudioRef = useRef(null);
  const bgmAudioRef = useRef(null);

  const bgmVolume = useAudioVolume('bgm');

  // intro 단계: Space 누르면 running 진입
  useEffect(() => {
    if (phase !== 'intro') return;
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setPhase('running');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase]);

  // sub-stage별 안정적인(reference 변하지 않는) 결과 수집 콜백.
  // 매 렌더마다 새 함수가 만들어지면 sub-stage들의 useEffect deps가 갈리며
  // RAF 루프가 리셋되어 게임이 진행되지 않음 → useMemo로 마운트 시 1회만 생성.
  // 각 sub-pane은 (metric, { score })를 넘김. score는 sub-pane 모달이 보여주는 값과 동일.
  const subResultHandlers = useMemo(() => {
    const handler = (n) => (metric, extras = {}) =>
      setResults((prev) =>
        prev[n] !== null ? prev : { ...prev, [n]: { metric, score: extras.score ?? 0 } },
      );
    return { 1: handler(1), 2: handler(2), 3: handler(3) };
  }, []);

  // BGM: running phase에서만 재생. merging 진입 시 정지(점프스케어 SFX와 충돌 방지).
  // Stage 3와 동일 패턴 — 라우트 기반 BgmController 대신 phase 기반 로컬 제어.
  useEffect(() => {
    const audio = bgmAudioRef.current;
    if (!audio) return;

    if (phase === 'running') {
      audio.volume = bgmVolume;
      audio.loop = BGM_DEFAULTS.loop;
      audio.play().catch(() => {});
    } else {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [phase, bgmVolume]);

  // BGM 볼륨 실시간 동기화
  useEffect(() => {
    const audio = bgmAudioRef.current;
    if (audio) audio.volume = bgmVolume;
  }, [bgmVolume]);

  // 3개 모두 도착하면 평균 metric(통계용) + 점수 합산(누적 기여) 산출 후 merging 진입.
  useEffect(() => {
    if (phase !== 'running') return;
    if (results[1] !== null && results[2] !== null && results[3] !== null) {
      const avg = (results[1].metric + results[2].metric + results[3].metric) / 3;
      aggregateRef.current = Math.max(0, Math.min(1, avg));
      totalScoreRef.current = results[1].score + results[2].score + results[3].score;
      setPhase('merging');
    }
  }, [phase, results]);

  // merging 진입: SFX pre-roll 시작 (jumpscare 이미지보다 먼저 들리도록) + 4초 후 jumpscare 전이
  useEffect(() => {
    if (phase !== 'merging') return;

    const sfxSrc = ASSETS.sounds.cutsceneJumpscareSfx;
    if (sfxSrc) {
      const audio = new Audio(sfxSrc);
      const { sfxVolume, isMuted } = useAudioStore.getState();
      audio.volume = isMuted ? 0 : sfxVolume;
      audio.play().catch(() => {});
      sfxAudioRef.current = audio;
    }

    const id = setTimeout(() => setPhase('jumpscare'), MERGE_DURATION_MS);
    return () => clearTimeout(id);
  }, [phase]);

  // jumpscare 진입 후 정해진 시간만큼 보여주고 done + onResult.
  // SFX는 merging부터 이어져 자연스럽게 종료됨 (총 6초).
  useEffect(() => {
    if (phase !== 'jumpscare') return;
    const id = setTimeout(() => {
      setPhase('done');
      onResult(aggregateRef.current, { score: totalScoreRef.current });
    }, JUMPSCARE_DURATION_MS);
    return () => clearTimeout(id);
  }, [phase, onResult]);

  // 언마운트 시 SFX 정리 (navigate로 unmount되어도 audio 누수 방지)
  useEffect(() => () => {
    const audio = sfxAudioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      sfxAudioRef.current = null;
    }
  }, []);

  return (
    <div className="stage4-host">
      {/* split은 phase=running 또는 merging 동안 마운트 (sub-stage 동작) */}
      {(phase === 'running' || phase === 'merging') && (
        <Stage4Split
          isRunning={phase === 'running'}
          onSubResult={subResultHandlers}
        />
      )}
      {/* 인트로는 intro phase에서만 */}
      {phase === 'intro' && <Stage4Intro />}
      {/* 합체 오버레이는 merging phase에서만 */}
      {phase === 'merging' && <Stage4MergeOverlay />}
      {/* 점프스케어는 jumpscare phase에서만 */}
      {phase === 'jumpscare' && <Stage4JumpscareOverlay />}
      <audio ref={bgmAudioRef} src={ASSETS.sounds.bgmStage4} preload="auto" />
    </div>
  );
}
