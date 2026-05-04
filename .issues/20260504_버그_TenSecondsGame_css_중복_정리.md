## 제목

❗ [버그][CSS][TenSecondsGame] TenSecondsGame.css 파일이 8번 중복되어 빌드 경고 발생

## 본문

## 🗒️ 설명

- src/components/TenSecondsGame/TenSecondsGame.css 파일의 동일한 754 라인 블록이 8번 반복되어 총 6032 라인이 됨
- 각 블록 시작에 `@import url("https://cdn.jsdelivr.net/npm/neodgm-webfont@1.6.0/neodgm.css");`가 들어있는데, 첫 번째를 제외한 7개의 import가 파일 중간에 위치
- 결과적으로 `npm run build` 실행 시 postcss 경고 7회 발생: "@import must precede all other statements"
- 빌드 자체는 통과하지만 콘솔이 지저분하고, 실제 적용되는 CSS 양이 8배 부풀려져 번들 크기에도 영향

## 🔄 재현 방법

1. 프로젝트 루트에서 `npm run build` 실행
2. 빌드 출력에서 postcss 경고 확인
3. `wc -l src/components/TenSecondsGame/TenSecondsGame.css` 실행 → 6032 라인 확인
4. `grep -n "@import" src/components/TenSecondsGame/TenSecondsGame.css` → @import가 8개 위치(라인 6, 760, 1514, 2268, 3022, 3776, 4530, 5284)에 있음을 확인

## 📸 참고 자료

- 빌드 경고 샘플:
  ```
  [vite:css][postcss] @import must precede all other statements (besides @charset or empty @layer)
  760 |  @import url("https://cdn.jsdelivr.net/npm/neodgm-webfont@1.6.0/neodgm.css");
  ```
- 파일 hash 비교로 첫 3개 블록(라인 7~754, 761~1508, 1515~2262)이 byte 단위로 100% 동일함을 확인

## ✅ 예상 동작

- TenSecondsGame.css는 단일 unique 블록(약 754 라인)만 유지
- @import는 파일 최상단 1회만 존재
- `npm run build` 시 postcss 경고 0회
- 동작은 현재와 동일 (UI 변화 없음)

## ⚙️ 환경 정보

- OS:
- 브라우저:
- 기기:

## 🙋‍♂️ 담당자

- 백엔드: 이름
- 프론트엔드: 이름
- 디자인: 이름
