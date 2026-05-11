import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { useGameStore, selectEndingOutcome } from '../../store.js';
import { ASSETS } from '../../assets.js';
import Stage1Placeholder from '../../stages/stage1/Stage1Placeholder.jsx';
import Stage2Placeholder from '../../stages/stage2/Stage2Placeholder.jsx';
import Stage3Game from '../../stages/stage3/Stage3Game.jsx';
import Stage4Host from '../../stages/stage4/Stage4Host.jsx';
import './StagePage.css';

const VALID_IDS = ['1', '2', '3', '4'];

// Stage 1·2는 mock 버튼 화면이 배경 이미지를 깔고 보여줌.
// Stage 3·4는 실 컴포넌트가 자체 배경을 그리므로 이 맵은 1·2만 사용.
const STAGE_BACKGROUNDS = {
  1: ASSETS.images.stage1,
  2: ASSETS.images.stage2,
};

export default function StagePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const recordResult = useGameStore((s) => s.recordResult);
  const clearStageResult = useGameStore((s) => s.clearStageResult);

  if (!VALID_IDS.includes(id)) return <Navigate to="/hub" replace />;

  const stageId = Number(id);
  // Stage 4 종료 직후 누적 점수로 엔딩 분기 URL 계산. recordResult가 동기라
  // getState로 즉시 합산된 totalScore 기준 outcome을 평가할 수 있다.
  const endingRouteFromCurrentScore = () =>
    `/ending/${selectEndingOutcome(useGameStore.getState())}`;

  // Stage 1 — 괘종시계 실 구현 연결
  if (id === '1') {
    return (
      <Stage1Placeholder
        mode="standalone"
        isRunning={true}
        onResult={(metric) => {
          recordResult(1, metric);
          navigate('/hub');
        }}
      />
    );
  }

  // Stage 2 — 반응속도 실 구현 연결
  if (id === '2') {
    return (
      <Stage2Placeholder
        mode="standalone"
        isRunning={true}
        onResult={(metric) => {
          recordResult(2, metric);
          navigate('/hub');
        }}
      />
    );
  }

  // Stage 3 — 실 구현
  // raw totalScore를 그대로 누적 점수로 사용. 가짜 캐치 페널티로 음수가 될 수 있고,
  // 이는 의도된 동작 (Stage 1·2·4의 metric-tier 매핑과는 다른 점수 체계).
  if (id === '3') {
    return (
      <Stage3Game
        mode="standalone"
        onResult={(metric, extras) => {
          recordResult(3, metric, { scoreOverride: extras?.score });
          navigate('/hub');
        }}
      />
    );
  }

  // Stage 4 — 3분할 호스트
  // Stage 4 누적 점수 = 3 sub-pane 점수의 합. 사용자가 모달로 본 점수와 정확히 일치.
  if (id === '4') {
    return (
      <Stage4Host
        onResult={(metric, extras) => {
          recordResult(4, metric, { scoreOverride: extras?.score });
          navigate(endingRouteFromCurrentScore());
        }}
      />
    );
  }

  // =========================================================================
  // 🚨 아래 코드는 ESLint의 '도달할 수 없는 코드(no-unreachable)' 에러를 방지하기 위해 
  // 블록 주석 처리해 두었습니다. 기존 모의 테스트 로직과 메모를 보존하는 용도입니다.
  // =========================================================================
  /*
  // Stage 1·2 — 팀원 작업 대기, 기존 mock 버튼 유지
  // TODO(post-skeleton): 팀원이 Stage1Game/Stage2Game을 contract에 맞게 구현하면
  //                      여기서 import + 마운트 추가.
  const simulatePerfect = () => {
    recordResult(stageId, 0.05);
    navigate('/hub');
  };
  const simulateLow = () => {
    recordResult(stageId, 0.4);
    navigate('/hub');
  };
  const simulateClear = () => {
    clearStageResult(stageId);
  };

  const bg = STAGE_BACKGROUNDS[stageId];

  return (
    <div
      className="stage-page"
      style={bg ? { backgroundImage: `url(${bg})` } : undefined}
    >
      <div className="stage-page__content">
        <h1 className="stage-page__title">[Stage {stageId}]</h1>
        <p className="stage-page__note">TODO: Stage {stageId} 게임 메커닉 (팀원 이슈)</p>
        <div className="stage-page__actions">
          <button type="button" onClick={simulatePerfect}>
            모의 PERFECT (metric 0.05) → /hub
          </button>
          <button type="button" onClick={simulateLow}>
            모의 낮은 점수 (metric 0.4) → /hub
          </button>
          <button type="button" onClick={simulateClear}>
            결과 무효화 (clearStageResult)
          </button>
        </div>
      </div>
    </div>
  );
  */

  return null;
}