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

// 시드 기반 PRNG (mulberry32)
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

// 💡 결정적 아이템 시퀀스 생성 (2초 딜레이 반영)
function buildSequence(config) {
  const seed = config.seed ?? Date.now();
  const rand = mulberry32(seed);
  const baseInterval = config.durationSec / config.itemCount;
  
  // 💡 시작 후 아무것도 안 나오는 초기 대기 시간 2초 (2.0)
  const INITIAL_DELAY_SEC = 2.0; 

  return Array.from({ length: config.itemCount }, (_, i) => {
    const offset = (rand() * 2 - 1) * config.spawnIntervalJitterSec;
    // 💡 원래 스폰 시간에 INITIAL_DELAY_SEC(2초)를 더해줍니다.
    const spawnAt = Math.max(0, i * baseInterval + offset) + INITIAL_DELAY_SEC; 
    
    const horizontalPct = 50 + (rand() * 2 - 1) * config.horizontalRandomRatio * 100;
    const imgSrc = ASSETS.images.memoryReal[Math.floor(rand() * ASSETS.images.memoryReal.length)];
    const fallDurationSec = config.fallDurationSecMin + rand() * (config.fallDurationSecMax - config.fallDurationSecMin);
    
    return { imgSrc, spawnAt, horizontalPct, fallDurationSec };
  });
}

export default function Stage3Field({ isRunning, onResult }) {
  const config = STAGE3_CONFIG;
  const sequence = useMemo(() => buildSequence(config), [config]);

  const [items, setItems] = useState([]);
  const [popup, setPopup] = useState({ visible: false, label: '', points: null, color: '', key: 0 });
  const [pressesLeft, setPressesLeft] = useState(config.itemCount);

  const startTimeRef = useRef(null);
  const rafRef = useRef(null);
  const totalPointsRef = useRef(0);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const statsRef = useRef({ caughtCount: 0 });
  const pressesLeftRef = useRef(config.itemCount);
  const gameEndedRef = useRef(false);
  const finishRef = useRef(null);

  const addPoints = useCallback((delta) => {
    totalPointsRef.current += delta;
  }, []);

  const popupKeyRef = useRef(0);
  const showPopup = useCallback((label, points, color) => {
    popupKeyRef.current += 1;
    setPopup({ visible: true, label, points, color, key: popupKeyRef.current });
    setTimeout(() => {
      setPopup((prev) => prev.key === popupKeyRef.current ? { ...prev, visible: false } : prev);
    }, 400);
  }, []);

  // running 시작 — start time 기록 + RAF 시작
  useEffect(() => {
    if (!isRunning) return;
    startTimeRef.current = performance.now();
    totalPointsRef.current = 0;
    statsRef.current = { caughtCount: 0 };
    pressesLeftRef.current = config.itemCount;
    gameEndedRef.current = false;
    setPressesLeft(config.itemCount);
    
    setItems(sequence.map((s, idx) => ({
      id: idx,
      ...s,
      topPercent: -10, // 화면 위 시작
      status: 'falling',
    })));

    // 종료 조건 — 모든 아이템 중 가장 늦게 끝나는 시점 + 0.5초 마진
    const lastEnd = Math.max(...sequence.map(s => s.spawnAt + s.fallDurationSec)) + 0.5;

    // 게임 종료
    finishRef.current = () => {
      if (gameEndedRef.current) return;
      gameEndedRef.current = true;
      cancelAnimationFrame(rafRef.current);
      
      const caughtCount = statsRef.current.caughtCount;
      const missedCount = config.itemCount - caughtCount;
      const maxPossible = config.itemCount * config.catchPoints;
      const ratio = Math.max(0, Math.min(1, totalPointsRef.current / maxPossible));
      const metric = 1 - ratio;
      
      setItems((prev) => prev.map(
        (it) => it.status === 'falling' ? { ...it, status: 'missed' } : it
      ));
      
      onResult({ metric, caughtCount, missedCount, realCount: config.itemCount, totalScore: totalPointsRef.current });
    };

    const tick = () => {
      const now = performance.now();
      const elapsed = (now - startTimeRef.current) / 1000;

      setItems((prev) => prev.map((it) => {
        if (it.status !== 'falling') return it;
        const localT = elapsed - it.spawnAt;
        
        // 💡 2초 동안은 localT가 음수이므로 화면 위(-10%)에 계속 대기하게 됩니다.
        if (localT < 0) return { ...it, topPercent: -10 }; 
        
        if (localT > it.fallDurationSec) {
          return { ...it, status: 'missed', topPercent: 110 };
        }
        const topPercent = -10 + (localT / it.fallDurationSec) * 120; // -10% → 110%
        return { ...it, topPercent };
      }));

      // 최후의 아이템이 끝나는 시간(lastEnd)이 지나면 종료
      if (elapsed >= lastEnd) {
        finishRef.current?.();
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isRunning, sequence, config, onResult, addPoints]);

  // → 입력 처리 (기존 로직 유지)
  useEffect(() => {
    if (!isRunning) return;

    const handleKeyDown = (e) => {
      if (e.code !== 'ArrowRight') return;
      if (gameEndedRef.current) return;
      e.preventDefault();

      pressesLeftRef.current -= 1;
      setPressesLeft(pressesLeftRef.current);

      const zoneCenter = 70;
      const zoneHalf = config.catchZoneRatio / 2 * 100;
      const zoneTop = zoneCenter - zoneHalf;
      const zoneBottom = zoneCenter + zoneHalf;

      const candidates = itemsRef.current.filter(
        (it) => it.status === 'falling' && it.topPercent >= zoneTop && it.topPercent <= zoneBottom
      );

      if (candidates.length > 0) {
        const target = candidates.reduce((best, it) => {
          const itDist = Math.abs(it.topPercent - zoneCenter);
          const bestDist = Math.abs(best.topPercent - zoneCenter);
          return itDist < bestDist ? it : best;
        });
        addPoints(config.catchPoints);
        showPopup(config.catchLabel, config.catchPoints, '#FFD700');
        statsRef.current.caughtCount += 1;
        setItems((prev) => prev.map(
          (it) => it.id === target.id ? { ...it, status: 'caught' } : it
        ));
      }

      if (pressesLeftRef.current <= 0) {
        finishRef.current?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRunning, config, showPopup, addPoints]);

  const remaining = items.filter((it) => it.status === 'falling').length;
  const total = config.itemCount;

  return (
    <div className="stage3-field">
      <div className="stage3-hud" aria-live="polite">
        <div className="stage3-hud__row">
          <span className="stage3-hud__label">기회</span>
          <span className="stage3-hud__count">
            <strong>{pressesLeft}</strong> / {total}
          </span>
        </div>
        <div className="stage3-hud__row">
          <span className="stage3-hud__label">남은 조각</span>
          <span className="stage3-hud__count">
            <strong>{remaining}</strong> / {total}
          </span>
        </div>
      </div>
      <CatchZone />
      {items.map((it) => (
        it.status === 'falling' && (
          <FallingItem
            key={it.id}
            src={it.imgSrc}
            leftPercent={it.horizontalPct}
            topPercent={it.topPercent}
          />
        )
      ))}
      <ResultPopup
        key={popup.key}
        visible={popup.visible}
        label={popup.label}
        points={popup.points}
        color={popup.color}
      />
    </div>
  );
}
