// 통합 인트로 — 3 sub-stage 미리보기 + Space 안내.
import './Stage4Intro.css';

const PREVIEWS = [
  { key: '←', title: 'Stage 1', subtitle: '괘종시계 / 타이밍' },
  { key: '↑', title: 'Stage 2', subtitle: '반응속도' },
  { key: '→', title: 'Stage 3', subtitle: '캐치' },
];

export default function Stage4Intro() {
  return (
    <div className="stage4-intro">
      <h1 className="stage4-intro__title">최종 시련 — 거울방</h1>
      <p className="stage4-intro__subtitle">⚠️ 3개 시련을 동시에 통과하라</p>

      <div className="stage4-intro__panes">
        {PREVIEWS.map((p) => (
          <div key={p.title} className="stage4-intro__pane">
            <div className="stage4-intro__key">{p.key}</div>
            <div className="stage4-intro__pane-title">{p.title}</div>
            <div className="stage4-intro__pane-subtitle">{p.subtitle}</div>
          </div>
        ))}
      </div>

      <p className="stage4-intro__cta">▶ 준비되면 [Space] 누르기</p>
    </div>
  );
}
