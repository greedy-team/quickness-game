// Stage 4 진입점 — 통합 인트로 + 3분할 + 점수 집계 + 1초 합체 → onResult.
// state machine: intro → running → merging → done

import { useEffect, useMemo, useRef, useState } from 'react';
import Stage4Intro from './Stage4Intro.jsx';
import Stage4Split from './Stage4Split.jsx';
import Stage4MergeOverlay from './Stage4MergeOverlay.jsx';
import { ASSETS } from '../../assets.js';
import { BGM_DEFAULTS } from '../../audio/trackRegistry.js';
import './Stage4Host.css';

const MERGE_DURATION_MS = 1000;

export default function Stage4Host({ onResult }) {
  const [phase, setPhase] = useState('intro'); // intro | running | merging | done
  const [results, setResults] = useState({ 1: null, 2: null, 3: null });
  const aggregateRef = useRef(null);
  const bgmAudioRef = useRef(null);

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
  const subResultHandlers = useMemo(() => ({
    1: (metric) => setResults((prev) => (prev[1] !== null ? prev : { ...prev, 1: metric })),
    2: (metric) => setResults((prev) => (prev[2] !== null ? prev : { ...prev, 2: metric })),
    3: (metric) => setResults((prev) => (prev[3] !== null ? prev : { ...prev, 3: metric })),
  }), []);

  // BGM: running phase에서만 재생. merging 진입 시 정지.
  // Stage 3와 동일 패턴 — 라우트 기반 BgmController 대신 phase 기반 로컬 제어.
  useEffect(() => {
    const audio = bgmAudioRef.current;
    if (!audio) return;

    if (phase === 'running') {
      audio.volume = BGM_DEFAULTS.volume;
      audio.loop = BGM_DEFAULTS.loop;
      audio.play().catch(() => {});
    } else {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [phase]);

  // 3개 모두 도착하면 평균 산출 + merging 진입
  useEffect(() => {
    if (phase !== 'running') return;
    if (results[1] !== null && results[2] !== null && results[3] !== null) {
      const avg = (results[1] + results[2] + results[3]) / 3;
      aggregateRef.current = Math.max(0, Math.min(1, avg));
      setPhase('merging');
    }
  }, [phase, results]);

  // merging 진입 1초 후 done 전이 + onResult
  useEffect(() => {
    if (phase !== 'merging') return;
    const id = setTimeout(() => {
      setPhase('done');
      onResult(aggregateRef.current);
    }, MERGE_DURATION_MS);
    return () => clearTimeout(id);
  }, [phase, onResult]);

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
      <audio ref={bgmAudioRef} src={ASSETS.sounds.bgmStage4} preload="auto" />
    </div>
  );
}
