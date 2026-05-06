// src/stages/stage3/Stage3Field.jsx
// 낙하 시퀀스 + → 입력 처리 + 정확도 측정 + 점수 누적.
// running 상태에서만 동작. 종료 시 onResult(metric: 0~1) 호출.

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { STAGE3_CONFIG } from './stage3.config.js';
import { ASSETS } from '../../assets.js';
import CatchZone from './CatchZone.jsx';
import FallingItem from './FallingItem.jsx';
import ResultPopup from './ResultPopup.jsx';
import './Stage3Field.css';

// 시드 기반 PRNG (mulberry32) — 결정적 시퀀스용
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 결정적 아이템 시퀀스 생성
// 반환: [{ kind: 'real'|'fake', imgSrc, spawnAt: sec, horizontalPct }]
function buildSequence(config) {
  const seed = config.seed ?? Date.now();
  const rand = mulberry32(seed);
  const fakeCount = config.itemCount - config.realCount;

  // 종류 배열 (real/fake) — 연속 같은 타입 3+ 회피하면서 섞기
  const kinds = [];
  let realLeft = config.realCount;
  let fakeLeft = fakeCount;
  let lastKind = null;
  let sameStreak = 0;

  for (let i = 0; i < config.itemCount; i++) {
    let pickReal;
    if (realLeft === 0) pickReal = false;
    else if (fakeLeft === 0) pickReal = true;
    else if (sameStreak >= 2) pickReal = (lastKind !== 'real'); // 강제 변경
    else pickReal = rand() < (realLeft / (realLeft + fakeLeft));

    const kind = pickReal ? 'real' : 'fake';
    kinds.push(kind);
    if (kind === 'real') realLeft--; else fakeLeft--;
    if (kind === lastKind) sameStreak++; else { sameStreak = 1; lastKind = kind; }
  }

  // 스폰 시각 — 등간격 + jitter
  const baseInterval = config.durationSec / config.itemCount;
  const jitter = config.spawnIntervalJitterSec;

  return kinds.map((kind, i) => {
    const offset = (rand() * 2 - 1) * jitter;
    const spawnAt = Math.max(0, i * baseInterval + offset);
    const horizontalPct = 50 + (rand() * 2 - 1) * config.horizontalRandomRatio * 100;
    const pool = kind === 'real' ? ASSETS.images.memoryReal : ASSETS.images.memoryFake;
    const imgSrc = pool[Math.floor(rand() * pool.length)];
    return { kind, imgSrc, spawnAt, horizontalPct };
  });
}

// 정확도 offset → tier 매칭 → per-item 점수
function pointsForOffset(absOffset, tiers) {
  const tier = tiers.find((t) => absOffset <= t.maxOffset);
  return tier ? { points: tier.points, label: tier.label, color: tier.color } : { points: 0, label: 'MISS', color: '#888' };
}

