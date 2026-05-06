import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { useGameStore } from '../../store.js';
import './StagePage.css';

const VALID_IDS = ['1', '2', '3', '4'];

export default function StagePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const recordResult = useGameStore((s) => s.recordResult);
  const clearStageResult = useGameStore((s) => s.clearStageResult);

  if (!VALID_IDS.includes(id)) return <Navigate to="/hub" replace />;

  const stageId = Number(id);
  const nextRoute = id === '4' ? '/ending' : '/hub';

  // TODO(post-skeleton): Stage ${stageId} 게임 로직 구현
  //   - Stage 1 (괘종시계): 종소리 9회 + 정적 1초 + 10초째 ← 입력
  //   - Stage 2 (반응속도): 빨간 눈 트리거 + 페이크 2~3회
  //   - Stage 3 (캐치): 진짜/가짜 기억 받기·피하기, 받은 위치 정확도
  //   - Stage 4 (3분할): Stage 1·2·3 동시 진행 + 합산
  //   결과 기록은 recordResult(stageId, metric) 호출.
  //   재도전 시 clearStageResult(stageId) 호출 후 재진입.
  //   재도전 UI(언제 노출/횟수 제한)는 후속 결정.

  const simulatePerfect = () => {
    recordResult(stageId, 0.05);
    navigate(nextRoute);
  };
  const simulateLow = () => {
    recordResult(stageId, 0.4);
    navigate(nextRoute);
  };
  const simulateClear = () => {
    clearStageResult(stageId);
  };

  return (
    <div className="stage-page">
      <h1 className="stage-page__title">[Stage {stageId}]</h1>
      <p className="stage-page__note">TODO: Stage {stageId} 게임 메커닉</p>
      <div className="stage-page__actions">
        <button type="button" onClick={simulatePerfect}>
          모의 PERFECT (metric 0.05) → {nextRoute}
        </button>
        <button type="button" onClick={simulateLow}>
          모의 낮은 점수 (metric 0.4) → {nextRoute}
        </button>
        <button type="button" onClick={simulateClear}>
          결과 무효화 (clearStageResult)
        </button>
      </div>
    </div>
  );
}
