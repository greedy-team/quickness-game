// src/stages/stage4/Stage4Host.jsx
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Stage4Intro from './Stage4Intro.jsx';
import Stage4Split from './Stage4Split.jsx';
import Stage4MergeOverlay from './Stage4MergeOverlay.jsx';
import { ASSETS } from '../../assets.js';
import { BGM_DEFAULTS } from '../../audio/trackRegistry.js';
import { useAudioVolume } from '../../audio/useAudioVolume.js';
import { useGameStore } from '../../store.js';
import './Stage4Host.css';

export default function Stage4Host({ onResult }) {
  // 💡 상태 흐름: intro → running → waitingForMerge(대기) → merging(합산) → done(허브)
  const [phase, setPhase] = useState('intro'); 
  const [results, setResults] = useState({ 1: null, 2: null, 3: null });
  
  const aggregateRef = useRef(null);
  const totalScoreRef = useRef(null);
  const bgmAudioRef = useRef(null);
  const bgmVolume = useAudioVolume('bgm');

  // intro 단계: Space 누르면 running 진입
  useEffect(() => {
    if (phase !== 'intro') return;
    const handleKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        setPhase('running');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase]);

  // 각 sub-pane 결과 수집
  const subResultHandlers = useMemo(() => {
    const handler = (n) => (metric, extras = {}) =>
      setResults((prev) =>
        prev[n] !== null ? prev : { ...prev, [n]: { metric, score: extras.score ?? 0 } },
      );
    return { 1: handler(1), 2: handler(2), 3: handler(3) };
  }, []);

  // BGM 로직
  useEffect(() => {
    const audio = bgmAudioRef.current;
    if (!audio) return;
    if (phase === 'running' || phase === 'waitingForMerge') {
      audio.volume = bgmVolume;
      audio.loop = BGM_DEFAULTS.loop;
      audio.play().catch(() => {});
    } else {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [phase, bgmVolume]);

  useEffect(() => {
    const audio = bgmAudioRef.current;
    if (audio) audio.volume = bgmVolume;
  }, [bgmVolume]);

  useEffect(() => {
    if (phase !== 'running') return undefined;
    const { setActivePlayStageId } = useGameStore.getState();
    setActivePlayStageId(4);
    return () => setActivePlayStageId(null);
  }, [phase]);

  // 💡 [변경] 3개 모두 종료 시 'waitingForMerge' 상태로 대기
  useEffect(() => {
    if (phase !== 'running') return;
    if (results[1] !== null && results[2] !== null && results[3] !== null) {
      const avg = (results[1].metric + results[2].metric + results[3].metric) / 3;
      aggregateRef.current = Math.max(0, Math.min(1, avg));
      totalScoreRef.current = results[1].score + results[2].score + results[3].score;
      setPhase('waitingForMerge');
    }
  }, [phase, results]);

  // 💡 [추가] 3분할 화면 대기 중 엔터 누르면 'merging' 화면으로 전환
  useEffect(() => {
    if (phase !== 'waitingForMerge') return;
    const handleKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        setPhase('merging');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase]);

  // 💡 [추가] 합산 모달에서 게임 완전히 끝내고 허브로 복귀하는 함수
  const finishStage = useCallback(() => {
    setPhase('done');
    onResult(aggregateRef.current, { score: totalScoreRef.current });
  }, [onResult]);

  // 합산 모달 상태에서 엔터 누르면 허브로 복귀
  useEffect(() => {
    if (phase !== 'merging') return;
    const handleKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        finishStage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, finishStage]);

  return (
    <div className="stage4-host">
      {/* 💡 running 또는 대기(waitingForMerge) 상태일 때 3분할 유지 */}
      {(phase === 'running' || phase === 'waitingForMerge') && (
        <Stage4Split
          isRunning={phase === 'running'}
          onSubResult={subResultHandlers}
        />
      )}
      
      {phase === 'intro' && <Stage4Intro />}
      
      {/* 💡 3게임 모두 종료 후 점수 확인 대기 오버레이 */}
      {phase === 'waitingForMerge' && (
        <div className="s4-waiting-overlay">
          <div className="s4-waiting-btn" onClick={() => setPhase('merging')}>
            <span>ENTER를 눌러 점수 확인</span>
          </div>
        </div>
      )}
      
      {/* 합체 오버레이. onComplete 프롭으로 버튼 클릭 허브 복귀 지원 */}
      {phase === 'merging' && (
        <Stage4MergeOverlay
          scores={{
            pane1: results[1]?.score ?? 0,
            pane2: results[2]?.score ?? 0,
            pane3: results[3]?.score ?? 0,
          }}
          onComplete={finishStage} 
        />
      )}
      
      {/* 점프스케어 컴포넌트 삭제됨 */}
      <audio ref={bgmAudioRef} src={ASSETS.sounds.bgmStage4} preload="auto" />
    </div>
  );
}
