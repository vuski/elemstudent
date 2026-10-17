// MapLibre 6.x 의 CSS 와 워커 파일을 docs/ 로 복사한다. (npm run build / dev 전에 자동 실행)
//
// 워커는 모듈 워커라서 서버가 JavaScript MIME 으로 보내야 실행된다.
// Windows 의 python -m http.server 는 .mjs 를 text/plain 으로 보내므로,
// 확장자를 .js 로 바꾸고 워커 안의 공용 파일 import 경로도 함께 바꾼다.
const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "node_modules", "maplibre-gl", "dist");
const dst = path.join(__dirname, "..", "docs");

function copy(from, to, transform = (s) => s) {
  const text = fs.readFileSync(path.join(src, from), "utf8");
  // 소스맵 파일은 복사하지 않으므로 참조를 지운다.
  const out = transform(text).replace(/\n\/\/# sourceMappingURL=.*$/, "\n");
  fs.writeFileSync(path.join(dst, to), out);
}

copy("maplibre-gl.css", "maplibre-gl.css");
copy("maplibre-gl-shared.mjs", "maplibre-gl-shared.js");
copy("maplibre-gl-worker.mjs", "maplibre-gl-worker.js", (s) => {
  const from = '"./maplibre-gl-shared.mjs"';
  if (!s.includes(from)) throw new Error("maplibre-gl-worker.mjs 의 공용 파일 import 경로가 바뀌었다");
  return s.replace(from, '"./maplibre-gl-shared.js"');
});
