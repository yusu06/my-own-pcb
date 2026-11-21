# 내 하드웨어 공방 (my-own-pcb)

실제 기기 **클라이언트 의뢰서**를 하나씩 해결하며 회로 설계를 배우는 폰용 공부 앱입니다.
스위치·LED에서 시작해 논리 회로, Verilog, 아날로그, MCU, PCB 실무까지 다룹니다.
한 번 열면 **인터넷 없이도** 동작합니다.

- 설계 문서: [docs/superpowers/specs/2026-11-21-hw-study-tool-design.md](docs/superpowers/specs/2026-11-21-hw-study-tool-design.md)

## 폰에서 열기

주소: https://yusu06.github.io/my-own-pcb/

- **안드로이드(Chrome):** 주소를 열고 ⋮ 메뉴 → "홈 화면에 추가" 또는 "앱 설치"
- **아이폰(Safari):** 주소를 열고 공유 버튼 → "홈 화면에 추가"

홈 화면 아이콘으로 한 번 열어 두면 그 뒤로는 오프라인에서도 열립니다.
진행 상황은 폰 안에만 저장되니 **설정 → 백업 내보내기**로 가끔 백업해 두세요.

## 개발

```
npm install
npm run dev      # http://localhost:5173/my-own-pcb/
npm test
npm run build    # dist/
```

- 단원 추가: `src/lessons/ch<장>/<id>-<이름>.ts`를 만들고 `src/lessons/index.ts`의 `LESSONS`에 순서대로 넣는다. 배포한 단원 id는 바꾸지 않는다.
- 전기 과제는 `reference`(모범 답안)와 `wrong`(틀린 회로)을 반드시 넣는다. 내용 테스트가 reference는 통과하고 wrong은 실패하는지 검증한다.
- 용어 추가: `src/lessons/glossary.ts`. 본문에서는 `[[용어id]]`로 쓴다.
- 저장 형식을 바꾸면 `src/store/migrate.ts`에 마이그레이션을 추가하고 `src/store/fixtures/`로 테스트한다.
- `main`에 push하면 GitHub Actions가 테스트 → 빌드 → GitHub Pages 배포를 한다.
