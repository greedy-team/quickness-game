import React from 'react';

const WARNING_ITEMS = [
  '점프스케어와 갑작스러운 큰 효과음이 나옵니다',
  '일부 장면에 깜빡이는 화면 연출이 포함됩니다 (광과민성 발작 주의)',
  '이어폰 사용 시 볼륨을 미리 낮춰 주세요',
  '12세 이상에게 권장합니다',
];

export default function WarningModal({ onAgree }) {
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="warning-modal-title">
      <div>
        <h2 id="warning-modal-title">⚠ 시작 전 안내</h2>
        <p>본 게임은 공포 콘텐츠를 포함합니다.</p>
        <ul>
          {WARNING_ITEMS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <button type="button" onClick={onAgree}>동의하고 시작</button>
      </div>
    </div>
  );
}