export default function Stage3Field({ isRunning, onResult }) {
  const config = STAGE3_CONFIG;
  const sequence = useMemo(() => buildSequence(config), [config]);

  // 활성 아이템 상태 — { id, kind, imgSrc, spawnAt, horizontalPct, topPercent, status }
  // status: 'falling' | 'caught' | 'missed'
  const [items, setItems] = useState([]);
  const [popup, setPopup] = useState({ visible: false, label: '', color: '', key: 0 });

  const startTimeRef = useRef(null);
  const rafRef = useRef(null);
  const totalPointsRef = useRef(0);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const popupKeyRef = useRef(0);
  const showPopup = useCallback((label, color) => {
    popupKeyRef.current += 1;
    setPopup({ visible: true, label, color, key: popupKeyRef.current });
    setTimeout(() => {
      setPopup((prev) => prev.key === popupKeyRef.current ? { ...prev, visible: false } : prev);
    }, 400);
  }, []);

  // running 시작 — start time 기록 + RAF 시작
  useEffect(() => {
    if (!isRunning) return;
    startTimeRef.current = performance.now();
    totalPointsRef.current = 0;
    setItems(sequence.map((s, idx) => ({
      id: idx,
      ...s,
      topPercent: -10,            // 화면 위 시작
      status: 'falling',
    })));

    // 종료 조건 — 마지막 아이템의 spawnAt + fallDuration + 0.5초 마진
    // 루프 밖에서 1회 계산 (sequence·config는 effect 동안 불변).
    const lastEnd = sequence[sequence.length - 1].spawnAt + config.fallDurationSec + 0.5;

    const tick = () => {
      const now = performance.now();
      const elapsed = (now - startTimeRef.current) / 1000;

      // 누적 점수 변화는 updater 밖에서 처리(StrictMode 이중 실행 시 중복 적용 방지).
      let pointsDelta = 0;

      setItems((prev) => prev.map((it) => {
        if (it.status !== 'falling') return it;
        const localT = elapsed - it.spawnAt;
        if (localT < 0) return { ...it, topPercent: -10 };
        if (localT > config.fallDurationSec) {
          // 화면 밖으로 떨어짐 — 캐치 안 됨
          if (it.kind === 'real') pointsDelta += config.missScore;
          // fake는 통과해도 0점 (정상)
          return { ...it, status: 'missed', topPercent: 110 };
        }
        const topPercent = -10 + (localT / config.fallDurationSec) * 120; // -10% → 110%
        return { ...it, topPercent };
      }));

      if (pointsDelta !== 0) totalPointsRef.current += pointsDelta;

      if (elapsed >= lastEnd) {
        // metric 산출
        const maxPossible = config.realCount * config.accuracyTiers[0].points;
        const ratio = Math.max(0, Math.min(1, totalPointsRef.current / maxPossible));
        const metric = 1 - ratio;
        cancelAnimationFrame(rafRef.current);
        onResult(metric);
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isRunning, sequence, config, onResult]);

  // → 입력 처리 — 캐치 존 안의 가장 가까운 아이템 캐치
  useEffect(() => {
    if (!isRunning) return;

    const handleKeyDown = (e) => {
      if (e.code !== 'ArrowRight') return;
      e.preventDefault();

      // 캐치 존 = 화면 50% ± (catchZoneRatio/2 × 100%)
      const zoneCenter = 50;
      const zoneHalf = config.catchZoneRatio / 2 * 100;
      const zoneTop = zoneCenter - zoneHalf;
      const zoneBottom = zoneCenter + zoneHalf;

      // 존 안 falling 아이템 중 중심선에 가장 가까운 것 찾기
      const candidates = itemsRef.current.filter(
        (it) => it.status === 'falling' && it.topPercent >= zoneTop && it.topPercent <= zoneBottom
      );
      if (candidates.length === 0) return; // 존 밖 입력 — 무시 (페널티 없음)

      const target = candidates.reduce((best, it) => {
        const itDist = Math.abs(it.topPercent - zoneCenter);
        const bestDist = Math.abs(best.topPercent - zoneCenter);
        return itDist < bestDist ? it : best;
      });

      // offset 계산 — 0 ~ 1 (zoneHalf 기준 정규화)
      const absOffset = Math.abs(target.topPercent - zoneCenter) / zoneHalf;

      if (target.kind === 'real') {
        const { points, label, color } = pointsForOffset(absOffset, config.accuracyTiers);
        totalPointsRef.current += points;
        showPopup(label, color);
      } else {
        totalPointsRef.current += config.fakePenalty;
        showPopup('INCORRECT', '#FF3333');
      }

      setItems((prev) => prev.map(
        (it) => it.id === target.id ? { ...it, status: 'caught' } : it
      ));
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRunning, config, showPopup]);

  return (
    <div className="stage3-field">
      <CatchZone />
      {items.map((it) => (
        it.status === 'falling' && (
          <FallingItem
            key={it.id}
            src={it.imgSrc}
            kind={it.kind}
            leftPercent={it.horizontalPct}
            topPercent={it.topPercent}
          />
        )
      ))}
      <ResultPopup
        key={popup.key}
        visible={popup.visible}
        label={popup.label}
        color={popup.color}
      />
    </div>
  );
}
