# english-study — 붙여넣고 공부하기

공부한 내용을 붙여넣으면 **핵심 요약 · 예시 표현(쉬운/자연스러운/고급) · 비슷한 표현 · 퀴즈 · 플래시카드**를
자동으로 만들어 주는 토스 미니앱 느낌의 영어 학습 도우미.

- **스택**: 정적 프런트(`public/`, 순수 HTML/CSS/JS) + Cloudflare Pages Function 1개(`functions/api/generate.js`, Claude API 프록시). 빌드 없음.
- **AI**: Anthropic Claude(`claude-sonnet-4-6`)로 요약·예문·퀴즈·문장변환·랜덤보카 생성. API 키는 서버리스 함수에만 두어 브라우저에 노출되지 않음.
- **저장**: 학습 세트 / 오답노트 / 플래시카드 상태는 모두 브라우저 `localStorage`에 저장(서버 DB 없음).

## 기능

| 탭 | 설명 |
|----|------|
| 만들기 | 텍스트 붙여넣기 → 난이도(초/중/고)·용도(시험/회화/비즈니스) 선택 → 학습 세트 생성 |
| 복습 | ‘헷갈려요/몰라요’ 카드 + 최근 오답 다시 보기 |
| 보카 | 오늘 외울 랜덤 단어 추천(주제 지정 가능) → 플래시카드로 저장 |
| 오답 | 퀴즈에서 틀린 문제 자동 수집 · 다시 풀기 |
| 내 학습 | 날짜별로 저장된 학습 세트 |
| 문장 변환 | 한 문장을 자연스럽게/캐주얼/정중/짧게/원어민/발표용으로 변환 |

학습 세트 카드: 핵심 요약(+용도별) · 예시 표현(3단계 + "이걸 언제 쓰나요?") · 비슷한 표현 표 · 퀴즈 · 플래시카드.

## 로컬 실행

Claude API 키가 필요합니다. (의존성 0, Node 18+)

```bash
ANTHROPIC_API_KEY=sk-ant-... node dev-server.mjs   # http://localhost:4173
# 또는
ANTHROPIC_API_KEY=sk-ant-... npm run dev
```

키 없이 띄우면 UI·저장 기능은 동작하지만 `/api/generate`는 `missing_api_key`를 반환합니다.

Cloudflare Wrangler로 띄우려면(Pages Functions 그대로 사용):

```bash
ANTHROPIC_API_KEY=sk-ant-... npm run dev:wrangler
```

## 배포 (Cloudflare Pages)

```bash
npm run deploy        # wrangler pages deploy public
```

Pages 프로젝트의 환경 변수에 `ANTHROPIC_API_KEY`를 등록하세요. 빌드 명령은 없고, 출력 디렉터리는 `public/`, 함수는 `functions/`가 자동 인식됩니다.

## 구조

```
public/
  index.html          앱 셸 (상단바 / 화면 / 하단 탭)
  assets/app.css      토스풍 카드 UI
  assets/app.js       라우팅·렌더·퀴즈·플래시카드·localStorage
functions/api/
  generate.js         POST /api/generate — Claude 프록시 (Cloudflare)
  _lib.js             프롬프트 빌더 + 파서 + Claude 호출 (함수·dev-server 공유)
dev-server.mjs        로컬 dev 서버 (위 함수 로직을 미러링)
```
