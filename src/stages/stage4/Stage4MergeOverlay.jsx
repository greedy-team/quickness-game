// 1초 합체 연출 골격 — 3 panes fade + scale + center 모임.
// 부모(Stage4Host)가 active 동안만 마운트, 1초 후 unmount.
// TODO(post-skeleton): 거울 균열 SVG, "진짜만 남음" 텍스트, 충격음 등 후속 폴리싱.

import './Stage4MergeOverlay.css';

export default function Stage4MergeOverlay() {
  return <div className="stage4-merge-overlay" aria-hidden="true" />;
}
