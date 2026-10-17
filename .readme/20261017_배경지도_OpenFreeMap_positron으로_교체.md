# 배경지도를 OpenFreeMap positron으로 교체

작업일: 2026-10-17 · 브랜치: `basemap-positron` (`data-2026` 위에서 분기)

## 배경
- 배경지도로 Mapbox GL + 커스텀 스타일(`mapbox://styles/sbkim427/...`)을 쓰고 있었다. Mapbox 토큰이 공개 저장소의 소스에 들어 있었고, 사용량에 따라 과금될 수 있었다.
- 무료이고 상업적 사용도 가능하며 API 키가 필요 없는 OpenFreeMap의 `positron` 스타일로 바꿨다. 지도 라이브러리도 Mapbox GL에서 MapLibre GL로 바꿨다.

## 변경 내용
- `package.json`: `mapbox-gl`, `@mapbox/mapbox-gl-language` 제거, `maplibre-gl@^6.11.2` 추가.
  - 처음에는 deck.gl 8.9와 맞추려고 3.6.2를 설치했지만, `npm audit`에서 critical 취약점(GHSA-jrc7-96c5-q579, `<=6.4.0`)이 나와 6.11.2로 올렸다. 교체 후 audit 결과는 교체 전과 같다(moderate 7, high 9, critical 0).
- `src/index.js`
  - `import * as maplibregl from "maplibre-gl"` (6.x는 default export가 없다).
  - 스타일 `https://tiles.openfreemap.org/styles/positron`. Mapbox 토큰 삭제.
  - `maplibregl.setWorkerUrl("./maplibre-gl-worker.js")`: webpack 번들 안에서는 MapLibre가 워커 파일 위치를 찾지 못한다.
  - `style.load`에서 `boundary_2`, `boundary_3`(국가·시도 경계선)을 숨기고, 지명 레이어의 `text-field`를 `coalesce(name:ko, name:nonlatin, name)`으로 바꿔 한국어만 나오게 했다. 도로 번호(`ref`) 레이어는 그대로 둔다. `MapboxLanguage` 플러그인을 대체한다.
  - deck.gl 오버레이(`MapboxOverlay`)와 "지명 표시" 토글은 코드를 바꾸지 않았다.
- `scripts/copy-maplibre.js` + `package.json`의 `copy-maplibre` 스크립트: `prebuild`, `predev`에서 자동 실행된다. `node_modules/maplibre-gl/dist`의 `maplibre-gl.css`와 워커 파일 2개를 `docs/`로 복사한다.
  - 워커 파일은 확장자를 `.mjs` → `.js`로 바꾸고(`maplibre-gl-worker.js`, `maplibre-gl-shared.js`), 워커 안의 공용 파일 import 경로도 함께 바꾼다. MapLibre 6.x 워커는 모듈 워커라서 서버가 JavaScript MIME으로 보내야 실행되는데, Windows의 `python -m http.server`는 `.mjs`를 `text/plain`으로 보내기 때문이다. `.js`는 어느 서버에서나 JavaScript로 나간다.
- `src/index.html`: `mapbox-gl.css` 링크를 `maplibre-gl.css`로 바꿨다. 메타태그와 Google 태그는 그대로다.

## 테스트
- 로컬(Chrome): 전국 화면에서 지명이 한국어로 나오고(평양직할시, 다롄시 등) 국가·시도 경계선이 숨겨짐. 서울둔촌초 주변으로 확대했을 때 선 그래프·숫자·학교명이 그대로 나옴. "지명 표시"를 끄면 배경지도 지명이 모두 사라짐. 콘솔 오류 없음.
- 처음에는 `.mjs`를 JavaScript로 보내는 별도 서버로만 확인해서, 사용자가 쓰는 `python -m http.server`에서는 배경지도가 비어 보이는 문제를 놓쳤다. 워커를 `.js`로 바꾼 뒤 `python -m http.server`에서 다시 확인했고, 배경지도가 정상으로 나오며 콘솔 오류가 없다.

## 남은 이슈 / 참고
- 바탕색이 밝은 베이지(Mapbox "Frank")에서 positron의 연한 회색으로 바뀌었다.
- 출처 표기가 OpenFreeMap / OpenMapTiles / OpenStreetMap으로 바뀌었다.
- 더 이상 쓰지 않는 `docs/mapbox-gl.css`는 지웠다.
- Mapbox 토큰은 소스에서는 지웠지만 git 기록에는 남아 있다. 배포 후 Mapbox 계정에서 토큰을 삭제하거나 URL 제한을 걸면 된다.
