import { useState, useEffect, useRef, useCallback } from 'react';
import Hero from '../Hero';
import Boss from '../Boss/Boss';
import { HERO_ATTACK_CYCLE } from '../../constants/sprites';
import { BOSS_MAX_HP, clampDamage } from './bossUtils';
import './BossFightScene.css';

const DEATH_ANIM_MS = 600;
const BOSS_ATTACK_DURATION_MS = 1000;
const HERO_ATTACK_RESET_MS = 700;

export default function BossFightScene({ totalScore, onCleared }) {
  const [bossHP, setBossHP] = useState(BOSS_MAX_HP);
  const [phase, setPhase] = useState('fighting'); // 'fighting' | 'dying'
  const [bossAction, setBossAction] = useState('idle');
  const [bossActionTick, setBossActionTick] = useState(0);
  const [heroAttack, setHeroAttack] = useState(null); // null = idle (walk_weapon 정지), or attack_xxx key
  const [heroAttackTick, setHeroAttackTick] = useState(0);
  const damage = clampDamage(totalScore);
  const clearedRef = useRef(false);
  const attackCycleRef = useRef(0);
  const bossActionTimerRef = useRef(null);
  const heroActionTimerRef = useRef(null);

  const triggerAttack = useCallback(() => {
    if (phase !== 'fighting') return;
    // HP 차감
    setBossHP((hp) => Math.max(0, hp - damage));
    // 그린이 attack 시트 순환
    const idx = attackCycleRef.current;
    attackCycleRef.current = (idx + 1) % HERO_ATTACK_CYCLE.length;
    setHeroAttack(HERO_ATTACK_CYCLE[idx]);
    setHeroAttackTick((n) => n + 1);
    // 보스 attack 1회 재생
    setBossAction('attack');
    setBossActionTick((n) => n + 1);
    // idle 복귀 타이머
    if (bossActionTimerRef.current) clearTimeout(bossActionTimerRef.current);
    bossActionTimerRef.current = setTimeout(() => {
      setBossAction('idle');
    }, BOSS_ATTACK_DURATION_MS);
    if (heroActionTimerRef.current) clearTimeout(heroActionTimerRef.current);
    heroActionTimerRef.current = setTimeout(() => {
      setHeroAttack(null);
    }, HERO_ATTACK_RESET_MS);
  }, [phase, damage]);

  // HP 0 도달 시 사망 연출 → onCleared
  useEffect(() => {
    if (bossHP > 0) return;
    if (clearedRef.current) return;
    clearedRef.current = true;
    setPhase('dying');
    const timer = setTimeout(() => {
      onCleared?.();
    }, DEATH_ANIM_MS);
    return () => clearTimeout(timer);
  }, [bossHP, onCleared]);

  // 키 입력: Space/Enter → 공격
  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'Space' && e.code !== 'Enter') return;
      e.preventDefault();
      triggerAttack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [triggerAttack]);

  // 언마운트 시 타이머 정리
  useEffect(() => () => {
    if (bossActionTimerRef.current) clearTimeout(bossActionTimerRef.current);
    if (heroActionTimerRef.current) clearTimeout(heroActionTimerRef.current);
  }, []);

  const hpRatio = Math.max(0, bossHP / BOSS_MAX_HP);
  const heroAction = heroAttack ?? 'walk_weapon';
  const heroPlaying = !!heroAttack; // 공격 중이면 forwards 재생, idle이면 첫 프레임 정지

  return (
    <div className="boss-fight-stage">
      <div className="boss-fight-hud">
        <div className="boss-fight-hp-label">
          <span>👹 BOSS HP</span>
          <span>{bossHP} / {BOSS_MAX_HP}</span>
        </div>
        <div className="boss-fight-hp-bar">
          <div
            className="boss-fight-hp-fill"
            style={{ width: `${hpRatio * 100}%` }}
          />
        </div>
      </div>

      <div className="boss-fight-arena">
        <Hero
          key={heroAttack ? `hero-attack-${heroAttackTick}` : 'hero-idle'}
          action={heroAction}
          x={600}
          bottom={181}
          facing="right"
          playing={heroPlaying}
        />
        <Boss
          key={`boss-${bossActionTick}`}
          action={bossAction}
          x={800}
          bottom={181}
          dying={phase === 'dying'}
        />
      </div>

      <div className="boss-fight-idle-panel">
        <p className="boss-fight-instruction">
          <b>Space</b>로 공격! (1타 데미지: <b>{damage}</b>)
        </p>
        <p className="boss-fight-tip">
          누적 점수가 그대로 데미지가 됩니다. 점수는 보존돼요.
        </p>
      </div>
    </div>
  );
}
