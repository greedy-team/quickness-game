import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { useGameStore } from '../../store.js';
import Stage3Game from '../../stages/stage3/Stage3Game.jsx';
import Stage4Host from '../../stages/stage4/Stage4Host.jsx';
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

  // Stage 3 — 실 구현
  if (id === '3') {
    return (
      <Stage3Game
        mode="standalone"
        onResult={(metric) => {
          recordResult(3, metric);
          navigate('/hub');
        }}
      />
    );
  }

  // Stage 4 — 3분할 호스트
  if (id === '4') {
    return (
      <Stage4Host
        onResult={(metric) => {
          recordResult(4, metric);
          navigate('/ending');
        }}
      />
    );
  }

  // Stage 1·2 — 팀원 작업 대기, 기존 mock 버튼 유지
  // TODO(post-skeleton): 팀원이 Stage1Game/Stage2Game을 contract에 맞게 구현하면
  //                       여기서 import + 마운트 추가.
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
      <p className="stage-page__note">TODO: Stage {stageId} 게임 메커닉 (팀원 이슈)</p>
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
